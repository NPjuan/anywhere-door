'use client'

import { Copy, CheckCircle, Link, Download, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { FullItinerary } from '@/lib/agents/types'
import { useItineraryStore } from '@/lib/stores/itineraryStore'
import { downloadDayAsImage, downloadAllDays } from '@/lib/itineraryCanvas'

interface ExportButtonProps {
  itinerary: FullItinerary
}

const BTN: React.CSSProperties = {
  background:   '#FFFFFF',
  border:       '1px solid #E2E8F0',
  color:        '#64748B',
  padding:      '7px 14px',
  borderRadius: 8,
  fontSize:     13,
  fontWeight:   500,
  display:      'flex',
  alignItems:   'center',
  gap:          6,
  cursor:       'pointer',
  whiteSpace:   'nowrap',
  transition:   'background 0.15s',
}

export function ExportButton({ itinerary }: ExportButtonProps) {
  const [copied,      setCopied]      = useState(false)
  const [linkCopied,  setLinkCopied]  = useState(false)
  const [showDl,      setShowDl]      = useState(false)
  const [downloading, setDownloading] = useState(false)
  const dlRef  = useRef<HTMLDivElement>(null)
  const planId     = useItineraryStore((s) => s.planId)
  const activeDay  = useItineraryStore((s) => s.activeDay)
  const setActiveDay = useItineraryStore((s) => s.setActiveDay)

  /* 关闭下拉 */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dlRef.current?.contains(e.target as Node)) setShowDl(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatItineraryText(itinerary))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* 静默 */ }
  }

  const handleShare = async () => {
    if (!planId) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/plans/${planId}`)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch { /* 静默 */ }
  }

  const handleDownloadDay = async (dayIndex: number) => {
    setShowDl(false)
    setDownloading(true)
    try {
      await downloadDayAsImage(itinerary, itinerary.days[dayIndex], dayIndex, setActiveDay, activeDay)
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadAll = async () => {
    setShowDl(false)
    setDownloading(true)
    try {
      await downloadAllDays(itinerary, setActiveDay, activeDay)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* 复制文本 */}
      <button onClick={handleCopy} style={{ ...BTN, background: copied ? '#F0FDF4' : '#FFFFFF', border: `1px solid ${copied ? '#BBF7D0' : '#E2E8F0'}`, color: copied ? '#16A34A' : '#64748B' }}>
        {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
        复制行程
      </button>

      {/* 分享链接 */}
      <button onClick={handleShare} disabled={!planId} title={planId ? '复制分享链接' : '计划保存后可分享'}
        style={{ ...BTN, background: linkCopied ? '#F0FDF4' : '#FFFFFF', border: `1px solid ${linkCopied ? '#BBF7D0' : '#E2E8F0'}`, color: linkCopied ? '#16A34A' : (!planId ? '#CBD5E1' : '#64748B'), cursor: planId ? 'pointer' : 'not-allowed' }}>
        {linkCopied ? <CheckCircle size={13} /> : <Link size={13} />}
        分享链接
      </button>

      {/* 下载图片 */}
      <div ref={dlRef} className="relative">
        <button
          onClick={() => !downloading && setShowDl((v) => !v)}
          disabled={downloading}
          style={{ ...BTN, background: showDl ? '#EFF6FF' : '#FFFFFF', border: `1px solid ${showDl ? '#BFDBFE' : '#E2E8F0'}`, color: showDl ? '#2563EB' : '#64748B', opacity: downloading ? 0.7 : 1, cursor: downloading ? 'not-allowed' : 'pointer' }}
        >
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {downloading ? '生成中...' : '下载攻略'}
        </button>

        {showDl && (
          <div
            className="absolute right-0 z-50 rounded-lg overflow-hidden"
            style={{ top: '100%', marginTop: 6, minWidth: 200, background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
          >
            <button onClick={handleDownloadAll}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50"
              style={{ color: '#0F172A', borderBottom: '1px solid #F3F4F6' }}>
              <Download size={13} style={{ color: '#2563EB' }} />
              下载全部（{itinerary.days.length} 天）
            </button>

            {itinerary.days.map((day, i) => (
              <button key={day.day} onClick={() => handleDownloadDay(i)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50"
                style={{ color: '#374151', borderBottom: i < itinerary.days.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  Day {day.day}
                </span>
                <span className="truncate">{day.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatItineraryText(it: FullItinerary): string {
  const budgetText = it.budget?.low && it.budget?.high ? `¥${it.budget.low}-${it.budget.high}` : '待定'
  const lines = [`🚀 ${it.title}`, `━━━━━━━━━━━━━━━━━━`, it.summary, '', `💰 预算：${budgetText}`, '']
  it.days.forEach((day) => {
    lines.push(`📅 第${day.day}天：${day.title}`)
    ;[...day.morning, ...day.afternoon, ...day.evening].forEach((a) => lines.push(`  ${a.time} ${a.name} · ${a.duration}`))
    lines.push('')
  })
  if (it.packingTips?.length) {
    lines.push('🎒 打包建议：')
    it.packingTips.forEach((t) => lines.push(`  · ${t}`))
  }
  lines.push('由 任意门 Anywhere Door AI 生成')
  return lines.join('\n')
}
