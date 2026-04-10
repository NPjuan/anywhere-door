import { NextRequest, NextResponse } from 'next/server'
import { POPULAR_CITIES } from '@/lib/cities'
import { supabase } from '@/lib/supabase'
import { runPoiAgent, runRoutePlanAgent, runContentAgent, runXhsAgent } from '@/lib/agents/runners'

/* ============================================================
   POST /api/agents/orchestrate-bg
   直接调用各 Agent 函数（不走内部 HTTP），兼容 Vercel 和自托管
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

  /* ── 并行执行 4 个 Agent（直接调函数，无内部 HTTP）── */
  await Promise.allSettled([
    // POI 推荐
    runPoiAgent({ destination: destCity, prompt, days })
      .then(result => {
        results.poi = result
        progress.poi = { status: 'done', preview: makePreview('poi', result) }
      })
      .catch(err => {
        console.error('[orchestrate-bg] poi agent failed:', err)
        progress.poi = { status: 'error', preview: '' }
      })
      .finally(() => supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)),

    // 路线规划
    runRoutePlanAgent({ destination: destCity, travelStyle: prompt, days, pois: [], startDate })
      .then(result => {
        results.route = result
        progress.route = { status: 'done', preview: makePreview('route', result) }
      })
      .catch(err => {
        console.error('[orchestrate-bg] route agent failed:', err)
        progress.route = { status: 'error', preview: '' }
      })
      .finally(() => supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)),

    // 旅行贴士
    runContentAgent({ destination: destCity, travelStyle: prompt, days })
      .then(result => {
        results.tips = result
        progress.tips = { status: 'done', preview: makePreview('tips', result) }
      })
      .catch(err => {
        console.error('[orchestrate-bg] tips agent failed:', err)
        progress.tips = { status: 'error', preview: '' }
      })
      .finally(() => supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)),

    // XHS 笔记
    runXhsAgent({ destination: destCity, prompt, days })
      .then(result => {
        results.xhs = result
        progress.xhs = { status: 'done', preview: makePreview('xhs', result) }
      })
      .catch(err => {
        console.error('[orchestrate-bg] xhs agent failed:', err)
        progress.xhs = { status: 'error', preview: '' }
      })
      .finally(() => supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)),
  ])

  /* ── 准备 synthesis 输入 ── */
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

export async function POST(req: NextRequest) {
  const { planId, originCode, destinationCode, startDate, endDate, prompt } = await req.json()

  if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 })

  await runPlanningInBackground(planId, originCode, destinationCode, startDate, endDate, prompt)

  return NextResponse.json({ ok: true, planId }, { status: 200 })
}
