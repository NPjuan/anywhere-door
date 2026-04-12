import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

/* ============================================================
   POST   /api/favorites         — 收藏行程
   GET    /api/favorites?deviceId=xxx  — 查询收藏列表（带行程摘要）

   建表 SQL：
   create table favorites (
     id        bigserial    primary key,
     device_id text         not null,
     plan_id   text         not null references plans(id) on delete cascade,
     saved_at  timestamptz  not null default now(),
     unique (device_id, plan_id)
   );
   create index on favorites (device_id);
   create index on favorites (plan_id);
   ============================================================ */

export async function POST(req: NextRequest) {
  const body = await req.json()

  const schema = z.object({
    deviceId: z.string().min(1),
    planId:   z.string().min(1),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const { deviceId, planId } = parsed.data

  // 验证行程存在且是公开的
  const { data: plan } = await supabase
    .from('plans')
    .select('id, is_public, device_id')
    .eq('id', planId)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }
  if (!plan.is_public && plan.device_id !== deviceId) {
    return NextResponse.json({ error: 'Plan is not public' }, { status: 403 })
  }

  const { error } = await supabase.from('favorites').insert({ device_id: deviceId, plan_id: planId })
  if (error) {
    // 唯一约束冲突 = 已收藏，幂等处理
    if (error.code === '23505') return NextResponse.json({ ok: true, alreadyFavorited: true })
    console.error('[POST /api/favorites]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('deviceId')
  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
  }

  const page  = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '6', 10)))
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  const { data, error, count } = await supabase
    .from('favorites')
    .select(`
      id,
      saved_at,
      plan:plans (
        id, title, summary, destination, start_date, end_date, days_count,
        budget_low, budget_high, is_public, device_id
      )
    `, { count: 'exact' })
    .eq('device_id', deviceId)
    .order('saved_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[GET /api/favorites]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    favorites: data ?? [],
    total:      count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}
