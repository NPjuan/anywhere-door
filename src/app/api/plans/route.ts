import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/* ============================================================
   GET  /api/plans?deviceId=xxx   — 按设备查询计划列表
   POST /api/plans                — 创建计划（pending 或完整）

   Supabase 表结构（如需新建，执行以下 SQL）:

   create table plans (
     id               text        primary key,
     device_id        text        not null,
     status           text        not null default 'done',  -- 'pending' | 'done' | 'error'
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
     saved_at         timestamptz not null default now()
   );

   -- 如果表已存在，添加新列：
   alter table plans add column if not exists status text not null default 'done';
   alter table plans add column if not exists planning_params jsonb;

   create index on plans (device_id);
   create index on plans (saved_at desc);
   ============================================================ */

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('deviceId')
  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
  }

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10)))
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  // 同时查总数和当前页数据
  const { data, error, count } = await supabase
    .from('plans')
    .select('id, status, title, summary, destination, start_date, end_date, days_count, budget_low, budget_high, saved_at', { count: 'exact' })
    .eq('device_id', deviceId)
    .order('saved_at', { ascending: false })
    .range(from, to)

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
  const { deviceId, itinerary, planningParams, status } = body as {
    deviceId:       string
    itinerary?:     Record<string, unknown>
    planningParams?: Record<string, unknown>
    status?:        string
  }

  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
  }

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
  })

  if (error) {
    console.error('[POST /api/plans]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id }, { status: 201 })
}
