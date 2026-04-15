import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { POPULAR_CITIES } from '@/lib/cities'
import { supabase } from '@/lib/supabase'
import { runPoiAgent, runRoutePlanAgent, runContentAgent, runXhsAgent } from '@/lib/agents/runners'
import { rateLimit } from '@/lib/rateLimit'
import type { AIProvider } from '@/lib/agents/utils'
import { createLogger } from '@/lib/logger'

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
  model?:          AIProvider,
) {
  const destCity   = POPULAR_CITIES.find(c => c.code === destinationCode)?.name ?? destinationCode
  const originCity = POPULAR_CITIES.find(c => c.code === originCode)?.name ?? originCode
  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 3

  // 获取 deviceId 用于日志
  const { data: planRow } = await supabase.from('plans').select('device_id').eq('id', planId).single()
  const L = createLogger({ deviceId: planRow?.device_id ?? undefined, planId, flow: 'orchestrate' })

  const t0 = Date.now()
  console.log(JSON.stringify({ event: 'orchestrate-start', planId, model: model ?? 'deepseek', destCity, days }))
  L.info('start', { model: model ?? 'deepseek', destCity, originCity, days, promptLength: prompt.length })

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
  await runPoiAgent({
    destination: destCity,
    prompt,
    days,
    model,
    onProgress: async (_partial, message) => {
      progress.poi = { ...progress.poi, status: 'running', preview: message }
      await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)
    },
  })
    .then(result => {
      results.poi = result
      L.info('poi-done', { poiCount: (result as { pois?: unknown[] })?.pois?.length ?? 0 })
      return updateProgress('poi', { status: 'done', preview: makePreview('poi', result) })
    })
    .catch(async err => {
      console.error('[orchestrate-bg] poi failed:', err)
      L.error('poi-failed', { error: err instanceof Error ? err.message : String(err) })
      await updateProgress('poi', { status: 'error', preview: '' })
    })

  /* ── 阶段二：route（用 poi 结果）+ tips + xhs 并行 ── */
  const poiResult = results.poi as { pois?: Array<{ name: string; address: string; category: string; latLng?: { lat: number; lng: number } }> } | null
  const poisForRoute = poiResult?.pois?.map(p => ({
    name: p.name, address: p.address, category: p.category,
    ...(p.latLng ? { latLng: p.latLng } : {}),
  })) ?? []

  await Promise.allSettled([
    runRoutePlanAgent({
      destination: destCity,
      travelStyle: prompt,
      days,
      pois: poisForRoute,
      startDate,
      model,
      onProgress: async (_partial, message) => {
        progress.route = { ...progress.route, status: 'running', preview: message }
        await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)
      },
    })
      .then(result => {
        results.route = result
        L.info('route-done', { routeDays: (result as { days?: unknown[] })?.days?.length ?? 0 })
        return updateProgress('route', { status: 'done', preview: makePreview('route', result) })
      })
      .catch(async err => {
        console.error('[orchestrate-bg] route failed:', err)
        L.error('route-failed', { error: err instanceof Error ? err.message : String(err) })
        await updateProgress('route', { status: 'error', preview: '' })
      }),

    runContentAgent({
      destination: destCity,
      travelStyle: prompt,
      days,
      model,
      onProgress: async (_partial, message) => {
        progress.tips = { ...progress.tips, status: 'running', preview: message }
        await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)
      },
    })
      .then(result => {
        results.tips = result
        L.info('tips-done', { tipsCount: (result as { packingTips?: unknown[] })?.packingTips?.length ?? 0 })
        return updateProgress('tips', { status: 'done', preview: makePreview('tips', result) })
      })
      .catch(async err => {
        console.error('[orchestrate-bg] tips failed:', err)
        L.error('tips-failed', { error: err instanceof Error ? err.message : String(err) })
        await updateProgress('tips', { status: 'error', preview: '' })
      }),

    runXhsAgent({
      destination: destCity,
      prompt,
      days,
      model,
      onProgress: async (_partial, message) => {
        progress.xhs = { ...progress.xhs, status: 'running', preview: message }
        await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)
      },
    })
      .then(result => {
        results.xhs = result
        L.info('xhs-done', { notesCount: (result as { notes?: unknown[] })?.notes?.length ?? 0 })
        return updateProgress('xhs', { status: 'done', preview: makePreview('xhs', result) })
      })
      .catch(async err => {
        console.error('[orchestrate-bg] xhs failed:', err)
        L.error('xhs-failed', { error: err instanceof Error ? err.message : String(err) })
        await updateProgress('xhs', { status: 'error', preview: '' })
      }),
  ])

  /* ── 阶段三：route 完成，触发 synthesis（不等 tips/xhs）── */
  await triggerSynthesis()
  console.log(JSON.stringify({ event: 'orchestrate-done', planId, ms: Date.now() - t0 }))
  L.info('done', { ms: Date.now() - t0, agentStatuses: Object.fromEntries(Object.entries(progress).map(([k, v]) => [k, v.status])) })
}

export async function POST(req: NextRequest) {
  // 限流：每个 IP 每分钟最多 5 次（防止 AI 资源滥用）
  // 取最后一个非私有 IP，防止代理链伪造
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded
    ? (forwarded.split(',').map(s => s.trim()).filter(s => s && s !== '127.0.0.1' && s !== '::1').pop() ?? 'unknown')
    : (req.headers.get('x-real-ip') ?? 'unknown')
  const limit = await rateLimit(ip, { limit: 5, windowMs: 60_000 })
  if (!limit.ok) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试', retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } }
    )
  }

  const body = await req.json()

  const schema = z.object({
    planId:          z.string().min(1),
    originCode:      z.string().min(1),
    destinationCode: z.string().min(1),
    startDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    endDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
    prompt:          z.string().default(''),
    model:           z.enum(['deepseek', 'claude', 'glm-4-flash', 'glm-5-turbo', 'glm-5', 'glm-5.1']).optional(),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 })
  }

  const { planId, originCode, destinationCode, startDate, endDate, prompt, model } = parsed.data
  await runPlanningInBackground(planId, originCode, destinationCode, startDate, endDate, prompt, model as AIProvider | undefined)

  return NextResponse.json({ ok: true, planId }, { status: 200 })
}
