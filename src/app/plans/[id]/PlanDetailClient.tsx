'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Calendar, Wallet,
  BookOpen, CheckCircle, Bookmark, Loader2,
} from 'lucide-react'
import { TechBackground as LightBackground } from '@/components/portal/AuroraBackground'
import { DayTimeline } from '@/components/itinerary/DayTimeline'
import { RouteMap } from '@/components/itinerary/RouteMap'
import { XHSStyleNote } from '@/components/itinerary/XHSStyleNote'
import { ExportButton } from '@/components/itinerary/ExportButton'
import { getDeviceId } from '@/lib/deviceId'
import { FooterPowered } from '@/components/layout/FooterPowered'
import { fetchWeather, type DayWeather } from '@/lib/weather'
import type { FullItinerary, XHSNote } from '@/lib/agents/types'

/* ============================================================
   PlanDetailClient — /plans/[id] 客户端部分
   - 接收服务端预取的行程数据
   - 通过 device_id 判断访客 vs 本人
   - 访客：显示「保存到我的计划」
   - 本人：显示「返回我的计划」
   ============================================================ */

interface Props {
  id:      string
  it:      FullItinerary
  savedAt: string
  /** 行程所属设备 ID，由服务端从 DB 读取并传入 */
  ownerDeviceId: string
}

export function PlanDetailClient({ id, it, savedAt, ownerDeviceId }: Props) {
  const [activeDay, setActiveDay] = useState(0)
  const [isOwner,   setIsOwner]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [weatherMap, setWeatherMap] = useState<Map<string, DayWeather>>(new Map())

  useEffect(() => {
    setIsOwner(getDeviceId() === ownerDeviceId)
  }, [ownerDeviceId])

  // 获取天气：用第一天有坐标的 POI 作为目的地坐标
  useEffect(() => {
    const dates = (it.days ?? []).map(d => d.date).filter(Boolean) as string[]
    if (!dates.length) return

    // 找目的地坐标：遍历所有 day 的 activities 找第一个有 latLng 的 POI
    let lat: number | null = null
    let lng: number | null = null
    outer: for (const day of it.days ?? []) {
      for (const act of [...(day.morning ?? []), ...(day.afternoon ?? []), ...(day.evening ?? [])]) {
        if (act.poi?.latLng?.lat && act.poi?.latLng?.lng) {
          lat = act.poi.latLng.lat
          lng = act.poi.latLng.lng
          break outer
        }
      }
    }
    if (lat === null || lng === null) return

    fetchWeather(lat, lng, dates)
      .then(setWeatherMap)
      .catch(() => {/* 静默，天气非核心功能 */})
  }, [it])

  const xhsNotes: XHSNote[] =
    (it as unknown as { xhsNotes?: XHSNote[] })?.xhsNotes ??
    (it as unknown as { notes?: XHSNote[] })?.notes ?? []

  const savedDate = savedAt
    ? new Date(savedAt).toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : ''

  const handleSaveToMyPlans = async () => {
    if (saving || saved) return
    setSaving(true)
    try {
      const deviceId = getDeviceId()
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          itinerary: it,
          status: 'done',
        }),
      })
      if (!res.ok) throw new Error('保存失败')
      setSaved(true)
    } catch {
      /* 静默，实际项目可加 toast */
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
      <LightBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* 面包屑 — 访客不显示「我的计划」层级 */}
            <div className="flex items-center gap-2 mb-6 text-xs" style={{ color: '#94A3B8' }}>
              <Link href="/" className="hover:text-blue-500 transition-colors">首页</Link>
              {isOwner && (
                <>
                  <span>/</span>
                  <Link href="/plans" className="hover:text-blue-500 transition-colors">我的计划</Link>
                </>
              )}
              <span>/</span>
              <span style={{ color: '#475569' }}>{it.title}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
              <div>
                {/* 返回按钮 — 本人返回列表，访客返回首页 */}
                <Link
                  href={isOwner ? '/plans' : '/'}
                  className="flex items-center gap-1.5 mb-4 w-fit transition-all"
                  style={{
                    background:   '#FFFFFF',
                    border:       '1px solid #E2E8F0',
                    color:        '#64748B',
                    padding:      '7px 14px',
                    borderRadius: 8,
                    fontSize:     13,
                    fontWeight:   500,
                    whiteSpace:   'nowrap',
                  }}
                >
                  <ArrowLeft size={13} />
                  {isOwner ? '返回列表' : '去规划我的行程'}
                </Link>

                <h1
                  className="font-bold leading-tight mb-2"
                  style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', color: '#0F172A' }}
                >
                  {it.title}
                </h1>
                <p className="text-base mb-3" style={{ color: '#475569' }}>{it.summary}</p>

                <div className="flex flex-wrap gap-5">
                  {[
                    { icon: <MapPin size={13} />,    text: it.destination },
                    { icon: <Calendar size={13} />,  text: `${it.days?.length ?? 0} 天` },
                    {
                      icon: <Wallet size={13} />,
                      text: it.budget ? `预算 ¥${it.budget.low}–${it.budget.high}` : '预算未定',
                    },
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

              {/* 右侧操作区 */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <ExportButton itinerary={it} planId={id} />

                {/* 访客：保存到我的计划 */}
                {!isOwner && (
                  <motion.button
                    onClick={handleSaveToMyPlans}
                    disabled={saving || saved}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-all"
                    style={{
                      background: saved ? '#F0FDF4' : '#EFF6FF',
                      border:     `1px solid ${saved ? '#BBF7D0' : '#BFDBFE'}`,
                      color:      saved ? '#16A34A' : '#2563EB',
                      cursor:     saving || saved ? 'default' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {saving ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : saved ? (
                      <CheckCircle size={13} />
                    ) : (
                      <Bookmark size={13} />
                    )}
                    {saved ? '已保存到我的计划' : saving ? '保存中...' : '保存到我的计划'}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* 时间线 + 地图 */}
          <motion.div
            id="itinerary-day-row"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-10"
          >
            <div className="lg:col-span-3">
              <div className="p-4" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <DayTimeline dayPlans={it.days ?? []} activeDay={activeDay} onDayChange={setActiveDay} weatherMap={weatherMap} />
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-6" style={{ height: 360 }}>
                {it.days?.[activeDay]
                  ? <RouteMap dayPlan={it.days[activeDay]} />
                  : (
                    <div className="h-full rounded-lg flex items-center justify-center"
                      style={{ background: '#F8FAFF', border: '1px solid #E2E8F0' }}>
                      <p className="text-sm" style={{ color: '#94A3B8' }}>暂无地图数据</p>
                    </div>
                  )
                }
              </div>
            </div>
          </motion.div>

          {/* 攻略参考 */}
          {xhsNotes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }} className="mb-8"
            >
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
      <FooterPowered />
    </main>
  )
}
