import { NextRequest, NextResponse } from 'next/server'
import { POPULAR_CITIES } from '@/lib/cities'
import { supabase } from '@/lib/supabase'
import { runPoiAgent, runRoutePlanAgent, runContentAgent, runXhsAgent } from '@/lib/agents/runners'

/* ============================================================
   POST /api/agents/orchestrate-bg
   执行顺序：
   - poi 先跑，拿到地点列表
   - route 用 poi 结果规划路线（poi → route 串行）
   - tips + xhs 与 poi 并行跑（不依赖 poi 结果）
   - poi + route 完成后立即触发 synthesis，不等 tips/xhs
   ============================================================ */

export const maxDuration = 300

function makePreview(id: string, result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  const r = result as Record<string, unknown>
  if (id === 'poi')   return ((r.pois as Array<{name:string}>|undefined) ?? []).slice(0,5).map(p=>p.name).join(' · ')
  if (id === 'route') return ((r.days as Array<{title:string}>|undefined) ?? []).map(d=>d.title).join(' → ')
  if (id === 'tips')  return ((r.packingTips as string[]|undefined) ?? []).slice(0,3).join(' / ')
  if (id === 'xhs')   return ((r.notes as Array<{title:string}>|undefined) ?? []).map(n=>n.title).join(' | ')
  return ''
}

async function runPlanningInBackground(
  planId:          string,
  originCode:      string,
  destinationCode: string,
  startDate:       string,
  endDate:         string,
  prompt:          string,
) {
  const destCity   = POPULAR_CITIES.find(c => c.code === destinationCode)?.name ?? destinationCode
  const originCity = POPULAR_CITIES.find(c => c.code === originCode)?.name ?? originCode
  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 3

  const results: Record<string, unknown> = {}
  const progress: Record<string, { status: string; preview: string; input?: unknown }> = {
    poi:       { status: 'running', preview: '' },
    route:     { status: 'running', preview: '' },
    tips:      { status: 'running', preview: '' },
    xhs:       { status: 'running', preview: '' },
    synthesis: { status: 'idle',    preview: '' },
  }

  // 工具：更新单个 agent 状态并写 DB
  const updateProgress = async (id: string, patch: { status: string; preview: string }) => {
    progress[id] = patch
    await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)
  }

  // 工具：把当前结果写入 synthesis waiting
  const triggerSynthesis = async () => {
    const poiResult    = results.poi as { pois?: Array<{name:string; address:string; category:string; latLng?:{lat:number;lng:number}}> } | null
    const poiNames     = poiResult?.pois?.map(p => p.name).slice(0, 15) ?? []
    // 传完整坐标字典，供 synthesis 按名字匹配回填
    const poiLatLngMap = Object.fromEntries(
      (poiResult?.pois ?? [])
        .filter(p => p.latLng)
        .map(p => [p.name, { lat: p.latLng!.lat, lng: p.latLng!.lng, address: p.address, category: p.category }])
    )
    const routeDays   = (results.route as { days?: unknown[] } | null)?.days ?? []
    const packingTips = (results.tips  as { packingTips?: string[] } | null)?.packingTips?.slice(0, 8) ?? []
    const warnings    = (results.tips  as { warnings?: string[] } | null)?.warnings?.slice(0, 5) ?? []
    const xhsNotes    = (results.xhs   as { notes?: unknown[] } | null)?.notes?.slice(0, 4) ?? []

    progress.synthesis = {
      status: 'waiting',
      preview: '',
      input: { originCity, destCity, startDate, endDate, days, prompt, poiNames, poiLatLngMap, routeDays, packingTips, warnings, xhsNotes },
    }
    await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)
  }

  /* ── 阶段一：poi（route 依赖它，先跑）── */
  await runPoiAgent({ destination: destCity, prompt, days })
    .then(result => {
      results.poi = result
      return updateProgress('poi', { status: 'done', preview: makePreview('poi', result) })
    })
    .catch(async err => {
      console.error('[orchestrate-bg] poi failed:', err)
      await updateProgress('poi', { status: 'error', preview: '' })
    })

  /* ── 阶段二：route（用 poi 结果）+ tips + xhs 并行 ── */
  const poiResult = results.poi as { pois?: Array<{ name: string; address: string; category: string }> } | null
  const poisForRoute = poiResult?.pois?.map(p => ({
    name: p.name, address: p.address, category: p.category,
  })) ?? []

  await Promise.allSettled([
    // route 用 poi 数据规划
    runRoutePlanAgent({ destination: destCity, travelStyle: prompt, days, pois: poisForRoute, startDate })
      .then(result => {
        results.route = result
        return updateProgress('route', { status: 'done', preview: makePreview('route', result) })
      })
      .catch(async err => {
        console.error('[orchestrate-bg] route failed:', err)
        await updateProgress('route', { status: 'error', preview: '' })
      }),

    // tips + xhs 与 route 并行（不依赖 poi 结果）
    runContentAgent({ destination: destCity, travelStyle: prompt, days })
      .then(result => {
        results.tips = result
        return updateProgress('tips', { status: 'done', preview: makePreview('tips', result) })
      })
      .catch(async err => {
        console.error('[orchestrate-bg] tips failed:', err)
        await updateProgress('tips', { status: 'error', preview: '' })
      }),

    runXhsAgent({ destination: destCity, prompt, days })
      .then(result => {
        results.xhs = result
        return updateProgress('xhs', { status: 'done', preview: makePreview('xhs', result) })
      })
      .catch(async err => {
        console.error('[orchestrate-bg] xhs failed:', err)
        await updateProgress('xhs', { status: 'error', preview: '' })
      }),
  ])

  /* ── 阶段三：route 完成，触发 synthesis（不等 tips/xhs）── */
  await triggerSynthesis()
}

export async function POST(req: NextRequest) {
  const { planId, originCode, destinationCode, startDate, endDate, prompt } = await req.json()

  if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 })

  await runPlanningInBackground(planId, originCode, destinationCode, startDate, endDate, prompt)

  return NextResponse.json({ ok: true, planId }, { status: 200 })
}
