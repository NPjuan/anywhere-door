/* ============================================================
   MCP Server 工具定义
   暴露给外部 AI 模型的能力：规划行程、获取已有行程
   ============================================================ */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { POPULAR_CITIES } from '@/lib/cities'

export function createMcpServer() {
  const server = new McpServer({
    name:        'anywhere-door',
    version:     '1.0.0',
    description: '任意门 AI 旅行规划服务 — 规划行程、查询已有行程',
  })

  /* ── Tool 1：规划行程 ────────────────────────────────────── */
  server.tool(
    'plan_trip',
    '根据出发地、目的地、日期和诉求，触发 AI 旅行规划，返回 planId 供后续查询',
    {
      originCode:      z.string().length(3).describe('出发地机场三字码，如 PVG（上海浦东）'),
      destinationCode: z.string().length(3).describe('目的地机场三字码，如 NRT（东京成田）'),
      startDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('出发日期，格式 YYYY-MM-DD'),
      endDate:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('返回日期，格式 YYYY-MM-DD'),
      prompt:          z.string().max(500).describe('旅行诉求，如"喜欢美食和历史文化，预算适中"'),
      deviceId:        z.string().min(1).describe('用户设备 ID，用于保存行程'),
    },
    async ({ originCode, destinationCode, startDate, endDate, prompt, deviceId }) => {
      try {
        // 验证城市是否存在
        const origin      = POPULAR_CITIES.find(c => c.code === originCode)
        const destination = POPULAR_CITIES.find(c => c.code === destinationCode)
        if (!origin)      return { content: [{ type: 'text', text: `未知出发地机场代码：${originCode}` }], isError: true }
        if (!destination) return { content: [{ type: 'text', text: `未知目的地机场代码：${destinationCode}` }], isError: true }

        // 验证日期
        const start = new Date(startDate)
        const end   = new Date(endDate)
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
          return { content: [{ type: 'text', text: '日期无效，请确保 endDate >= startDate' }], isError: true }
        }

        const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1

        // 创建 pending plan 记录
        const planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const { error: dbError } = await supabase.from('plans').insert({
          id:              planId,
          device_id:       deviceId,
          status:          'pending',
          title:           '规划中...',
          destination:     destination.name,
          start_date:      startDate,
          end_date:        endDate,
          planning_params: { originCode, destinationCode, startDate, endDate, prompt, finalPrompt: prompt },
          ai_model:        'deepseek',
          saved_at:        new Date().toISOString(),
        })
        if (dbError) throw new Error(dbError.message)

        // 触发后台规划
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const res = await fetch(`${baseUrl}/api/agents/orchestrate-bg`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
          body: JSON.stringify({ planId, originCode, destinationCode, startDate, endDate, prompt }),
        })
        if (!res.ok) throw new Error(`触发规划失败: ${res.status}`)

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              planId,
              message: `规划已启动，约需 1-3 分钟完成。目的地：${destination.name}，${days}天。使用 get_plan 工具查询结果。`,
              checkUrl: `${baseUrl}/plans/${planId}`,
            }),
          }],
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { content: [{ type: 'text', text: `规划失败：${msg}` }], isError: true }
      }
    }
  )

  /* ── Tool 2：获取已有行程 ────────────────────────────────── */
  server.tool(
    'get_plan',
    '根据 planId 获取行程详情或规划状态',
    {
      planId: z.string().min(1).describe('行程 ID，由 plan_trip 返回'),
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
          // 返回进度信息
          const progress = data.agent_progress as Record<string, { status: string; preview: string }> | null
          const progressSummary = progress
            ? Object.entries(progress).map(([k, v]) => `${k}: ${v.status}${v.preview ? ` (${v.preview})` : ''}`).join(', ')
            : '进行中...'
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ status: 'pending', planId, progress: progressSummary, message: '规划仍在进行中，请稍后再查询' }),
            }],
          }
        }

        if (data.status === 'error') {
          return {
            content: [{ type: 'text', text: JSON.stringify({ status: 'error', planId, message: '规划失败，请重新触发' }) }],
            isError: true,
          }
        }

        // done：返回完整行程摘要（不返回完整 itinerary JSON 避免超长）
        const itinerary = data.itinerary as Record<string, unknown> | null
        const days = Array.isArray(itinerary?.days) ? itinerary!.days as Array<{ date: string; title: string }> : []

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
              dayTitles:   days.map(d => `${d.date}: ${d.title}`),
              fullItinerary: itinerary,
            }, null, 2),
          }],
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        return { content: [{ type: 'text', text: `查询失败：${msg}` }], isError: true }
      }
    }
  )

  /* ── Tool 3：搜索城市（辅助工具）────────────────────────── */
  server.tool(
    'search_city',
    '搜索城市和机场，获取三字码。规划行程前可用此工具确认城市代码',
    {
      query: z.string().min(1).describe('城市名（中文或英文），如"东京"或"tokyo"'),
    },
    async ({ query }) => {
      const q = query.toLowerCase().trim()
      const results = POPULAR_CITIES
        .filter(c => c.name.includes(query) || c.nameEn.toLowerCase().includes(q))
        .slice(0, 10)
        .map(c => ({ code: c.code, name: c.name, nameEn: c.nameEn, airport: c.airport, country: c.country }))

      if (!results.length) {
        return { content: [{ type: 'text', text: `未找到城市"${query}"，请尝试其他关键词` }] }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ results, tip: '使用 code 字段作为 plan_trip 的 originCode/destinationCode' }),
        }],
      }
    }
  )

  return server
}
