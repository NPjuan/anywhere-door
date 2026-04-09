import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { SYNTHESIS_SYSTEM_PROMPT } from '@/lib/agents/prompts'
import { POPULAR_CITIES } from '@/lib/cities'

/* ============================================================
   Agent Orchestrate — SSE 并行执行 + 流式汇总
   SSE-based parallel execution + streaming synthesis

   SSE event format (NDJSON lines):
   data: {"type":"agent:start",  "id":"poi"}
   data: {"type":"agent:done",   "id":"poi",  "preview":"..."}
   data: {"type":"agent:error",  "id":"poi",  "error":"..."}
   data: {"type":"synthesis:start"}
   data: {"type":"synthesis:chunk","chunk":"..."}
   data: {"type":"done","itinerary":"..."}
   ============================================================ */

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

async function callAgent<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}/api/agents/${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Agent ${path} error ${res.status}: ${text}`)
  }
  return res.json()
}

/** 将 JSON 对象转为一行 SSE data: 消息 */
function sseEvent(obj: object): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}

/** 每个 agent 执行时，发出有意义的"思考步骤"流式提示 */
const THINKING_STEPS: Record<string, string[]> = {
  poi: [
    '正在检索目的地热门地标...',
    '分析用户旅行诉求，筛选匹配地点...',
    '结合高德 POI 数据，评估推荐权重...',
    '整合地点评分与用户偏好...',
  ],
  route: [
    '按地理位置对地点进行聚类分析...',
    '计算最优游览顺序，减少折返...',
    '规划每日上午/下午/晚上活动...',
    '估算交通时间与活动时长...',
  ],
  tips: [
    '分析目的地气候与季节特征...',
    '整理当地交通与住宿注意事项...',
    '生成针对性打包清单...',
    '汇总常见避坑攻略...',
  ],
  xhs: [
    '搜索小红书热门攻略内容...',
    '提炼博主真实经验与推荐...',
    '筛选最具参考价值的内容...',
    '整理实用数据与出行建议...',
  ],
}

async function emitThinkingStream(
  id: string,
  emit: (obj: object) => void,
  durationMs: number,
): Promise<void> {
  const steps = THINKING_STEPS[id] ?? []
  if (steps.length === 0) return
  const interval = durationMs / (steps.length + 1)
  for (const step of steps) {
    await new Promise((r) => setTimeout(r, interval * 0.3))
    emit({ type: 'agent:stream', id, chunk: step + '\n' })
    await new Promise((r) => setTimeout(r, interval * 0.7))
  }
}
function makePreview(id: string, result: unknown): string {
  if (!result || typeof result !== 'object') return ''
  const r = result as Record<string, unknown>
  if (id === 'poi') {
    const pois = (r.pois as Array<{ name: string }> | undefined) ?? []
    return pois.slice(0, 5).map((p) => p.name).join(' · ')
  }
  if (id === 'route') {
    const days = (r.days as Array<{ title: string }> | undefined) ?? []
    return days.map((d) => d.title).join(' → ')
  }
  if (id === 'tips') {
    const tips = (r.packingTips as string[] | undefined) ?? []
    return tips.slice(0, 3).join(' / ')
  }
  if (id === 'xhs') {
    const notes = (r.notes as Array<{ title: string }> | undefined) ?? []
    return notes.map((n) => n.title).join(' | ')
  }
  return ''
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { originCode, destinationCode, startDate, endDate, prompt } = body

  const destCity   = POPULAR_CITIES.find((c) => c.code === destinationCode)?.name ?? destinationCode
  const originCity = POPULAR_CITIES.find((c) => c.code === originCode)?.name ?? originCode

  const days = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : 3

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const emit = (obj: object) => controller.enqueue(enc.encode(sseEvent(obj)))

      /* ── 并行执行 4 个子 Agent / Run 4 agents in parallel ── */
      const agentTasks: Array<{ id: string; path: string; reqBody: object }> = [
        { id: 'poi',   path: 'style',      reqBody: { destination: destCity, prompt, days } },
        { id: 'route', path: 'route-plan', reqBody: { destination: destCity, prompt, days, pois: [] } },
        { id: 'tips',  path: 'content',    reqBody: { destination: destCity, travelStyle: prompt, highlights: [], days } },
        { id: 'xhs',   path: 'xhs',        reqBody: { destination: destCity, prompt, days } },
      ]

      // 同时发出 start 事件
      agentTasks.forEach(({ id }) => emit({ type: 'agent:start', id }))

      // 用 Promise.allSettled 并行，每个 resolve/reject 后立即 emit done/error
      const results: Record<string, unknown> = {}

      await Promise.allSettled(
        agentTasks.map(async ({ id, path, reqBody }) => {
          try {
            // 并行发出思考流和实际 API 调用
            const [result] = await Promise.all([
              callAgent<unknown>(path, reqBody),
              emitThinkingStream(id, emit, 8000),
            ])
            results[id] = result
            emit({ type: 'agent:done', id, preview: makePreview(id, result) })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            emit({ type: 'agent:error', id, error: msg })
          }
        }),
      )

      /* ── Agent 5：流式汇总 / Streaming synthesis ── */
      emit({ type: 'synthesis:start' })

      let accumulated = ''
      try {
        const result = streamText({
          model:  getAIProvider(),
          system: SYNTHESIS_SYSTEM_PROMPT,
          prompt: `将以下信息整合为完整旅行方案的 FullItinerary JSON：

出发地：${originCity}，目的地：${destCity}
旅行时间：${startDate} 至 ${endDate}（${days}天）
用户诉求：${prompt || '精彩愉快的旅行体验'}

地点推荐（styleTheme + pois + highlights）：
${JSON.stringify(results.poi ?? null)}

每日行程（days + budgetEstimate）：
${JSON.stringify(results.route ?? null)}

旅行贴士（packingTips + warnings）：
${JSON.stringify(results.tips ?? null)}

小红书笔记（xhsNotes）：
${JSON.stringify(results.xhs ?? null)}

生成时间：${new Date().toISOString()}

请输出完整 FullItinerary JSON，字段包括：
id, title, summary, destination, origin, startDate, endDate, userPrompt,
days, xhsNotes, packingTips, warnings, budget, generatedAt`,
        })

        for await (const chunk of result.textStream) {
          accumulated += chunk
          emit({ type: 'synthesis:chunk', chunk })
        }

        emit({ type: 'done', itinerary: accumulated })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        emit({ type: 'synthesis:error', error: msg })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
