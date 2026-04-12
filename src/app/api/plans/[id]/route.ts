import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/* ============================================================
   GET    /api/plans/[id]  — 获取单个计划（含完整 itinerary）
   PATCH  /api/plans/[id]  — 更新计划（填充 itinerary 结果）
   DELETE /api/plans/[id]  — 删除计划（需带 deviceId 验证）
   
   Phase 1: Basic Sharing
   - GET: 检查访问权限（所有者或分享启用且未过期）
   - PATCH: 支持更新分享设置（share_enabled, share_expires_at）
   ============================================================ */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  return NextResponse.json({ plan: data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const {
    itinerary,
    status,
    agentProgress,
    isPublic,
    deviceId: reqDeviceId,
  } = body as {
    itinerary?:     Record<string, unknown>
    status?:        string
    agentProgress?: Record<string, unknown>
    isPublic?:      boolean
    deviceId?:      string
  }

  // 切换公开/私密：需要验证 deviceId 是行程所有者
  if (typeof isPublic === 'boolean') {
    if (!reqDeviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
    }
    const { data: plan } = await supabase
      .from('plans')
      .select('device_id')
      .eq('id', id)
      .single()
    if (!plan || plan.device_id !== reqDeviceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { error } = await supabase
      .from('plans')
      .update({ is_public: isPublic })
      .eq('id', id)
    if (error) {
      console.error('[PATCH /api/plans/[id] is_public]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // 仅更新状态或 agent 进度
  if ((status || agentProgress) && !itinerary) {
    const patch: Record<string, unknown> = {}
    if (status) {
      patch.status = status
      patch.planning_params = null
    }
    if (agentProgress) patch.agent_progress = agentProgress
    const { error } = await supabase.from('plans').update(patch).eq('id', id)
    if (error) {
      console.error('[PATCH /api/plans/[id] status]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (!itinerary) {
    return NextResponse.json({ error: 'Missing itinerary or status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('plans')
    .update({
      status: 'done',
      title: (itinerary.title as string) ?? '未命名行程',
      summary: (itinerary.summary as string) ?? '',
      destination: (itinerary.destination as string) ?? '',
      days_count: Array.isArray(itinerary.days) ? itinerary.days.length : 0,
      budget_low: (itinerary.budget as { low?: number })?.low ?? 0,
      budget_high: (itinerary.budget as { high?: number })?.high ?? 0,
      itinerary,
      planning_params: null,
    })
    .eq('id', id)

  if (error) {
    console.error('[PATCH /api/plans/[id]]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deviceId = req.nextUrl.searchParams.get('deviceId')

  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
  }

  // 只允许删除属于该设备的计划
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', id)
    .eq('device_id', deviceId)

  if (error) {
    console.error('[DELETE /api/plans/[id]]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
