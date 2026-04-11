import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/deviceId'
import type { FullItinerary } from '@/lib/agents/types'

/* ============================================================
   GET    /api/plans/[id]/versions  — 获取版本历史
   POST   /api/plans/[id]/versions  — 创建新版本（自动）
   ============================================================ */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const currentDeviceId = getDeviceId()

  // 验证所有权
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('device_id')
    .eq('id', id)
    .single()

  if (planError || !plan || plan.device_id !== currentDeviceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // 获取所有版本
  const { data: versions, error } = await supabase
    .from('plan_versions')
    .select('*')
    .eq('plan_id', id)
    .order('version_number', { ascending: false })

  if (error) {
    console.error('[GET /api/plans/[id]/versions]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ versions: versions ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const {
    itinerary,
    changeType = 'manual_edit',
    changeDescription,
    userFeedback,
  } = body as {
    itinerary: FullItinerary
    changeType?: 'initial' | 'refine' | 'manual_edit'
    changeDescription?: string
    userFeedback?: string
  }

  if (!itinerary) {
    return NextResponse.json({ error: 'Missing itinerary' }, { status: 400 })
  }

  const currentDeviceId = getDeviceId()

  // 验证所有权
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('device_id, current_version')
    .eq('id', id)
    .single()

  if (planError || !plan || plan.device_id !== currentDeviceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const nextVersion = (plan.current_version ?? 0) + 1

  // 创建新版本
  const { error: versionError } = await supabase.from('plan_versions').insert({
    plan_id: id,
    version_number: nextVersion,
    itinerary,
    change_type: changeType,
    change_description: changeDescription,
    user_feedback: userFeedback,
  })

  if (versionError) {
    console.error('[POST /api/plans/[id]/versions]', versionError)
    return NextResponse.json({ error: versionError.message }, { status: 500 })
  }

  // 更新 plans 表的 current_version
  const { error: updateError } = await supabase
    .from('plans')
    .update({ current_version: nextVersion })
    .eq('id', id)

  if (updateError) {
    console.error('[POST /api/plans/[id]/versions] update', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ versionNumber: nextVersion }, { status: 201 })
}
