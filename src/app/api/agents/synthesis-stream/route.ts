
import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { SYNTHESIS_SYSTEM_PROMPT } from '@/lib/agents/prompts'
import { supabase } from '@/lib/supabase'
import { parseJSON } from '@/lib/utils/jsonParse'

export const maxDuration = 300

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
    poiNames, poiLatLngMap, routeDays, packingTips, warnings, xhsNotes,
  } = synthInput as {
    originCity: string; destCity: string; startDate: string; endDate: string
    days: number; prompt: string
    poiNames: string[]
    poiLatLngMap: Record<string, { lat: number; lng: number; address: string; category: string }>
    routeDays: unknown[]; packingTips: string[]
    warnings: string[]; xhsNotes: unknown[]
  }

  // 把 poi 坐标按名字回填进 routeDays 的每个活动，让地图有标点
  const enrichedRouteDays = routeDays.map((day) => {
    const d = day as Record<string, unknown>
    const enrichActivities = (acts: unknown[]) => acts.map((act) => {
      const a = act as Record<string, unknown>
      const name = a.name as string
      const coords = name ? poiLatLngMap?.[name] : null
      if (!coords) return a
      return {
        ...a,
        poi: {
          id:       name.replace(/\s+/g, '_').toLowerCase(),
          name,
          address:  coords.address || '',
          category: coords.category || 'attraction',
          latLng:   { lat: coords.lat, lng: coords.lng },
        },
      }
    })
    return {
      ...d,
      morning:   Array.isArray(d.morning)   ? enrichActivities(d.morning)   : d.morning,
      afternoon: Array.isArray(d.afternoon) ? enrichActivities(d.afternoon) : d.afternoon,
      evening:   Array.isArray(d.evening)   ? enrichActivities(d.evening)   : d.evening,
    }
  })

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

  // 把坐标字典格式化为易读列表传给 AI
  const poiCoordsSection = poiLatLngMap && Object.keys(poiLatLngMap).length > 0
    ? `\n地点坐标字典（输出活动时按名字匹配并填入 poi 字段）：\n${
        Object.entries(poiLatLngMap)
          .map(([name, c]) => `  "${name}": { lat: ${c.lat}, lng: ${c.lng}, address: "${c.address}", category: "${c.category}" }`)
          .join('\n')
      }`
    : ''
  const updatedProgress = {
    ...progress,
    synthesis: { status: 'running', preview: '' },
  }
  await supabase.from('plans').update({ agent_progress: updatedProgress }).eq('id', planId)

  // 检测前置 agent 数据是否有效
  const hasRouteData  = Array.isArray(routeDays)  && routeDays.length  > 0
  const hasPoiData    = Array.isArray(poiNames)   && poiNames.length   > 0
  const hasTipsData   = Array.isArray(packingTips) && packingTips.length > 0
  const hasXhsData    = Array.isArray(xhsNotes)   && xhsNotes.length   > 0
  const hasPriorData  = hasRouteData || hasPoiData

  // 根据数据质量选择 prompt 模式
  const agentDataSection = hasPriorData
    ? `
推荐地点（名称列表）：${JSON.stringify(poiNames)}
每日行程（已规划好，含坐标）：${JSON.stringify(enrichedRouteDays)}
打包建议：${JSON.stringify(hasTipsData ? packingTips : [])}
注意事项：${JSON.stringify(hasTipsData ? warnings : [])}
小红书笔记：${JSON.stringify(hasXhsData ? xhsNotes : [])}`
    : `
（前置 Agent 数据不可用，请完全依靠自身知识独立规划完整行程，不要留空字段）`

  const selfPlanNote = hasPriorData ? '' : `
⚠️ 独立规划模式：前置 Agent 均失败，你需要完全自主规划，生成真实可用的行程。
请根据目的地、日期、用户诉求和约束条件，独立生成包含具体景点、餐厅、交通方式的完整行程。
确保 days 数组中每天都有 morning、afternoon、evening 三个时段的活动。`

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
          prompt: `将以下信息整合为完整旅行方案的 FullItinerary JSON：${selfPlanNote}

出发地：${originCity}，目的地：${destCity}
旅行时间：${startDate} 至 ${endDate}（${days}天）
用户核心诉求：${corePrompt}${constraintSection}
${agentDataSection}${poiCoordsSection}

请输出完整 FullItinerary JSON，严格遵守以下 schema：
- days: 数组，每天包含 day(数字)、date(YYYY-MM-DD)、title(中文标题)、morning/afternoon/evening(活动数组)
- 每个活动包含：time(HH:mm)、name、description、duration(如"2小时")、cost(可选)、transport(可选)
- 活动的 poi 字段：如果活动名称能在「地点坐标字典」中匹配到，必须输出 poi 对象，格式为 {"id":"xxx","name":"景点名","address":"地址","category":"类型","latLng":{"lat":纬度,"lng":经度}}
- 顶层字段：id, title, summary, destination, origin, startDate, endDate, userPrompt, days, xhsNotes, packingTips, warnings, generatedAt
- budget 对象必须包含 low 和 high 两个数字（单位人民币），如 {"low": 2000, "high": 3500, "currency": "CNY"}`,
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

        // 后处理：对 synthesis 输出的行程做坐标回填
        // AI 重新生成行程时不会保留 poi 字段，在这里按活动名字匹配补充坐标
        if (poiLatLngMap && Object.keys(poiLatLngMap).length > 0 && Array.isArray(parsed.days)) {
          const injectCoords = (acts: unknown[]) => acts.map((act) => {
            const a = act as Record<string, unknown>
            if (a.poi) return a  // 已有 poi，跳过
            const name = a.name as string
            if (!name) return a
            // 精确匹配 or 模糊匹配（处理 AI 改了部分名字的情况）
            const coords = poiLatLngMap[name]
              ?? Object.entries(poiLatLngMap).find(([k]) => name.includes(k) || k.includes(name))?.[1]
            if (!coords) return a
            return {
              ...a,
              poi: {
                id:       name.replace(/\s+/g, '_').toLowerCase(),
                name,
                address:  coords.address || '',
                category: coords.category || 'attraction',
                latLng:   { lat: coords.lat, lng: coords.lng },
              },
            }
          })
          parsed.days = (parsed.days as Record<string, unknown>[]).map(day => ({
            ...day,
            morning:   Array.isArray(day.morning)   ? injectCoords(day.morning as unknown[])   : day.morning,
            afternoon: Array.isArray(day.afternoon) ? injectCoords(day.afternoon as unknown[]) : day.afternoon,
            evening:   Array.isArray(day.evening)   ? injectCoords(day.evening as unknown[])   : day.evening,
          }))
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
