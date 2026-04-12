import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateObject } from 'ai'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { z } from 'zod'
import { DayPlanSchema } from '@/lib/agents/types'

/* ============================================================
   POST /api/plans/[id]/replan-day
   单日重新规划：AI 重新生成指定天的行程，其余天不变
   Body: { dayIndex: number, deviceId: string, feedback?: string }
   ============================================================ */

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY ?? '' })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json() as { dayIndex?: number; deviceId?: string; feedback?: string }
  const { dayIndex, deviceId, feedback } = body

  if (dayIndex === undefined || !deviceId) {
    return NextResponse.json({ error: 'dayIndex and deviceId required' }, { status: 400 })
  }

  // 读取计划
  const { data, error } = await supabase
    .from('plans')
    .select('id, device_id, itinerary')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }
  if (data.device_id !== deviceId) {
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

  // 其他天的活动（用于避免重复推荐）
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

  const systemPrompt = `你是专业旅行路线规划师，擅长将地点按最优路线组织成每日行程。

要求：
- 地理聚类优先：同天景点直线距离尽量 <5km，按区域/街区逻辑聚类
- 每个地点只能在整个行程中出现一次，以下景点已在其他天安排，本次不得重复：${otherDayPOIs || '无'}
- 正常游览天每天安排 3-5 个活动，合理安排上午/下午/晚上
- 每天起一个体现当日区域特色的中文标题
- 注明活动时长、建议花费和前往交通方式
- transport 字段必须具体（如"地铁X号线至XX站，步行5分钟"）
- 输出符合 schema 的 JSON，全程中文`

  const userMessage = `请重新规划以下行程的第 ${dayIndex + 1} 天（${(targetDay.date as string) ?? ''}）：

行程名称：${title}
目的地：${destination}
用户诉求：${userPrompt}
当天原标题：${(targetDay.title as string) ?? ''}
当天日期：${(targetDay.date as string) ?? ''}

${feedback ? `用户反馈（请优先参考）：${feedback}` : '请生成一个全新的、与原来不同的安排，让用户体验不同景点和风格。'}`

  try {
    const { object: newDay } = await generateObject({
      model: deepseek('deepseek-chat'),
      schema: DayPlanSchema,
      system: systemPrompt,
      prompt: userMessage,
    })

    // 替换对应天
    const newDays = [...days]
    newDays[dayIndex] = { ...newDay, day: (targetDay.day as number) ?? dayIndex + 1, date: (targetDay.date as string) ?? '' }
    const newItinerary = { ...itinerary, days: newDays }

    // 写回数据库
    const { error: updateError } = await supabase
      .from('plans')
      .update({ itinerary: newItinerary })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({ day: newDays[dayIndex], dayIndex })
  } catch (err) {
    console.error('[replan-day]', err)
    return NextResponse.json({ error: 'Replan failed' }, { status: 500 })
  }
}
