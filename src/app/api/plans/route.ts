import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

/* ============================================================
   GET  /api/plans?deviceId=xxx   — 按设备查询计划列表
   POST /api/plans                — 创建计划（pending 或完整）

   Supabase 表结构（如需新建，执行以下 SQL）:

   create table plans (
     id               text        primary key,
     device_id        text        not null,
     status           text        not null default 'done',  -- 'pending' | 'done' | 'error' | 'interrupted'
     title            text        not null,
     summary          text,
     destination      text,
     start_date       text,
     end_date         text,
     days_count       int,
     budget_low       numeric,
     budget_high      numeric,
     itinerary        jsonb,
     planning_params  jsonb,      -- 用于刷新恢复规划
     agent_progress   jsonb,      -- 各 Agent 实时状态（poi/route/tips/xhs/synthesis）
     saved_at         timestamptz not null default now()
   );

   -- 如果表已存在，添加新列：
   alter table plans add column if not exists status text not null default 'done';
   alter table plans add column if not exists planning_params jsonb;
   alter table plans add column if not exists agent_progress jsonb;

   create index on plans (device_id);
   create index on plans (saved_at desc);
   ============================================================ */

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('deviceId')
  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
  }

  const page   = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1', 10))
  const limit  = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10)))
  const search = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const from   = (page - 1) * limit
  const to     = from + limit - 1

  let query = supabase
    .from('plans')
    .select('id, status, title, summary, destination, start_date, end_date, days_count, budget_low, budget_high, saved_at', { count: 'exact' })
    .eq('device_id', deviceId)
    .order('saved_at', { ascending: false })
    .range(from, to)

  // 模糊搜索：匹配目的地或标题
  if (search) {
    query = query.or(`destination.ilike.%${search}%,title.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[GET /api/plans]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    plans: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const schema = z.object({
    deviceId:       z.string().min(1),
    itinerary:      z.record(z.string(), z.unknown()).optional(),
    planningParams: z.record(z.string(), z.unknown()).optional(),
    status:         z.enum(['pending', 'done', 'error', 'interrupted']).optional(),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 })
  }

  const { deviceId, itinerary, planningParams, status } = parsed.data

  const id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const planStatus = status ?? (itinerary ? 'done' : 'pending')

  const { error } = await supabase.from('plans').insert({
    id,
    device_id:       deviceId,
    status:          planStatus,
    title:           (itinerary?.title as string)       ?? '规划中...',
    summary:         (itinerary?.summary as string)     ?? '',
    destination:     (itinerary?.destination as string) ?? (planningParams?.destinationCode as string) ?? '',
    start_date:      (itinerary?.startDate as string)   ?? (planningParams?.startDate as string) ?? '',
    end_date:        (itinerary?.endDate as string)     ?? (planningParams?.endDate as string) ?? '',
    days_count:      Array.isArray(itinerary?.days) ? itinerary!.days.length : 0,
    budget_low:      (itinerary?.budget as { low?: number })?.low  ?? 0,
    budget_high:     (itinerary?.budget as { high?: number })?.high ?? 0,
    itinerary:       itinerary ?? null,
    planning_params: planningParams ?? null,
    saved_at:        new Date().toISOString(),
    current_version: 1,
  })

  if (error) {
    console.error('[POST /api/plans]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Phase 2: Create initial version if itinerary is provided
  if (itinerary && planStatus === 'done') {
    const { error: versionError } = await supabase.from('plan_versions').insert({
      plan_id: id,
      version_number: 1,
      itinerary,
      change_type: 'initial',
      change_description: '初始版本',
    })

    if (versionError) {
      console.error('[POST /api/plans] create initial version', versionError)
      // 不中断主流程，版本创建失败仅记录日志
    }
  }

  return NextResponse.json({ id }, { status: 201 })
}
