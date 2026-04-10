import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/* ============================================================
   POST /api/feedback
   提交用户反馈，写入 feedbacks 表

   建表 SQL（首次部署前在 Supabase 执行）：
   create table feedbacks (
     id         bigserial    primary key,
     device_id  text         not null,
     email      text,
     content    text         not null,
     created_at timestamptz  not null default now()
   );
   create index on feedbacks (created_at desc);
   ============================================================ */

export async function POST(req: NextRequest) {
  const { deviceId, email, content } = await req.json()

  if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'Missing content' }, { status: 400 })

  const { error } = await supabase.from('feedbacks').insert({
    device_id: deviceId,
    email:     email?.trim() || null,
    content:   content.trim(),
  })

  if (error) {
    console.error('[feedback] insert error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
