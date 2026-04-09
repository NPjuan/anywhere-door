import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { ROUTE_SYSTEM_PROMPT } from '@/lib/agents/prompts'
import { RoutePlanOutputSchema } from '@/lib/agents/types'

/* Agent 3 — 每日路线规划 / Daily route planning */
export async function POST(req: NextRequest) {
  const { destination, pois, days, travelStyle } = await req.json()

  try {
    const { object } = await generateObject({
      model:  getAIProvider(),
      system: ROUTE_SYSTEM_PROMPT,
      prompt: `目的地：${destination}，旅行风格：${travelStyle}，天数：${days}天
可用POI列表：${JSON.stringify(pois.map((p: { name: string; address: string; category: string }) => ({
  name: p.name, address: p.address, category: p.category,
})))}
请规划 ${days} 天的详细行程，每天3-5个活动，合理安排上午/下午/晚上`,
      schema: RoutePlanOutputSchema,
    })

    return NextResponse.json(object)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
