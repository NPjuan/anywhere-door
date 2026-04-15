
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { streamText } from 'ai'
import { getAIProvider, getModelConfig, patchSystemForGLM } from '@/lib/agents/utils'
import type { AIProvider } from '@/lib/agents/utils'
import { SYNTHESIS_SYSTEM_PROMPT } from '@/lib/agents/prompts'
import { FullItinerarySchema } from '@/lib/agents/types'
import { supabase } from '@/lib/supabase'
import { parseJSON } from '@/lib/utils/jsonParse'
import { createLogger } from '@/lib/logger'

/* ── 行程后置校验与修复 ────────────────────────────────────────
   JSON parse 成功后，对结构和业务逻辑做兜底修复：
   1. days 长度与实际天数对齐
   2. 每天 date 字段连续（startDate + i）
   3. morning/afternoon/evening 必须是数组
   4. 跨天重复景点去重（同名活动只保留首次出现）
──────────────────────────────────────────────────────────────── */
function validateAndRepairItinerary(
  data: Record<string, unknown>,
  startDate: string,
  expectedDays: number,
): Record<string, unknown> {
  if (!Array.isArray(data.days)) {
    data.days = []
  }

  const days = data.days as Record<string, unknown>[]

  // 1. 修复每天的 morning/afternoon/evening 必须是数组
  for (const day of days) {
    if (!Array.isArray(day.morning))   day.morning   = []
    if (!Array.isArray(day.afternoon)) day.afternoon = []
    if (!Array.isArray(day.evening))   day.evening   = []
  }

  // 2. 修复日期连续性：强制覆盖为 startDate + i 天
  const start = new Date(startDate)
  for (let i = 0; i < days.length; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const yyyy = d.getFullYear()
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const dd   = String(d.getDate()).padStart(2, '0')
    days[i].date = `${yyyy}-${mm}-${dd}`
    days[i].day  = i + 1
  }

  // 3. 天数对齐：超出截断，不足补空天
  if (days.length > expectedDays) {
    data.days = days.slice(0, expectedDays)
  } else {
    while ((data.days as unknown[]).length < expectedDays) {
      const idx  = (data.days as unknown[]).length
      const d    = new Date(start)
      d.setDate(start.getDate() + idx)
      const yyyy = d.getFullYear()
      const mm   = String(d.getMonth() + 1).padStart(2, '0')
      const dd   = String(d.getDate()).padStart(2, '0')
      ;(data.days as Record<string, unknown>[]).push({
        day: idx + 1, date: `${yyyy}-${mm}-${dd}`,
        title: `第${idx + 1}天`, morning: [], afternoon: [], evening: [],
      })
    }
  }

  // 4. 跨天重复景点去重（按活动 name 去重，保留首次出现）
  const seenNames = new Set<string>()
  for (const day of data.days as Record<string, unknown>[]) {
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      const acts = day[slot] as Record<string, unknown>[]
      day[slot] = acts.filter(act => {
        const name = (act.name as string | undefined)?.trim()
        if (!name) return true  // 没有名字的活动保留
        // 交通/住宿类不去重
        if (/机场|酒店|入住|前往|返回|出发|到达/.test(name)) return true
        if (seenNames.has(name)) {
          return false  // 重复，移除
        }
        seenNames.add(name)
        return true
      })
    }
  }

  return data
}

export const maxDuration = 300

/* ============================================================
   POST /api/agents/synthesis-stream
   前端主动调用，流式输出 synthesis 结果
   同时将结果写回 DB
   Body: { planId: string }
   ============================================================ */

export async function POST(req: NextRequest) {
  const body = await req.json()

  const schema = z.object({ planId: z.string().min(1) })
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Missing planId' }), { status: 400 })
  }
  const { planId } = parsed.data

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

  // 读取规划时选择的模型（独立列）
  const { data: planData } = await supabase.from('plans').select('ai_model, planning_params, device_id').eq('id', planId).single()
  const savedModel = (planData?.ai_model ?? (planData?.planning_params as Record<string, unknown> | null)?.model) as AIProvider | undefined
  const deviceId = planData?.device_id as string | undefined

  const L = createLogger({ deviceId, planId, flow: 'synthesis' })

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

  // 单独提取落地时间/返程时间，在 prompt 头部强调（比 constraintSection 优先级更高）
  const arrivalLine   = constraintLines.find(l => l.startsWith('[落地时间]'))
  const departureLine = constraintLines.find(l => l.startsWith('[返程时间]'))

  const arrivalWarning = arrivalLine
    ? `\n\n🚨 落地时间特别提醒（最高优先级）：${arrivalLine}
判断规则：
- 凌晨落地（00:00-05:59）：第一天只放"办理入住/休息"，morning/afternoon/evening 视落地时间决定，当晚不安排游览
- 早上落地（06:00-11:59）：第一天 morning 为入住，afternoon 开始游览
- 其余时间正常安排，从落地时间点之后才开始规划活动`
    : ''

  const departureWarning = departureLine
    ? `\n\n🚨 返程时间特别提醒（最高优先级）：${departureLine}
判断规则：
- 凌晨起飞（00:00-05:59）：起飞当天只放"前往机场"(凌晨)，当天 afternoon=[]，evening=[]，当天绝无游览活动。前一天 evening 最后放"休息，明日凌晨出发"。
  例：04/12 凌晨03:15起飞 → 04/12 只有 morning["凌晨01:15前往机场"]，04/11是最后一个游览日。
- 早上起飞（06:00-11:59）：最后一天 morning 只放前往机场，afternoon=[]，evening=[]。
- 下午起飞（12:00-17:59）：最后一天 morning 可轻松游览，afternoon 只放前往机场，evening=[]。
- 晚上起飞（18:00-23:59）：最后一天白天正常，evening 只放前往机场。`
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
注意：morning/afternoon/evening 可以为空数组，不要为满足结构而强行安排活动。`

  // 创建 SSE 流，同时把 chunk 累积起来写回 DB
  const encoder = new TextEncoder()
  let accumulated = ''
  const synthT0 = Date.now()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const cfg = getModelConfig(savedModel)
        const isGLM = savedModel?.startsWith('glm') ?? false
        console.log(JSON.stringify({ event: 'synthesis-start', planId, model: savedModel ?? 'deepseek', isGLM }))
        L.info('start', { model: savedModel ?? 'deepseek', isGLM, days, originCity, destCity })
        const fullSystem = isGLM
          ? patchSystemForGLM(SYNTHESIS_SYSTEM_PROMPT, FullItinerarySchema)
          : SYNTHESIS_SYSTEM_PROMPT
        const result = streamText({
          model:           getAIProvider(savedModel),
          temperature:     cfg.temperature,
          maxOutputTokens: cfg.maxOutputTokens ?? 8000,
          system:          fullSystem,
          prompt: `将以下信息整合为完整旅行方案的 FullItinerary JSON：${selfPlanNote}${arrivalWarning}${departureWarning}

出发地：${originCity}，目的地：${destCity}
旅行时间：${startDate} 至 ${endDate}（${days}天）
用户核心诉求：${corePrompt}${constraintSection}
${agentDataSection}${poiCoordsSection}

请输出完整 FullItinerary JSON，严格遵守以下 schema：
- days: 数组，每天包含 day(数字)、date(YYYY-MM-DD)、title(中文标题)、morning/afternoon/evening(活动数组)
- 每个活动包含：time(HH:mm)、name、description、duration(如"2小时")、cost(可选)、transport(可选，必须具体：如"地铁2号线至春熙路站A口，步行3分钟"，不要只写"步行/地铁约20分钟")
- 活动的 poi 字段：所有涉及实际地点的活动都必须输出 poi，包括景点、餐厅、公园、博物馆、酒店、机场等。优先用「地点坐标字典」中的坐标，字典中没有的根据知识估算真实坐标（不要省略）。"返回酒店"要填酒店的 poi，"前往机场"要填机场的 poi，"入住酒店"要填酒店的 poi。只有"整理行李""休息""在房间休息""补觉"等完全不涉及具体地点的活动才可以不输出 poi
- 顶层字段：id, title, summary, destination, origin, startDate, endDate, userPrompt, days, xhsNotes, packingTips, warnings, generatedAt
- budget 对象必须包含 low 和 high 两个数字（单位人民币），如 {"low": 2000, "high": 3500, "currency": "CNY"}`,
        })

        for await (const chunk of result.textStream) {
          accumulated += chunk
          controller.enqueue(encoder.encode(chunk))
        }

        console.log(JSON.stringify({ event: 'synthesis-stream-done', planId, chars: accumulated.length, ms: Date.now() - synthT0 }))
        L.info('ai-response', { ms: Date.now() - synthT0, chars: accumulated.length, first200: accumulated.slice(0, 200), last200: accumulated.slice(-200) })

        // 流结束，解析 JSON 并写 DB
        let parsed = parseJSON<Record<string, unknown>>(accumulated)

        if (!parsed) {
          console.error(JSON.stringify({
            event: 'synthesis-parse-failed', planId,
            chars: accumulated.length,
            first500: accumulated.slice(0, 500),
            last500:  accumulated.slice(-500),
          }))
          L.error('parse-failed', { chars: accumulated.length, first500: accumulated.slice(0, 500), last500: accumulated.slice(-500), rawOutput: accumulated })
          throw new Error('JSON parse failed')
        }

        console.log(JSON.stringify({ event: 'synthesis-parse-ok', planId, title: parsed.title, days: Array.isArray(parsed.days) ? parsed.days.length : 0 }))
        L.info('parse-ok', { title: parsed.title as string, daysCount: Array.isArray(parsed.days) ? parsed.days.length : 0 })

        // 后置校验：修复 days 长度、日期连续性、重复景点
        parsed = validateAndRepairItinerary(parsed, startDate, days)
        console.log(JSON.stringify({ event: 'synthesis-validated', planId, days: (parsed.days as unknown[]).length }))
        L.info('validated', { daysCount: (parsed.days as unknown[]).length })

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
        console.log(JSON.stringify({ event: 'synthesis-saved', planId, ms: Date.now() - synthT0 }))
        L.info('done', { ms: Date.now() - synthT0, title: parsed.title as string, budgetLow, budgetHigh })

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error(JSON.stringify({ event: 'synthesis-error', planId, error: errMsg, ms: Date.now() - synthT0, rawChars: accumulated.length }))
        L.error('failed', { error: errMsg, ms: Date.now() - synthT0, rawChars: accumulated.length, rawOutput: accumulated || null })

        // 保存错误详情 + 原始 AI 输出到 DB，方便排查 JSON parse 失败
        const errProg = {
          ...updatedProgress,
          synthesis: {
            status:     'error',
            preview:    `Error: ${errMsg}`,
            raw_output: accumulated || null,              // 完整原始 AI 输出
            raw_length: accumulated.length,
            error_at:   new Date().toISOString(),
          },
        }
        await supabase.from('plans').update({
          status:          'error',
          agent_progress:  errProg,
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
