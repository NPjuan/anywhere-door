import { NextRequest, NextResponse } from 'next/server'
import { POPULAR_CITIES } from '@/lib/cities'
import { supabase } from '@/lib/supabase'

/* ============================================================
   POST /api/agents/orchestrate-bg
   同步执行 4 个 Agent（等待全部完成后返回），确保 Vercel 不提前终止进程
   前端通过轮询 GET /api/plans/[id] 获取进度
   ============================================================ */

// Vercel Pro 最长 300s，Hobby 最长 60s
// 4 个 Agent 并行约 30-60s，synthesis 由前端流式调用
export const maxDuration = 300

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

async function callAgent<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}/api/agents/${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Agent ${path} error ${res.status}`)
  return res.json()
}

function makePreview(id: string, result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  const r = result as Record<string, unknown>
  if (id === 'poi') return ((r.pois as Array<{name:string}>|undefined) ?? []).slice(0,5).map(p=>p.name).join(' · ')
  if (id === 'route') return ((r.days as Array<{title:string}>|undefined) ?? []).map(d=>d.title).join(' → ')
  if (id === 'tips') return ((r.packingTips as string[]|undefined) ?? []).slice(0,3).join(' / ')
  if (id === 'xhs') return ((r.notes as Array<{title:string}>|undefined) ?? []).map(n=>n.title).join(' | ')
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

  const agentTasks = [
    { id: 'poi',   path: 'style',      reqBody: { destination: destCity, prompt, days } },
    { id: 'route', path: 'route-plan', reqBody: { destination: destCity, travelStyle: prompt, days, pois: [], startDate } },
    { id: 'tips',  path: 'content',    reqBody: { destination: destCity, travelStyle: prompt, highlights: [], days } },
    { id: 'xhs',   path: 'xhs',        reqBody: { destination: destCity, prompt, days } },
  ]

  const results: Record<string, unknown> = {}
  const progress: Record<string, { status: string; preview: string; input?: unknown }> = {
    poi: { status: 'running', preview: '' },
    route: { status: 'running', preview: '' },
    tips: { status: 'running', preview: '' },
    xhs: { status: 'running', preview: '' },
    synthesis: { status: 'idle', preview: '' },
  }

  /* ── 并行执行 4 个子 Agent ── */
  await Promise.allSettled(
    agentTasks.map(async ({ id, path, reqBody }) => {
      try {
        const result = await callAgent<unknown>(path, reqBody)
        results[id] = result
        const preview = makePreview(id, result)
        progress[id] = { status: 'done', preview }
        // 每个 agent 完成后立即更新 DB
        await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)
      } catch {
        progress[id] = { status: 'error', preview: '' }
        await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)
      }
    })
  )

  /* ── 4 个 Agent 全部完成，准备 synthesis 输入，存入 DB 等待前端流式消费 ── */
  const poiNames    = (results.poi  as { pois?: Array<{name:string}> }  | null)?.pois?.map(p => p.name).slice(0, 15) ?? []
  const routeDays   = (results.route as { days?: unknown[] } | null)?.days ?? []
  const packingTips = (results.tips  as { packingTips?: string[] } | null)?.packingTips?.slice(0, 8) ?? []
  const warnings    = (results.tips  as { warnings?: string[] } | null)?.warnings?.slice(0, 5) ?? []
  const xhsNotes    = (results.xhs   as { notes?: unknown[] } | null)?.notes?.slice(0, 4) ?? []

  const synthesisInput = {
    originCity,
    destCity,
    startDate,
    endDate,
    days,
    prompt,
    poiNames,
    routeDays,
    packingTips,
    warnings,
    xhsNotes,
  }

  progress.synthesis = { status: 'waiting', preview: '', input: synthesisInput }
  await supabase.from('plans').update({
    agent_progress: { ...progress },
  }).eq('id', planId)
}

export async function POST(req: NextRequest) {
  const { planId, originCode, destinationCode, startDate, endDate, prompt } = await req.json()

  if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 })

  // 同步执行，等待所有 Agent 完成（Vercel 环境 void 后台任务不可靠）
  await runPlanningInBackground(planId, originCode, destinationCode, startDate, endDate, prompt)

  return NextResponse.json({ ok: true, planId }, { status: 200 })
}
