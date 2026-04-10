
import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { poiSystemPrompt } from '@/lib/agents/prompts'
import { StyleAgentOutputSchema } from '@/lib/agents/types'
import { getAmapClient } from '@/lib/api/maps/AmapClient'

export const maxDuration = 300

/* Agent 2 — POI 推荐（接受自由 prompt）/ POI recommendations from free prompt */
export async function POST(req: NextRequest) {
  const { destination, prompt, days } = await req.json()

  try {
    // 1. 高德 POI 搜索（通用类型，后续由 AI 筛选）
    const amap = getAmapClient()
    const pois = await amap.searchPOI({
      city:        destination,
      travelStyle: 'default',
      pageSize:    12,
    })

    // 2. AI 根据用户 prompt 筛选和评分
    const { object } = await generateObject({
      model:  getAIProvider(),
      system: poiSystemPrompt(destination, prompt),
      prompt: `目的地：${destination}，${days}天行程，用户诉求：${prompt}
已获取的候选地点：${JSON.stringify(pois.map((p) => ({ name: p.name, category: p.category, address: p.address })))}
请根据用户诉求筛选最合适的地点，生成风格主题和亮点，并补充 AI 知识库中的著名地点`,
      schema: StyleAgentOutputSchema,
    })

    // 补充坐标
    const enrichedPOIs = object.pois.map((poi) => {
      const amapPOI = pois.find((p) => p.name === poi.name)
      return amapPOI ? { ...poi, latLng: amapPOI.latLng } : poi
    })

    return NextResponse.json({ ...object, pois: enrichedPOIs })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
