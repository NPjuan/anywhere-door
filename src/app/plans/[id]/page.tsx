'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, Wallet, BookOpen, AlertCircle, Loader2 } from 'lucide-react'
import { TechBackground as LightBackground } from '@/components/portal/AuroraBackground'
import { DayTimeline } from '@/components/itinerary/DayTimeline'
import { RouteMap } from '@/components/itinerary/RouteMap'
import { XHSStyleNote } from '@/components/itinerary/XHSStyleNote'
import { ExportButton } from '@/components/itinerary/ExportButton'
import type { FullItinerary, XHSNote } from '@/lib/agents/types'

/* ============================================================
   /plans/[id] — 已保存计划详情页（从 Supabase 拉取）
   ============================================================ */

export default function PlanDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [it, setIt]           = useState<FullItinerary | null>(null)
  const [savedAt, setSavedAt] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState(0)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/plans/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? '计划不存在或已删除' : `HTTP ${res.status}`)
        return res.json()
      })
      .then(({ plan }) => {
        setIt(plan.itinerary as FullItinerary)
        setSavedAt(plan.saved_at ?? '')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  // 加载中
  if (loading) {
    return (
      <main className="relative min-h-screen flex items-center justify-center" style={{ background: '#F8FAFF' }}>
        <LightBackground />
        <div className="relative flex flex-col items-center gap-3" style={{ zIndex: 1 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: '#2563EB' }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>加载计划中...</p>
        </div>
      </main>
    )
  }

  // 错误/不存在
  if (error || !it) {
    return (
      <main className="relative min-h-screen flex items-center justify-center" style={{ background: '#F8FAFF' }}>
        <LightBackground />
        <div className="relative text-center" style={{ zIndex: 1 }}>
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#EF4444' }} />
          <p className="font-medium mb-1" style={{ color: '#475569' }}>{error ?? '计划不存在'}</p>
          <Link href="/plans" className="text-sm" style={{ color: '#2563EB' }}>← 返回计划列表</Link>
        </div>
      </main>
    )
  }

  const xhsNotes: XHSNote[] =
    (it as unknown as { xhsNotes?: XHSNote[] })?.xhsNotes ??
    (it as unknown as { notes?: XHSNote[] })?.notes ?? []

  const savedDate = savedAt
    ? new Date(savedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  return (
    <main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
      <LightBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* 面包屑 */}
            <div className="flex items-center gap-2 mb-6 text-xs" style={{ color: '#94A3B8' }}>
              <Link href="/" className="hover:text-blue-500 transition-colors">首页</Link>
              <span>/</span>
              <Link href="/plans" className="hover:text-blue-500 transition-colors">我的计划</Link>
              <span>/</span>
              <span style={{ color: '#475569' }}>{it.title}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
              <div>
                <Link href="/plans"
                  className="flex items-center gap-1.5 text-xs mb-3 w-fit rounded-lg px-3 py-1.5 transition-all hover:bg-white"
                  style={{ border: '1px solid #E5E7EB', color: '#64748B' }}>
                  <ArrowLeft size={12} />返回列表
                </Link>
                <h1 className="font-bold leading-tight mb-2"
                  style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', color: '#0F172A' }}>
                  {it.title}
                </h1>
                <p className="text-base mb-3" style={{ color: '#475569' }}>{it.summary}</p>
                <div className="flex flex-wrap gap-5">
                  {[
                    { icon: <MapPin size={13} />, text: it.destination },
                    { icon: <Calendar size={13} />, text: `${it.days?.length ?? 0} 天` },
                    { icon: <Wallet size={13} />, text: it.budget ? `预算 ¥${it.budget.low}–${it.budget.high}` : '预算未定' },
                  ].map(({ icon, text }, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-sm" style={{ color: '#2563EB' }}>
                      {icon}{text}
                    </span>
                  ))}
                </div>
                {savedDate && (
                  <p className="text-xs mt-3" style={{ color: '#94A3B8' }}>保存于 {savedDate}</p>
                )}
              </div>
              <div className="shrink-0"><ExportButton itinerary={it} /></div>
            </div>
          </motion.div>

          {/* 时间线 + 地图 */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-10">
            <div className="lg:col-span-3">
              <DayTimeline dayPlans={it.days ?? []} activeDay={activeDay} onDayChange={setActiveDay} />
            </div>
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-6" style={{ height: 360 }}>
                {it.days?.[activeDay]
                  ? <RouteMap dayPlan={it.days[activeDay]} />
                  : <div className="h-full rounded-lg flex items-center justify-center"
                      style={{ background: '#F8FAFF', border: '1px solid #E2E8F0' }}>
                      <p className="text-sm" style={{ color: '#94A3B8' }}>暂无地图数据</p>
                    </div>
                }
              </div>
            </div>
          </motion.div>

          {/* 攻略参考 */}
          {xhsNotes.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} style={{ color: '#818CF8' }} />
                <h3 className="font-semibold" style={{ color: '#0F172A' }}>实用攻略参考</h3>
                <span className="text-xs" style={{ color: '#94A3B8' }}>AI 整理 · 小红书精选</span>
              </div>
              <div className="space-y-2">
                {xhsNotes.map((note, i) => <XHSStyleNote key={i} note={note} index={i} />)}
              </div>
            </motion.div>
          )}

          {/* 注意事项 */}
          {(it.warnings?.length ?? 0) > 0 && (
            <div className="rounded-lg p-5 mb-5" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#D97706' }}>注意事项</h3>
              <ul className="space-y-1.5">
                {it.warnings.map((w, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: '#78350F' }}>
                    <span style={{ color: '#D97706' }}>·</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 打包清单 */}
          {(it.packingTips?.length ?? 0) > 0 && (
            <div className="rounded-lg p-5" style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: '#0284C7' }}>打包清单</h3>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {it.packingTips.map((tip, i) => (
                  <li key={i} className="text-xs flex gap-1.5 items-start" style={{ color: '#0C4A6E' }}>
                    <span style={{ color: '#0EA5E9' }}>✓</span>{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
