'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { getQuotaStats } from '@/lib/quotaMonitor'

/* ============================================================
   QuotaWarningBanner — API 配额警告横幅
   API quota warning banner

   在导航栏附近显示，告知用户某 API 即将用满
   Shown near navbar when any API approaching quota limit
   ============================================================ */

export function QuotaWarningBanner() {
  const [stats,     setStats]     = useState<ReturnType<typeof getQuotaStats>>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setStats(getQuotaStats())
  }, [])

  const warnings = stats.filter((s) => s.warning)
  if (warnings.length === 0 || dismissed) return null

  return (
    <div
      className="fixed top-[72px] left-4 right-4 z-[var(--z-toast)] rounded-[var(--radius-lg)] px-4 py-2.5 flex items-center gap-3"
      style={{
        background:     'rgba(249,115,22,0.10)',
        backdropFilter: 'blur(12px)',
        border:         '1px solid rgba(249,115,22,0.25)',
      }}
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle size={15} className="shrink-0" style={{ color: 'var(--color-cta)' }} aria-hidden="true" />
      <p className="flex-1 text-xs" style={{ color: 'var(--color-text)' }}>
        {warnings.map((w) => `${w.label} ${Math.round(w.pct * 100)}%`).join('、')} 即将达到本月配额上限
        <span className="ml-1 opacity-60">· API quota nearing limit</span>
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="关闭配额警告 / Dismiss quota warning"
        className="shrink-0 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cta)]"
      >
        <X size={14} style={{ color: 'var(--color-text-muted)' }} />
      </button>
    </div>
  )
}
