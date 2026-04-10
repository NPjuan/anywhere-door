import { NextRequest, NextResponse } from 'next/server'
import { POPULAR_CITIES } from '@/lib/cities'
import { supabase } from '@/lib/supabase'
import { runPoiAgent, runRoutePlanAgent, runContentAgent, runXhsAgent } from '@/lib/agents/runners'

/* ============================================================
   POST /api/agents/orchestrate-bg
   两阶段并行策略：
   - 阶段一（核心）：poi + route 并行，完成后立即触发 synthesis
   - 阶段二（增强）：tips + xhs 继续跑，synthesis-stream 读取时能用就用
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
    const poiNames    = (results.poi  as { pois?: Array<{name:string}> }  | null)?.pois?.map(p => p.name).slice(0, 15) ?? []
    const routeDays   = (results.route as { days?: unknown[] } | null)?.days ?? []
    const packingTips = (results.tips  as { packingTips?: string[] } | null)?.packingTips?.slice(0, 8) ?? []
    const warnings    = (results.tips  as { warnings?: string[] } | null)?.warnings?.slice(0, 5) ?? []
    const xhsNotes    = (results.xhs   as { notes?: unknown[] } | null)?.notes?.slice(0, 4) ?? []

    progress.synthesis = {
      status: 'waiting',
      preview: '',
      input: { originCity, destCity, startDate, endDate, days, prompt, poiNames, routeDays, packingTips, warnings, xhsNotes },
    }
    await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)
  }

  /* ── 阶段一：poi + route 并行（核心，synthesis 依赖这两个）── */
  await Promise.allSettled([
    runPoiAgent({ destination: destCity, prompt, days })
      .then(result => {
        results.poi = result
        return updateProgress('poi', { status: 'done', preview: makePreview('poi', result) })
      })
      .catch(async err => {
        console.error('[orchestrate-bg] poi failed:', err)
        await updateProgress('poi', { status: 'error', preview: '' })
      }),

    runRoutePlanAgent({ destination: destCity, travelStyle: prompt, days, pois: [], startDate })
      .then(result => {
        results.route = result
        return updateProgress('route', { status: 'done', preview: makePreview('route', result) })
      })
      .catch(async err => {
        console.error('[orchestrate-bg] route failed:', err)
        await updateProgress('route', { status: 'error', preview: '' })
      }),
  ])

  /* ── 阶段一完成，立即触发 synthesis（前端轮询到 waiting 就开始流式输出）── */
  await triggerSynthesis()

  /* ── 阶段二：tips + xhs 继续跑（synthesis-stream 读取时能用就用）── */
  // 注意：此时 synthesis 可能已经在跑了，tips/xhs 完成后更新 DB
  // synthesis-stream 是流式的，实际拿数据在它开始时读一次，所以这里的更新对当次规划无效
  // 但下次查询该计划时数据会更完整（供调试和未来功能使用）
  await Promise.allSettled([
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
}

export async function POST(req: NextRequest) {
  const { planId, originCode, destinationCode, startDate, endDate, prompt } = await req.json()

  if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 })

  await runPlanningInBackground(planId, originCode, destinationCode, startDate, endDate, prompt)

  return NextResponse.json({ ok: true, planId }, { status: 200 })
}
