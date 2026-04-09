import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { ROUTE_SYSTEM_PROMPT } from '@/lib/agents/prompts'
import { RoutePlanOutputSchema } from '@/lib/agents/types'

/* Agent 3 — 每日路线规划 / Daily route planning */
export async function POST(req: NextRequest) {
  const { destination, pois, days, travelStyle, startDate } = await req.json()

  // 从 travelStyle（enrichedPrompt）中解析结构化约束
  const lines = (travelStyle || '').split('\n')
  const constraintLines = lines.filter((l: string) => /^\[.+\]/.test(l.trim()))
  const coreStyle = lines.filter((l: string) => !/^\[.+\]/.test(l.trim())).join('\n').trim()
  const constraintSection = constraintLines.length > 0
    ? `\n\n⚠️ 以下约束必须严格体现在行程中：\n${constraintLines.map((l: string) => `- ${l.trim()}`).join('\n')}`
    : ''

  try {
    const { object } = await generateObject({
      model:  getAIProvider(),
      system: ROUTE_SYSTEM_PROMPT,
      prompt: `目的地：${destination}，旅行风格：${coreStyle || '轻松愉快'}，天数：${days}天，起始日期：${startDate || '未知'}${constraintSection}
可用POI列表：${JSON.stringify(pois.map((p: { name: string; address: string; category: string }) => ({
  name: p.name, address: p.address, category: p.category,
})))}
请规划 ${days} 天的详细行程，每天3-5个活动，合理安排上午/下午/晚上。每天的 date 字段必须填写实际日期（YYYY-MM-DD 格式），第1天为 ${startDate || '未知'}，依次递增`,
      schema: RoutePlanOutputSchema,
    })

    return NextResponse.json(object)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
