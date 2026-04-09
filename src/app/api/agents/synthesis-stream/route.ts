import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { SYNTHESIS_SYSTEM_PROMPT } from '@/lib/agents/prompts'
import { supabase } from '@/lib/supabase'
import { parseJSON } from '@/lib/utils/jsonParse'

/* ============================================================
   POST /api/agents/synthesis-stream
   前端主动调用，流式输出 synthesis 结果
   同时将结果写回 DB
   Body: { planId: string }
   ============================================================ */

export async function POST(req: NextRequest) {
  const { planId } = await req.json()
  if (!planId) {
    return new Response(JSON.stringify({ error: 'Missing planId' }), { status: 400 })
  }

  // 从 DB 读取 synthesis 输入（由 orchestrate-bg 预先存入）
  const { data, error: dbError } = await supabase
    .from('plans')
    .select('agent_progress')
    .eq('id', planId)
    .single()

  if (dbError || !data) {
    return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404 })
  }

  const progress = data.agent_progress as Record<string, { status: string; preview: string; input?: Record<string, unknown> }> | null
  const synthInput = progress?.synthesis?.input

  if (!synthInput) {
    return new Response(JSON.stringify({ error: 'Synthesis input not ready' }), { status: 400 })
  }

  const {
    originCity, destCity, startDate, endDate, days, prompt,
    poiNames, routeDays, packingTips, warnings, xhsNotes,
  } = synthInput as {
    originCity: string; destCity: string; startDate: string; endDate: string
    days: number; prompt: string
    poiNames: string[]; routeDays: unknown[]; packingTips: string[]
    warnings: string[]; xhsNotes: unknown[]
  }

  // 从 enrichedPrompt 中解析结构化约束行（以 [xxx] 开头的行）
  const lines = (prompt || '').split('\n')
  const corePromptLines: string[] = []
  const constraintLines: string[] = []
  for (const line of lines) {
    if (/^\[.+\]/.test(line.trim())) {
      constraintLines.push(line.trim())
    } else {
      corePromptLines.push(line)
    }
  }
  const corePrompt = corePromptLines.join('\n').trim() || '精彩愉快的旅行体验'
  const constraintSection = constraintLines.length > 0
    ? `\n\n⚠️ 以下约束条件必须严格遵守：\n${constraintLines.map(l => `- ${l}`).join('\n')}`
    : ''

  // 标记 synthesis 进入 running
  const updatedProgress = {
    ...progress,
    synthesis: { status: 'running', preview: '' },
  }
  await supabase.from('plans').update({ agent_progress: updatedProgress }).eq('id', planId)

  // 创建 SSE 流，同时把 chunk 累积起来写回 DB
  const encoder = new TextEncoder()
  let accumulated = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = streamText({
          model:           getAIProvider(),
          maxOutputTokens: 8000,
          system: SYNTHESIS_SYSTEM_PROMPT,
          prompt: `将以下信息整合为完整旅行方案的 FullItinerary JSON：

出发地：${originCity}，目的地：${destCity}
旅行时间：${startDate} 至 ${endDate}（${days}天）
用户核心诉求：${corePrompt}${constraintSection}

推荐地点（名称列表）：${JSON.stringify(poiNames)}
每日行程（已规划好）：${JSON.stringify(routeDays)}
打包建议：${JSON.stringify(packingTips)}
注意事项：${JSON.stringify(warnings)}
小红书笔记：${JSON.stringify(xhsNotes)}

请输出完整 FullItinerary JSON，字段包括：id, title, summary, destination, origin, startDate, endDate, userPrompt, days, xhsNotes, packingTips, warnings, generatedAt，以及 budget 对象（必须包含 low 和 high 两个数字字段，单位人民币，如 {"low": 2000, "high": 3500, "currency": "CNY"}）`,
        })

        for await (const chunk of result.textStream) {
          accumulated += chunk
          controller.enqueue(encoder.encode(chunk))
        }

        // 流结束，解析 JSON 并写 DB
        let parsed = parseJSON<Record<string, unknown>>(accumulated)

        if (!parsed) {
          console.error('[synthesis-stream] JSON parse failed, length:', accumulated.length)
          throw new Error('JSON parse failed')
        }

        // 规范化 budget 字段
        const rawBudget = parsed.budget as Record<string, unknown> | null | undefined
        const budgetLow  = Number(rawBudget?.low  ?? rawBudget?.min  ?? rawBudget?.minimum ?? 0) || 0
        const budgetHigh = Number(rawBudget?.high ?? rawBudget?.max  ?? rawBudget?.maximum ?? 0) || 0
        if (rawBudget && (rawBudget.min !== undefined || rawBudget.max !== undefined)) {
          parsed.budget = { ...rawBudget, low: budgetLow, high: budgetHigh }
        }

        const doneProg = { ...updatedProgress, synthesis: { status: 'done', preview: '' } }
        await supabase.from('plans').update({
          status:          'done',
          title:           (parsed.title as string)           ?? '未命名行程',
          summary:         (parsed.summary as string)         ?? '',
          destination:     (parsed.destination as string)     ?? '',
          days_count:      Array.isArray(parsed.days) ? parsed.days.length : 0,
          budget_low:      budgetLow,
          budget_high:     budgetHigh,
          itinerary:       parsed,
          agent_progress:  doneProg,
          // planning_params 保留不清空，供调试查看完整 enriched prompt
        }).eq('id', planId)

      } catch (err) {
        console.error('[synthesis-stream] error:', err)
        const errProg = { ...updatedProgress, synthesis: { status: 'error', preview: String(err) } }
        await supabase.from('plans').update({
          status:          'error',
          agent_progress:  errProg,
          planning_params: null,
        }).eq('id', planId)
        // 向前端发送错误标记
        controller.enqueue(encoder.encode('\n\n__SYNTHESIS_ERROR__'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
