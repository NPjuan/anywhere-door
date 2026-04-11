import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/deviceId'

/* ============================================================
   POST /api/plans/[id]/revert  — 回滚到指定版本
   ============================================================ */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await req.json()
  const { versionNumber } = body as { versionNumber: number }

  if (!versionNumber) {
    return NextResponse.json({ error: 'Missing versionNumber' }, { status: 400 })
  }

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

  // 获取目标版本
  const { data: targetVersion, error: versionError } = await supabase
    .from('plan_versions')
    .select('itinerary')
    .eq('plan_id', id)
    .eq('version_number', versionNumber)
    .single()

  if (versionError || !targetVersion) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 })
  }

  const itinerary = targetVersion.itinerary
  const nextVersionNumber = versionNumber + 1

  // 创建回滚版本快照
  const { error: newVersionError } = await supabase.from('plan_versions').insert({
    plan_id: id,
    version_number: nextVersionNumber,
    itinerary,
    change_type: 'manual_edit',
    change_description: `Reverted from version ${versionNumber}`,
  })

  if (newVersionError) {
    console.error('[POST /api/plans/[id]/revert] insert', newVersionError)
    return NextResponse.json({ error: newVersionError.message }, { status: 500 })
  }

  // 更新 plans 表
  const { error: updateError } = await supabase
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
      current_version: nextVersionNumber,
    })
    .eq('id', id)

  if (updateError) {
    console.error('[POST /api/plans/[id]/revert] update', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ versionNumber: nextVersionNumber })
}
