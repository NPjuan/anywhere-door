'use client'

import type { XHSNote } from '@/lib/agents/types'

/* ============================================================
   XHSStyleNote — 小红书风格攻略笔记行列表
   Xiaohongshu-style travel note compact row
   ============================================================ */

interface XHSStyleNoteProps {
  note:  XHSNote
  index: number
}

const NOTE_TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  guide:   { label: '攻略', color: '#2563EB', bg: '#EFF6FF' },
  toplist: { label: '清单', color: '#7C3AED', bg: '#F5F3FF' },
  tips:    { label: '避坑', color: '#D97706', bg: '#FFFBEB' },
  review:  { label: '点评', color: '#059669', bg: '#ECFDF5' },
  diary:   { label: '日记', color: '#DB2777', bg: '#FDF2F8' },
}

export function XHSStyleNote({ note, index }: XHSStyleNoteProps) {
  const typeInfo = NOTE_TYPE_MAP[note.noteType] ?? NOTE_TYPE_MAP.guide
  const xhsUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(note.title)}`

  return (
    <a
      href={xhsUrl}
      target="_blank"
      rel="noopener noreferrer"
      key={index}
      className="flex items-center gap-3 no-underline"
      style={{
        background:   '#FFFFFF',
        border:       '1px solid #E5E7EB',
        borderRadius: 8,
        padding:      '12px 14px',
        transition:   'border-color 0.15s, background 0.15s',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = '#BFDBFE'
        el.style.background  = '#FAFEFF'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = '#E5E7EB'
        el.style.background  = '#FFFFFF'
      }}
    >
      {/* 左：类型徽章 */}
      <span
        className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded"
        style={{
          color:        typeInfo.color,
          background:   typeInfo.bg,
          whiteSpace:   'nowrap',
          fontSize:     11,
        }}
      >
        {typeInfo.label}
      </span>

      {/* 中：标题 */}
      <span
        className="flex-1 text-sm font-medium truncate"
        style={{ color: '#0F172A' }}
      >
        {note.title}
      </span>

      {/* 右：查看链接 */}
      <span
        className="shrink-0 text-xs"
        style={{ color: '#2563EB', whiteSpace: 'nowrap' }}
      >
        查看 →
      </span>
    </a>
  )
}
