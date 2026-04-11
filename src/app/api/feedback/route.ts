import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

/* ============================================================
   POST /api/feedback
   提交用户反馈，写入 feedbacks 表

   建表 SQL（首次部署前在 Supabase 执行）：
   create table feedbacks (
     id         bigserial    primary key,
     device_id  text         not null,
     contact    text,
     content    text         not null,
     created_at timestamptz  not null default now()
   );
   create index on feedbacks (created_at desc);
   ============================================================ */

export async function POST(req: NextRequest) {
  const body = await req.json()

  const schema = z.object({
    deviceId: z.string().min(1),
    contact:  z.string().max(200).optional().nullable(),
    content:  z.string().min(1, '反馈内容不能为空').max(2000, '反馈内容不超过 2000 字'),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? 'Invalid request'
    return NextResponse.json({ error: firstIssue }, { status: 400 })
  }

  const { deviceId, contact, content } = parsed.data

  const { error } = await supabase.from('feedbacks').insert({
    device_id: deviceId,
    contact:   contact?.trim() || null,
    content:   content.trim(),
  })

  if (error) {
    console.error('[feedback] insert error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
