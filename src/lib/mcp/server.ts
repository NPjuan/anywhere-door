/* ============================================================
   MCP Server 工具定义
   暴露给外部 AI 模型的能力：
   - plan_quick     快速规划（仅需城市名+日期）
   - plan_guided    提问模式（引导用户补充信息）
   - get_plan       查询规划状态/结果
   - search_city    搜索城市（辅助）
   ============================================================ */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { POPULAR_CITIES, searchCities } from '@/lib/cities'

/* ── 内部工具：模糊匹配城市，返回最佳机场三字码 ────────────── */
function matchCity(query: string): { code: string; name: string; airport: string } | null {
  const results = searchCities(query)
  if (!results.length) return null
  const best = results[0]
  return { code: best.city.code, name: best.city.name, airport: best.city.airport ?? '' }
}

/* ── 内部工具：创建 pending plan 并触发规划 ─────────────────── */
async function triggerPlanning(params: {
  originCode:      string
  destinationCode: string
  startDate:       string
  endDate:         string
  prompt:          string
  deviceId:        string
}): Promise<{ planId: string; checkAfterSeconds: number }> {
  const { originCode, destinationCode, startDate, endDate, prompt, deviceId } = params

  const days = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  ) + 1

  const planId   = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const destCity = POPULAR_CITIES.find(c => c.code === destinationCode)?.name ?? destinationCode

  const { error: dbError } = await supabase.from('plans').insert({
    id:              planId,
    device_id:       deviceId,
    status:          'pending',
    title:           '规划中...',
    destination:     destCity,
    start_date:      startDate,
    end_date:        endDate,
    planning_params: { originCode, destinationCode, startDate, endDate, prompt, finalPrompt: prompt },
    ai_model:        'deepseek',
    saved_at:        new Date().toISOString(),
  })
  if (dbError) throw new Error(dbError.message)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://anywhere-door-bice.vercel.app'
  const res = await fetch(`${baseUrl}/api/agents/orchestrate-bg`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
    body: JSON.stringify({ planId, originCode, destinationCode, startDate, endDate, prompt }),
  })
  if (!res.ok) throw new Error(`触发规划失败: ${res.status}`)

  // 估算等待时间：天数越多越久，基准 90s
  const checkAfterSeconds = Math.min(60 + days * 15, 180)

  return { planId, checkAfterSeconds }
}

/* ── 统一的规划结果返回格式 ─────────────────────────────────── */
function planStartedResponse(planId: string, destName: string, checkAfterSeconds: number, baseUrl: string) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success:   true,
        planId,
        status:    'pending',
        message:   `✅ 规划已启动！目的地：${destName}`,
        nextStep:  `AI 正在并行处理多个规划任务，通常需要 ${Math.round(checkAfterSeconds / 60)} 分钟左右。`,
        tip:       `请等待约 ${checkAfterSeconds} 秒后，使用 get_plan 工具查询结果（传入 planId: "${planId}"）。`,
        viewUrl:   `${baseUrl}/plans/${planId}`,
      }, null, 2),
    }],
  }
}

/* ============================================================
   创建 MCP Server
   ============================================================ */
export function createMcpServer() {
  const server = new McpServer({
    name:        'anywhere-door',
    version:     '1.0.0',
    description: 'Anywhere Door — AI Travel Planner. Plan trips, search cities, query itineraries.',
  })

  /* ── Tool 1：快速规划（最简模式）──────────────────────────
     只需城市名 + 日期，自动匹配机场，立即开始规划
     适合：已经知道要去哪里，不想填写太多表单
  ─────────────────────────────────────────────────────────── */
  server.tool(
    'plan_quick',
    '【快速模式】只需出发城市、目的地城市和日期，立即触发 AI 旅行规划。城市名支持中英文，自动匹配机场。',
    {
      origin:      z.string().min(1).describe('出发城市名，如"上海"或"Shanghai"'),
      destination: z.string().min(1).describe('目的地城市名，如"东京"或"Tokyo"'),
      startDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('出发日期，格式 YYYY-MM-DD'),
      endDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('返回日期，格式 YYYY-MM-DD'),
      deviceId:    z.string().min(1).describe('用户设备 ID，用于保存行程'),
    },
    async ({ origin, destination, startDate, endDate, deviceId }) => {
      try {
        const originCity = matchCity(origin)
        const destCity   = matchCity(destination)

        if (!originCity) return {
          content: [{ type: 'text', text: `找不到出发城市"${origin}"，请尝试使用 search_city 工具确认城市名称。` }],
          isError: true,
        }
        if (!destCity) return {
          content: [{ type: 'text', text: `找不到目的地城市"${destination}"，请尝试使用 search_city 工具确认城市名称。` }],
          isError: true,
        }

        const start = new Date(startDate)
        const end   = new Date(endDate)
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
          return { content: [{ type: 'text', text: '日期无效，请确保 endDate >= startDate，格式为 YYYY-MM-DD。' }], isError: true }
        }

        const days   = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
        const prompt = `${originCity.name}出发，${destCity.name} ${days} 天旅行，希望体验当地特色文化和美食，行程安排轻松愉快。`

        const { planId, checkAfterSeconds } = await triggerPlanning({
          originCode: originCity.code, destinationCode: destCity.code,
          startDate, endDate, prompt, deviceId,
        })

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://anywhere-door-bice.vercel.app'
        return planStartedResponse(planId, destCity.name, checkAfterSeconds, baseUrl)
      } catch (err) {
        return { content: [{ type: 'text', text: `规划失败：${err instanceof Error ? err.message : String(err)}` }], isError: true }
      }
    }
  )

  /* ── Tool 2：提问模式（引导补充信息）──────────────────────
     目的地必填，其他都是可选。
     - 信息足够：直接触发规划
     - 信息不足：返回引导问题，让用户补充后再调用
  ─────────────────────────────────────────────────────────── */
  server.tool(
    'plan_guided',
    '【提问模式】引导用户逐步补充旅行信息。目的地必填，其他可选。信息不足时返回引导问题；信息齐全时立即触发规划。',
    {
      destination:  z.string().min(1).describe('目的地城市名（必填），如"京都"或"Kyoto"'),
      origin:       z.string().optional().describe('出发城市名（可选，不填则由用户补充）'),
      startDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('出发日期，格式 YYYY-MM-DD（可选）'),
      endDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('返回日期，格式 YYYY-MM-DD（可选）'),
      travelStyle:  z.string().optional().describe('旅行偏好，如"喜欢历史文化和美食，不喜欢购物"（可选）'),
      travelers:    z.number().int().min(1).max(20).optional().describe('出行人数（可选）'),
      deviceId:     z.string().min(1).describe('用户设备 ID'),
    },
    async ({ destination, origin, startDate, endDate, travelStyle, travelers, deviceId }) => {
      // 先匹配目的地
      const destCity = matchCity(destination)
      if (!destCity) {
        const similar = searchCities(destination).slice(0, 5)
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status:    'city_not_found',
              message:   `找不到城市"${destination}"`,
              question:  '请确认目的地城市名称，或从以下相似结果中选择：',
              suggestions: similar.map(r => ({ name: r.label, country: r.sub })),
            }),
          }],
        }
      }

      // 收集缺失信息
      const missing: string[] = []
      const questions: Record<string, string> = {}

      if (!origin) {
        missing.push('origin')
        questions['出发城市'] = '您从哪个城市出发？（例如：上海、北京）'
      }
      if (!startDate || !endDate) {
        missing.push('dates')
        questions['旅行日期'] = '您计划什么时候出发和返回？（格式：YYYY-MM-DD，例如：2026-05-01 至 2026-05-05）'
      }

      // 信息不足，返回引导问题
      if (missing.length > 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status:      'need_more_info',
              destination: destCity.name,
              message:     `好的，我来帮您规划${destCity.name}的行程！还需要了解以下信息：`,
              questions,
              tip:         '回答以上问题后，请再次调用 plan_guided 补充完整信息即可开始规划。',
              alreadyKnow: {
                destination: destCity.name,
                ...(travelStyle ? { travelStyle }  : {}),
                ...(travelers  ? { travelers }     : {}),
              },
            }),
          }],
        }
      }

      // 信息齐全，触发规划
      const originCity = matchCity(origin!)
      if (!originCity) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status:   'city_not_found',
              message:  `找不到出发城市"${origin}"`,
              question: '请确认出发城市名称，或使用 search_city 工具搜索。',
            }),
          }],
        }
      }

      const start = new Date(startDate!)
      const end   = new Date(endDate!)
      if (end < start) {
        return { content: [{ type: 'text', text: '返回日期不能早于出发日期，请检查日期。' }], isError: true }
      }

      const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1
      const styleDesc = travelStyle ?? '轻松愉快，体验当地特色'
      const travelersDesc = travelers && travelers > 1 ? `，共 ${travelers} 人出行` : ''
      const prompt = `${originCity.name}出发，${destCity.name} ${days} 天旅行${travelersDesc}。旅行偏好：${styleDesc}。`

      try {
        const { planId, checkAfterSeconds } = await triggerPlanning({
          originCode: originCity.code, destinationCode: destCity.code,
          startDate: startDate!, endDate: endDate!, prompt, deviceId,
        })
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://anywhere-door-bice.vercel.app'
        return planStartedResponse(planId, destCity.name, checkAfterSeconds, baseUrl)
      } catch (err) {
        return { content: [{ type: 'text', text: `规划失败：${err instanceof Error ? err.message : String(err)}` }], isError: true }
      }
    }
  )

  /* ── Tool 3：查询行程 ────────────────────────────────────── */
  server.tool(
    'get_plan',
    '根据 planId 查询规划状态或获取完整行程。规划通常需要 1-3 分钟，建议等待后再查询。',
    {
      planId: z.string().min(1).describe('行程 ID，由 plan_quick 或 plan_guided 返回'),
    },
    async ({ planId }) => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('id, status, title, summary, destination, start_date, end_date, days_count, budget_low, budget_high, itinerary, agent_progress')
          .eq('id', planId)
          .single()

        if (error || !data) {
          return { content: [{ type: 'text', text: `未找到行程：${planId}` }], isError: true }
        }

        if (data.status === 'pending') {
          const progress = data.agent_progress as Record<string, { status: string; preview: string }> | null
          const agentStatus = progress
            ? Object.entries(progress)
                .map(([k, v]) => `  ${k}: ${v.status}${v.preview ? ` — ${v.preview}` : ''}`)
                .join('\n')
            : '  进行中...'
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status:   'pending',
                planId,
                message:  '⏳ 规划仍在进行中，请稍后再查询。',
                progress: agentStatus,
                tip:      '通常需要 1-3 分钟，请等待后重试。',
              }, null, 2),
            }],
          }
        }

        if (data.status === 'error') {
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', planId, message: '规划失败，可重新调用 plan_quick 或 plan_guided 触发新的规划。' }) }],
            isError: true,
          }
        }

        // done：返回完整行程
        const itinerary = data.itinerary as Record<string, unknown> | null
        const days = Array.isArray(itinerary?.days)
          ? (itinerary!.days as Array<{ date: string; title: string; morning?: unknown[]; afternoon?: unknown[]; evening?: unknown[] }>)
          : []

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://anywhere-door-bice.vercel.app'

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status:      'done',
              planId:      data.id,
              title:       data.title,
              summary:     data.summary,
              destination: data.destination,
              startDate:   data.start_date,
              endDate:     data.end_date,
              daysCount:   data.days_count,
              budget:      { low: data.budget_low, high: data.budget_high, currency: 'CNY' },
              dayOverview: days.map(d => ({
                date:       d.date,
                title:      d.title,
                activities: [
                  ...(d.morning   ?? []),
                  ...(d.afternoon ?? []),
                  ...(d.evening   ?? []),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ].map((a: any) => a.name).filter(Boolean),
              })),
              viewUrl:     `${baseUrl}/plans/${data.id}`,
            }, null, 2),
          }],
        }
      } catch (err) {
        return { content: [{ type: 'text', text: `查询失败：${err instanceof Error ? err.message : String(err)}` }], isError: true }
      }
    }
  )

  /* ── Tool 4：搜索城市（辅助）────────────────────────────── */
  server.tool(
    'search_city',
    '搜索城市和机场代码。当 plan_quick/plan_guided 无法自动匹配城市时使用。',
    {
      query: z.string().min(1).describe('城市名（中文或英文），如"东京"或"osaka"'),
    },
    async ({ query }) => {
      const results = searchCities(query).slice(0, 8)
      if (!results.length) {
        return { content: [{ type: 'text', text: `未找到城市"${query}"，请尝试其他关键词。` }] }
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            results: results.map(r => ({
              name:    r.label,
              nameEn:  r.city.nameEn,
              code:    r.city.code,
              airport: r.city.airport,
              country: r.sub,
            })),
            tip: 'plan_quick 和 plan_guided 支持直接传城市名，无需手动查询代码。',
          }, null, 2),
        }],
      }
    }
  )

  return server
}
