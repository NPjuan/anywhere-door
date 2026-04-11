import { streamObject } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { getAmapClient } from '@/lib/api/maps/AmapClient'
import {
  poiSystemPrompt,
  ROUTE_SYSTEM_PROMPT,
  tipsSystemPrompt,
  xhsSystemPrompt,
} from '@/lib/agents/prompts'
import {
  StyleAgentOutputSchema,
  RoutePlanOutputSchema,
  ContentAgentOutputSchema,
  XHSAgentOutputSchema,
} from '@/lib/agents/types'
import type { z } from 'zod'
import type { DeepPartial } from 'ai'

/* ============================================================
   Agent 核心逻辑函数 — 直接调用，不走 HTTP
   使用 streamObject 实现流式进度回调
   ============================================================ */

export type StyleOutput   = z.infer<typeof StyleAgentOutputSchema>
export type RouteOutput   = z.infer<typeof RoutePlanOutputSchema>
export type ContentOutput = z.infer<typeof ContentAgentOutputSchema>
export type XHSOutput     = z.infer<typeof XHSAgentOutputSchema>

// 进度回调类型：传入当前局部对象 + 人读进度文字
type ProgressCallback<T> = (partial: DeepPartial<T>, message: string) => void

/* 节流：避免进度回调太频繁写 DB */
function throttle<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let last = 0
  return (...args: T) => {
    const now = Date.now()
    if (now - last >= ms) { last = now; fn(...args) }
  }
}

/* 带重试的 agent 执行包装
   - 最多重试 MAX_RETRIES 次
   - 每次重试等待 RETRY_DELAY_MS * attempt 毫秒（线性退避）
   - 每次失败都打印结构化日志
*/
const MAX_RETRIES    = 2
const RETRY_DELAY_MS = 3000

async function withRetry<T>(
  agentId: string,
  fn: (attempt: number) => Promise<T>,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const t0 = Date.now()
    try {
      const result = await fn(attempt)
      const ms = Date.now() - t0
      console.log(JSON.stringify({ agent: agentId, attempt, status: 'done', ms }))
      return result
    } catch (err) {
      lastErr = err
      const ms = Date.now() - t0
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(JSON.stringify({ agent: agentId, attempt, status: 'error', ms, error: errMsg }))
      if (attempt <= MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt
        console.warn(JSON.stringify({ agent: agentId, attempt, status: 'retrying', delayMs: delay }))
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

/* ── POI 推荐 Agent ── */
export async function runPoiAgent(params: {
  destination:  string
  prompt:       string
  days:         number
  onProgress?:  ProgressCallback<StyleOutput>
}): Promise<StyleOutput> {
  const { destination, prompt, days, onProgress } = params

  let candidatePOIs: { name: string; category: string; address: string; latLng?: { lat: number; lng: number } }[] = []
  try {
    const amap = getAmapClient()
    const pois = await amap.searchPOI({ city: destination, travelStyle: 'default', pageSize: 12 })
    candidatePOIs = pois
  } catch { /* Amap 失败不影响 AI 生成 */ }

  const throttledProgress = onProgress
    ? throttle(onProgress, 1500)
    : null

  return withRetry('poi', async () => {
    const { partialObjectStream, object } = streamObject({
      model:  getAIProvider(),
      system: poiSystemPrompt(destination, prompt),
      prompt: `目的地：${destination}，${days}天行程，用户诉求：${prompt}
已获取的候选地点：${JSON.stringify(candidatePOIs.map(p => ({ name: p.name, category: p.category, address: p.address })))}
请根据用户诉求筛选最合适的地点，生成风格主题和亮点，并补充 AI 知识库中的著名地点`,
      schema: StyleAgentOutputSchema,
    })

    for await (const partial of partialObjectStream) {
      if (!throttledProgress) continue
      const pois = partial.pois ?? []
      const lastPoi = pois[pois.length - 1]
      if (lastPoi?.name) {
        throttledProgress(partial, lastPoi.name)
      } else if (partial.styleTheme) {
        throttledProgress(partial, partial.styleTheme)
      }
    }

    const result = await object
    const enrichedPOIs = result.pois.map(poi => {
      const amapPOI = candidatePOIs.find(p => p.name === poi.name)
      return amapPOI?.latLng ? { ...poi, latLng: amapPOI.latLng } : poi
    })
    return { ...result, pois: enrichedPOIs }
  })
}

/* ── 路线规划 Agent ── */
export async function runRoutePlanAgent(params: {
  destination:  string
  travelStyle:  string
  days:         number
  pois:         Array<{ name: string; address: string; category: string }>
  startDate:    string
  onProgress?:  ProgressCallback<RouteOutput>
}): Promise<RouteOutput> {
  const { destination, travelStyle, days, pois, startDate, onProgress } = params

  const lines = (travelStyle || '').split('\n')
  const constraintLines = lines.filter((l: string) => /^\[.+\]/.test(l.trim()))
  const coreStyle = lines.filter((l: string) => !/^\[.+\]/.test(l.trim())).join('\n').trim()
  const constraintSection = constraintLines.length > 0
    ? `\n\n⚠️ 以下约束必须严格体现在行程中：\n${constraintLines.map((l: string) => `- ${l.trim()}`).join('\n')}`
    : ''

  const throttledProgress = onProgress
    ? throttle(onProgress, 1500)
    : null

  return withRetry('route', async () => {
    const { partialObjectStream, object } = streamObject({
      model:  getAIProvider(),
      system: ROUTE_SYSTEM_PROMPT,
      prompt: `目的地：${destination}，旅行风格：${coreStyle || '轻松愉快'}，天数：${days}天，起始日期：${startDate || '未知'}${constraintSection}
可用POI列表：${JSON.stringify(pois.map(p => ({ name: p.name, address: p.address, category: p.category })))}
请规划 ${days} 天的详细行程，每天3-5个活动，合理安排上午/下午/晚上。
每天的 date 字段必须填写实际日期（YYYY-MM-DD 格式），第1天为 ${startDate || '未知'}，依次递增。
活动中不需要填写 poi 字段，只需填写 time、name、description、duration、cost、transport 即可。`,
      schema: RoutePlanOutputSchema,
    })

    for await (const partial of partialObjectStream) {
      if (!throttledProgress) continue
      const days_ = partial.days ?? []
      const lastDay = days_[days_.length - 1]
      if (lastDay?.title) {
        throttledProgress(partial, lastDay.title)
      } else if (days_.length > 0) {
        throttledProgress(partial, `第 ${days_.length} 天`)
      }
    }

    return await object
  })
}

/* ── 旅行贴士 Agent ── */
export async function runContentAgent(params: {
  destination:  string
  travelStyle:  string
  days:         number
  onProgress?:  ProgressCallback<ContentOutput>
}): Promise<ContentOutput> {
  const { destination, travelStyle, days, onProgress } = params

  const throttledProgress = onProgress
    ? throttle(onProgress, 1500)
    : null

  return withRetry('tips', async () => {
    const { partialObjectStream, object } = streamObject({
      model:  getAIProvider(),
      system: tipsSystemPrompt(destination, travelStyle),
      prompt: `为 ${destination} ${days} 天旅行生成打包建议和注意事项`,
      schema: ContentAgentOutputSchema,
    })

    for await (const partial of partialObjectStream) {
      if (!throttledProgress) continue
      const tips = partial.packingTips ?? []
      if (tips.length > 0 && tips[tips.length - 1]) {
        throttledProgress(partial, tips[tips.length - 1]!)
      }
    }

    return await object
  })
}

/* ── XHS 小红书笔记 Agent ── */
export async function runXhsAgent(params: {
  destination:  string
  prompt:       string
  days:         number
  onProgress?:  ProgressCallback<XHSOutput>
}): Promise<XHSOutput> {
  const { destination, prompt, days, onProgress } = params

  const throttledProgress = onProgress
    ? throttle(onProgress, 1500)
    : null

  return withRetry('xhs', async () => {
    const { partialObjectStream, object } = streamObject({
      model:  getAIProvider(),
      system: xhsSystemPrompt(destination, prompt, days),
      prompt: `为 ${destination} ${days} 天旅行生成 3-4 篇小红书风格攻略笔记，完全贴合用户诉求：${prompt}`,
      schema: XHSAgentOutputSchema,
    })

    for await (const partial of partialObjectStream) {
      if (!throttledProgress) continue
      const notes = partial.notes ?? []
      const lastNote = notes[notes.length - 1]
      if (lastNote?.title) {
        throttledProgress(partial, lastNote.title)
      }
    }

    return await object
  })
}
