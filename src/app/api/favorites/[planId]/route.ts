import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/* ============================================================
   DELETE /api/favorites/[planId]?deviceId=xxx — 取消收藏
   ============================================================ */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params
  const deviceId = req.nextUrl.searchParams.get('deviceId')

  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
  }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('device_id', deviceId)
    .eq('plan_id', planId)

  if (error) {
    console.error('[DELETE /api/favorites/[planId]]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
