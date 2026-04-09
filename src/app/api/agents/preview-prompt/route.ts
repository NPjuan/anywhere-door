import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { POPULAR_CITIES } from '@/lib/cities'

/* ============================================================
   preview-prompt — 生成行程规划 Prompt 预览（流式）
   ============================================================ */

export async function POST(req: NextRequest) {
  const {
    originCode,
    destinationCode,
    startDate,
    endDate,
    userPrompt,
    hotelName,
    hotelAddress,
    mustVisitNames,
    mustAvoidNames,
    originAirportName,
    originAirportCode,
    destAirportName,
    destAirportCode,
    arrivalTime,
    departureTime,
    travelers,
  } = await req.json()

  const originCity = POPULAR_CITIES.find((c) => c.code === originCode)?.name ?? originCode
  const destCity   = POPULAR_CITIES.find((c) => c.code === destinationCode)?.name ?? destinationCode

  const days = startDate && endDate
    ? Math.max(1, Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000,
      ) + 1)
    : 3

  // 构建附加约束描述
  const constraints: string[] = []

  if (originAirportName || originAirportCode) {
    constraints.push(`出发机场：${[originAirportName, originAirportCode].filter(Boolean).join('（').replace(/([^）])$/, '$1）')}`)
  }
  if (destAirportName || destAirportCode) {
    const arrive = [destAirportName, destAirportCode].filter(Boolean).join('（').replace(/([^）])$/, '$1）')
    const timeNote = arrivalTime ? `，落地时间约 ${arrivalTime}` : ''
    constraints.push(`抵达机场：${arrive}${timeNote}，请将机场作为第一天行程起点`)
  } else if (arrivalTime) {
    constraints.push(`落地时间约 ${arrivalTime}，请从该时间开始规划第一天行程`)
  }
  if (departureTime) {
    constraints.push(`返程起飞时间 ${departureTime}，最后一天行程需在此前结束并预留前往机场时间`)
  }
  if (travelers && travelers > 1) {
    constraints.push(`同行人数：共 ${travelers} 人，请据此推荐合适规模的住宿、餐厅和活动`)
  }
  if (hotelName || hotelAddress) {
    const hotel = [hotelName, hotelAddress].filter(Boolean).join('，位于')
    constraints.push(`住宿：${hotel}，每天行程需以酒店为出发和返回基点，合理规划出行距离`)
  }
  if (mustVisitNames?.length) {
    constraints.push(`必去地点：${mustVisitNames.join('、')}，这些地点必须纳入行程`)
  }
  if (mustAvoidNames?.length) {
    constraints.push(`不想去：${mustAvoidNames.join('、')}，请在规划中避开这些地点`)
  }

  const constraintSection = constraints.length > 0
    ? `\n用户特别要求：\n${constraints.map((c) => `- ${c}`).join('\n')}`
    : ''

  const result = streamText({
    model: getAIProvider(),
    system: `你是"任意门"AI旅行规划助手。
用户填写了基础旅行信息后，你需要将这些信息整理成一段清晰、结构化的行程规划诉求描述。

输出要求：
- 语言：中文，口语化，亲切自然
- 长度：200-400字
- 结构：1) 旅行概况（谁去哪里、几天） 2) 核心玩法诉求 3) 期望的行程节奏 4) 特别要求（如有酒店/必去/不去地点，需明确说明并融入语境）
- 可读性强，让用户看了觉得"对，就是这个意思"
- 不要用 markdown，不要标题符号，直接平铺文字
- 最后一句话留出"你可以在此基础上修改或补充任何内容"的提示`,
    prompt: `请根据以下信息，帮我生成一段行程规划诉求描述：

出发地：${originCity}
目的地：${destCity}
旅行时间：${startDate} 至 ${endDate}（共 ${days} 天）
用户诉求：${userPrompt || '希望来一次轻松愉快的旅行'}${constraintSection}

请帮我把这些信息整理成一段完整、清晰的行程规划描述，让 AI 能够精准理解我的需求。如果有特别要求（酒店地址、必去/不去地点），请自然地融入描述中，体现对这些约束的重视。`,
  })

  return result.toTextStreamResponse()
}
