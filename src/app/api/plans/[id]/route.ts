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

/**
 * 检查访问权限
 * @returns true 如果允许访问，false 否则
 */
function checkShareAccess(
  ownerDeviceId: string,
  currentDeviceId: string,
  shareEnabled: boolean | null,
  shareExpiresAt: string | null,
): boolean {
  // 所有者始终可以访问
  if (currentDeviceId === ownerDeviceId) return true

  // 访客：检查分享是否启用
  if (!shareEnabled) return false

  // 访客：检查是否已过期
  if (shareExpiresAt) {
    const expiresAt = new Date(shareExpiresAt)
    if (new Date() > expiresAt) return false
  }

  return true
}

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

  // Phase 1: Check share permissions
  // 从 header 读取 deviceId（服务端不能用 getDeviceId()，那是浏览器 localStorage API）
  const currentDeviceId = _req.headers.get('x-device-id') ?? ''
  const hasAccess = checkShareAccess(
    data.device_id,
    currentDeviceId,
    data.share_enabled ?? false,
    data.share_expires_at,
  )

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Access denied: Plan is not shared or sharing has expired' },
      { status: 403 },
    )
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
    shareEnabled,
    shareExpiresAt,
  } = body as {
    itinerary?: Record<string, unknown>
    status?: string
    agentProgress?: Record<string, unknown>
    shareEnabled?: boolean
    shareExpiresAt?: string | null
  }

  // Phase 1: Handle share settings update (owner only)
  if ((shareEnabled !== undefined || shareExpiresAt !== undefined) && !itinerary && !status) {
    // Verify owner
    const deviceId = req.nextUrl.searchParams.get('deviceId')
    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
    }

    const { data: plan, error: fetchError } = await supabase
      .from('plans')
      .select('device_id')
      .eq('id', id)
      .single()

    if (fetchError || !plan || plan.device_id !== deviceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const patch: Record<string, unknown> = {}
    if (shareEnabled !== undefined) patch.share_enabled = shareEnabled
    if (shareExpiresAt !== undefined) patch.share_expires_at = shareExpiresAt

    const { error } = await supabase.from('plans').update(patch).eq('id', id)
    if (error) {
      console.error('[PATCH /api/plans/[id] share]', error)
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
