import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { streamText } from 'ai'
import { getAIProvider, getModelConfig } from '@/lib/agents/utils'
import type { AIProvider } from '@/lib/agents/utils'
import { parseJSON } from '@/lib/utils/jsonParse'
import { createLogger } from '@/lib/logger'

/* ============================================================
   POST /api/plans/[id]/replan-day
   单日重新规划：AI 重新生成指定天的行程，其余天不变
   Body: { dayIndex: number, deviceId: string, feedback?: string }

   改用 streamText + 手动 JSON parse（与 synthesis 一致），
   避免 generateObject 的 schema 严格校验导致海外行程频繁失败。
   ============================================================ */

export const maxDuration = 120

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { dayIndex?: number; deviceId?: string; feedback?: string }
  const { dayIndex, deviceId, feedback } = body

  if (dayIndex === undefined || !deviceId) {
    return NextResponse.json({ error: 'dayIndex and deviceId required' }, { status: 400 })
  }

  const L = createLogger({ deviceId, planId: id, flow: 'replan-day' })
  L.info('start', { dayIndex, feedback: feedback || null })

  // 读取计划
  const { data, error } = await supabase
    .from('plans')
    .select('id, device_id, itinerary, ai_model')
    .eq('id', id)
    .single()

  if (error || !data) {
    L.warn('plan-not-found', { error: error?.message })
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }
  if (data.device_id !== deviceId) {
    L.warn('forbidden', { ownerDeviceId: data.device_id })
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const itinerary = data.itinerary as Record<string, unknown>
  const days = (itinerary?.days as Array<Record<string, unknown>>) ?? []

  if (dayIndex < 0 || dayIndex >= days.length) {
    return NextResponse.json({ error: 'Invalid dayIndex' }, { status: 400 })
  }

  const targetDay = days[dayIndex]
  const destination = (itinerary?.destination as string) ?? ''
  const title = (itinerary?.title as string) ?? ''
  const userPrompt = (itinerary?.userPrompt as string) ?? ''
  const savedModel = ((data.ai_model as AIProvider | undefined) ?? 'deepseek-flash') as AIProvider

  // 其他天的活动名（用于避免重复推荐）
  const otherDayPOIs = days
    .filter((_, i) => i !== dayIndex)
    .flatMap(d => {
      const acts = [
        ...((d.morning   as Array<Record<string, unknown>>) ?? []),
        ...((d.afternoon as Array<Record<string, unknown>>) ?? []),
        ...((d.evening   as Array<Record<string, unknown>>) ?? []),
      ]
      return acts.map(a => (a.name as string) ?? '').filter(Boolean)
    })
    .join('、')

  // 收集当天已有的 POI 坐标，供 AI 参考
  const currentActs = [
    ...((targetDay.morning   as Array<Record<string, unknown>>) ?? []),
    ...((targetDay.afternoon as Array<Record<string, unknown>>) ?? []),
    ...((targetDay.evening   as Array<Record<string, unknown>>) ?? []),
  ]
  const currentPOIInfo = currentActs
    .filter(a => a.poi)
    .map(a => {
      const poi = a.poi as Record<string, unknown>
      return `${poi.name}（${(poi.latLng as Record<string, number>)?.lat ?? '?'},${(poi.latLng as Record<string, number>)?.lng ?? '?'}）`
    })
    .join('、')

  const systemPrompt = `你是专业旅行路线规划师。现在需要重新规划一个行程中某一天的安排。

要求：
- 地理聚类优先：同天景点直线距离尽量 <5km
- 每个地点只能在整个行程中出现一次，以下景点已在其他天安排，本次不得重复：${otherDayPOIs || '无'}
- 正常游览天每天安排 3-5 个活动，合理安排上午/下午/晚上
- 起一个体现当日区域特色的中文标题
- 注明活动时长、建议花费和前往交通方式
- transport 字段必须具体（如"地铁X号线至XX站，步行5分钟"）
- 每个涉及实际地点的活动必须输出 poi 字段，包含 id/name/address/category/latLng
- 输出纯 JSON，不加 markdown 代码块，第一个字符必须是 {

输出格式（严格遵守）：
{
  "day": 数字,
  "date": "YYYY-MM-DD",
  "title": "中文标题",
  "morning": [活动对象...],
  "afternoon": [活动对象...],
  "evening": [活动对象...]
}
活动对象：{ "time": "HH:mm", "name": "名称", "description": "描述", "duration": "时长", "cost": "费用(可选)", "transport": "交通(可选)", "poi": { "id": "唯一id", "name": "名称", "address": "地址", "category": "类型", "latLng": { "lat": 纬度, "lng": 经度 } } }`

  const userMessage = `请重新规划以下行程的第 ${dayIndex + 1} 天：

行程名称：${title}
目的地：${destination}
用户诉求：${userPrompt}
当天日期：${(targetDay.date as string) ?? ''}
当天原标题：${(targetDay.title as string) ?? ''}
当天原有景点参考（含坐标）：${currentPOIInfo || '无'}

${feedback ? `用户反馈（请优先参考）：${feedback}` : '请生成一个全新的、与原来不同的安排，让用户体验不同景点和风格。'}

输出该天的 DayPlan JSON 对象（day=${dayIndex + 1}，date="${(targetDay.date as string) ?? ''}"）：`

  try {
    const cfg = getModelConfig(savedModel)
    L.info('ai-call', {
      model: savedModel,
      temperature: cfg.temperature,
      ...(cfg.maxOutputTokens ? { maxOutputTokens: cfg.maxOutputTokens } : {}),
      otherDayPOICount: otherDayPOIs.split('、').filter(Boolean).length,
      currentPOICount: currentActs.length,
      promptLength: userMessage.length,
    })

    const t0 = Date.now()
    const result = streamText({
      model:           getAIProvider(savedModel),
      temperature:     cfg.temperature,
      ...(cfg.maxOutputTokens ? { maxOutputTokens: cfg.maxOutputTokens } : {}),
      system:          systemPrompt,
      prompt:          userMessage,
    })

    let accumulated = ''
    for await (const chunk of result.textStream) {
      accumulated += chunk
    }

    const aiMs = Date.now() - t0
    L.info('ai-response', {
      ms: aiMs,
      chars: accumulated.length,
      first200: accumulated.slice(0, 200),
      last200: accumulated.slice(-200),
    })

    const parsed = parseJSON<Record<string, unknown>>(accumulated)
    if (!parsed) {
      L.error('parse-failed', {
        chars: accumulated.length,
        first500: accumulated.slice(0, 500),
        last500:  accumulated.slice(-500),
        rawOutput: accumulated,
      })
      return NextResponse.json({ error: 'AI output parse failed', raw_preview: accumulated.slice(0, 300) }, { status: 500 })
    }

    L.info('parse-ok', {
      title: parsed.title,
      morningCount:   Array.isArray(parsed.morning)   ? parsed.morning.length   : 0,
      afternoonCount: Array.isArray(parsed.afternoon) ? parsed.afternoon.length : 0,
      eveningCount:   Array.isArray(parsed.evening)   ? parsed.evening.length   : 0,
    })

    // 强制回填 day 和 date
    parsed.day  = (targetDay.day  as number) ?? dayIndex + 1
    parsed.date = (targetDay.date as string) ?? ''

    // 确保 morning/afternoon/evening 是数组
    if (!Array.isArray(parsed.morning))   parsed.morning   = []
    if (!Array.isArray(parsed.afternoon)) parsed.afternoon = []
    if (!Array.isArray(parsed.evening))   parsed.evening   = []

    // 替换对应天
    const newDays = [...days]
    newDays[dayIndex] = parsed
    const newItinerary = { ...itinerary, days: newDays }

    // 写回数据库
    const { error: updateError } = await supabase
      .from('plans')
      .update({ itinerary: newItinerary })
      .eq('id', id)

    if (updateError) {
      L.error('db-update-failed', { error: updateError.message })
      throw updateError
    }

    L.info('done', { dayIndex, newTitle: parsed.title })
    return NextResponse.json({ day: parsed, dayIndex })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    L.error('failed', { error: errMsg, stack: err instanceof Error ? err.stack : undefined })
    return NextResponse.json({ error: 'Replan failed' }, { status: 500 })
  }
}
