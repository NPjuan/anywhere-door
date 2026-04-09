import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { SYNTHESIS_SYSTEM_PROMPT } from '@/lib/agents/prompts'
import { POPULAR_CITIES } from '@/lib/cities'
import { supabase } from '@/lib/supabase'
import { parseJSON } from '@/lib/utils/jsonParse'

/* ============================================================
   POST /api/agents/orchestrate-bg
   后台异步规划 — 立即返回 202，后台执行直到完成
   前端通过轮询 GET /api/plans/[id] 获取进度
   ============================================================ */

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
    { id: 'route', path: 'route-plan', reqBody: { destination: destCity, prompt, days, pois: [] } },
    { id: 'tips',  path: 'content',    reqBody: { destination: destCity, travelStyle: prompt, highlights: [], days } },
    { id: 'xhs',   path: 'xhs',        reqBody: { destination: destCity, prompt, days } },
  ]

  const results: Record<string, unknown> = {}
  const progress: Record<string, { status: string; preview: string }> = {
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

  /* ── 汇总 ── */
  progress.synthesis = { status: 'running', preview: '' }
  await supabase.from('plans').update({ agent_progress: { ...progress } }).eq('id', planId)

  try {
    // 精简输入 context，避免撑爆 token 限制
    const poiNames    = (results.poi  as { pois?: Array<{name:string}> }  | null)?.pois?.map(p => p.name).slice(0, 15) ?? []
    const routeDays   = (results.route as { days?: unknown[] } | null)?.days ?? []
    const packingTips = (results.tips  as { packingTips?: string[] } | null)?.packingTips?.slice(0, 8) ?? []
    const warnings    = (results.tips  as { warnings?: string[] } | null)?.warnings?.slice(0, 5) ?? []
    const xhsNotes    = (results.xhs   as { notes?: unknown[] } | null)?.notes?.slice(0, 4) ?? []

    const result = streamText({
      model:           getAIProvider(),
      maxOutputTokens: 8000,
      system: SYNTHESIS_SYSTEM_PROMPT,
      prompt: `将以下信息整合为完整旅行方案的 FullItinerary JSON：

出发地：${originCity}，目的地：${destCity}
旅行时间：${startDate} 至 ${endDate}（${days}天）
用户诉求：${prompt || '精彩愉快的旅行体验'}

推荐地点（名称列表）：${JSON.stringify(poiNames)}
每日行程（已规划好）：${JSON.stringify(routeDays)}
打包建议：${JSON.stringify(packingTips)}
注意事项：${JSON.stringify(warnings)}
小红书笔记：${JSON.stringify(xhsNotes)}

请输出完整 FullItinerary JSON，字段包括：id, title, summary, destination, origin, startDate, endDate, userPrompt, days, xhsNotes, packingTips, warnings, generatedAt，以及 budget 对象（必须包含 low 和 high 两个数字字段，单位人民币，如 {"low": 2000, "high": 3500, "currency": "CNY"}）`,
    })

    let accumulated = ''
    for await (const chunk of result.textStream) {
      accumulated += chunk
    }

    // ===== 使用新的健壮 JSON 解析器 =====
    let parsed = parseJSON<Record<string, unknown>>(accumulated)

    if (!parsed) {
      console.error('[orchestrate-bg] JSON parse failed:', {
        accumulatedLength: accumulated.length,
        first500Chars: accumulated.slice(0, 500),
      })
      throw new Error('JSON parse failed: unable to extract valid JSON from synthesis output')
    }

    // 规范化 budget 字段：兼容 AI 可能输出 min/max/low/high 等不同字段名
    const rawBudget = parsed.budget as Record<string, unknown> | null | undefined
    const budgetLow  = Number(rawBudget?.low  ?? rawBudget?.min  ?? rawBudget?.minimum ?? 0) || 0
    const budgetHigh = Number(rawBudget?.high ?? rawBudget?.max  ?? rawBudget?.maximum ?? 0) || 0
    if (rawBudget && (rawBudget.min !== undefined || rawBudget.max !== undefined)) {
      parsed.budget = { ...rawBudget, low: budgetLow, high: budgetHigh }
    }

    progress.synthesis = { status: 'done', preview: '' }
    await supabase.from('plans').update({
      status:          'done',
      title:           parsed.title           ?? '未命名行程',
      summary:         parsed.summary         ?? '',
      destination:     parsed.destination     ?? '',
      days_count:      Array.isArray(parsed.days) ? parsed.days.length : 0,
      budget_low:      budgetLow,
      budget_high:     budgetHigh,
      itinerary:       parsed,
      planning_params: null,
      agent_progress:  progress,
    }).eq('id', planId)

  } catch (err) {
    progress.synthesis = { status: 'error', preview: String(err) }
    await supabase.from('plans').update({
      status:         'error',
      agent_progress: progress,
      planning_params: null,
    }).eq('id', planId)
  }
}

export async function POST(req: NextRequest) {
  const { planId, originCode, destinationCode, startDate, endDate, prompt } = await req.json()

  if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 })

  // 立即返回 202，后台异步执行（不 await）
  // Next.js App Router：Response 发送后 Node.js 进程继续运行直到 event loop 空
  void runPlanningInBackground(planId, originCode, destinationCode, startDate, endDate, prompt)

  return NextResponse.json({ ok: true, planId }, { status: 202 })
}
