import { generateObject } from 'ai'
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

/* ============================================================
   Agent 核心逻辑函数 — 直接调用，不走 HTTP
   供 orchestrate-bg 使用，避免 Vercel 内部 HTTP 自调问题
   ============================================================ */

export type StyleOutput   = z.infer<typeof StyleAgentOutputSchema>
export type RouteOutput   = z.infer<typeof RoutePlanOutputSchema>
export type ContentOutput = z.infer<typeof ContentAgentOutputSchema>
export type XHSOutput     = z.infer<typeof XHSAgentOutputSchema>

/* ── POI 推荐 Agent ── */
export async function runPoiAgent(params: {
  destination: string
  prompt:      string
  days:        number
}): Promise<StyleOutput> {
  const { destination, prompt, days } = params

  // 尝试获取高德 POI，失败不中断
  let candidatePOIs: { name: string; category: string; address: string; latLng?: { lat: number; lng: number } }[] = []
  try {
    const amap = getAmapClient()
    const pois = await amap.searchPOI({ city: destination, travelStyle: 'default', pageSize: 12 })
    candidatePOIs = pois
  } catch {
    // Amap 失败不影响 AI 生成
  }

  const { object } = await generateObject({
    model:  getAIProvider(),
    system: poiSystemPrompt(destination, prompt),
    prompt: `目的地：${destination}，${days}天行程，用户诉求：${prompt}
已获取的候选地点：${JSON.stringify(candidatePOIs.map(p => ({ name: p.name, category: p.category, address: p.address })))}
请根据用户诉求筛选最合适的地点，生成风格主题和亮点，并补充 AI 知识库中的著名地点`,
    schema: StyleAgentOutputSchema,
  })

  // 补充坐标
  const enrichedPOIs = object.pois.map(poi => {
    const amapPOI = candidatePOIs.find(p => p.name === poi.name)
    return amapPOI?.latLng ? { ...poi, latLng: amapPOI.latLng } : poi
  })

  return { ...object, pois: enrichedPOIs }
}

/* ── 路线规划 Agent ── */
export async function runRoutePlanAgent(params: {
  destination: string
  travelStyle: string
  days:        number
  pois:        Array<{ name: string; address: string; category: string }>
  startDate:   string
}): Promise<RouteOutput> {
  const { destination, travelStyle, days, pois, startDate } = params

  const lines = (travelStyle || '').split('\n')
  const constraintLines = lines.filter((l: string) => /^\[.+\]/.test(l.trim()))
  const coreStyle = lines.filter((l: string) => !/^\[.+\]/.test(l.trim())).join('\n').trim()
  const constraintSection = constraintLines.length > 0
    ? `\n\n⚠️ 以下约束必须严格体现在行程中：\n${constraintLines.map((l: string) => `- ${l.trim()}`).join('\n')}`
    : ''

  const { object } = await generateObject({
    model:  getAIProvider(),
    system: ROUTE_SYSTEM_PROMPT,
    prompt: `目的地：${destination}，旅行风格：${coreStyle || '轻松愉快'}，天数：${days}天，起始日期：${startDate || '未知'}${constraintSection}
可用POI列表：${JSON.stringify(pois.map(p => ({ name: p.name, address: p.address, category: p.category })))}
请规划 ${days} 天的详细行程，每天3-5个活动，合理安排上午/下午/晚上。每天的 date 字段必须填写实际日期（YYYY-MM-DD 格式），第1天为 ${startDate || '未知'}，依次递增`,
    schema: RoutePlanOutputSchema,
  })

  return object
}

/* ── 旅行贴士 Agent ── */
export async function runContentAgent(params: {
  destination: string
  travelStyle: string
  days:        number
}): Promise<ContentOutput> {
  const { destination, travelStyle, days } = params

  const { object } = await generateObject({
    model:  getAIProvider(),
    system: tipsSystemPrompt(destination, travelStyle),
    prompt: `为 ${destination} ${days} 天旅行生成打包建议和注意事项`,
    schema: ContentAgentOutputSchema,
  })

  return object
}

/* ── XHS 小红书笔记 Agent ── */
export async function runXhsAgent(params: {
  destination: string
  prompt:      string
  days:        number
}): Promise<XHSOutput> {
  const { destination, prompt, days } = params

  const { object } = await generateObject({
    model:  getAIProvider(),
    system: xhsSystemPrompt(destination, prompt, days),
    prompt: `为 ${destination} ${days} 天旅行生成 3-4 篇小红书风格攻略笔记，完全贴合用户诉求：${prompt}`,
    schema: XHSAgentOutputSchema,
  })

  return object
}
