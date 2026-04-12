'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Calendar, Wallet,
  BookOpen, CheckCircle, Bookmark, Loader2, Globe, Lock, Heart,
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
   - 本人：公开/私密切换
   - 访客：收藏 / 保存到我的计划
   ============================================================ */

interface Props {
  id:            string
  it:            FullItinerary
  savedAt:       string
  ownerDeviceId: string
  initIsPublic:  boolean
}

export function PlanDetailClient({ id, it, savedAt, ownerDeviceId, initIsPublic }: Props) {
  const searchParams  = useSearchParams()
  const fromFavorites = searchParams.get('from') === 'favorites'
  const fromExplore   = searchParams.get('from') === 'explore'

  const [activeDay,   setActiveDay]   = useState(0)
  const [isOwner,     setIsOwner]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [activePOIId, setActivePOIId] = useState<string | undefined>(undefined)
  const [weatherMap,  setWeatherMap]  = useState<Map<string, DayWeather>>(new Map())

  // 公开/私密
  const [isPublic,      setIsPublic]      = useState(initIsPublic)
  const [togglingPublic, setTogglingPublic] = useState(false)

  // 收藏
  const [favorited,    setFavorited]    = useState(false)
  const [favLoading,   setFavLoading]   = useState(false)
  const [favCount,     setFavCount]     = useState(0)

  useEffect(() => {
    setIsOwner(getDeviceId() === ownerDeviceId)
  }, [ownerDeviceId])

  // 初始化收藏状态（非本人 + 行程公开）
  useEffect(() => {
    if (!isPublic) return
    const deviceId = getDeviceId()
    if (!deviceId || deviceId === ownerDeviceId) return
    // 查询是否已收藏 + 收藏数
    fetch(`/api/explore?deviceId=${encodeURIComponent(deviceId)}&page=1&limit=1`)
      .catch(() => null) // 仅用 explore 作参考，不强依赖
    fetch(`/api/favorites?deviceId=${encodeURIComponent(deviceId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const alreadyFav = (data.favorites ?? []).some(
          (f: { plan: { id: string } }) => f.plan?.id === id
        )
        setFavorited(alreadyFav)
      })
      .catch(() => null)
  }, [id, isPublic, ownerDeviceId])

  // 天气
  useEffect(() => {
    const dates = (it.days ?? []).map(d => d.date).filter(Boolean) as string[]
    if (!dates.length) return
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
    fetchWeather(lat, lng, dates).then(setWeatherMap).catch(() => null)
  }, [it])

  const xhsNotes: XHSNote[] =
    (it as unknown as { xhsNotes?: XHSNote[] })?.xhsNotes ??
    (it as unknown as { notes?: XHSNote[] })?.notes ?? []

  const savedDate = savedAt
    ? new Date(savedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  /* 切换公开/私密 */
  const handleTogglePublic = async () => {
    if (togglingPublic) return
    setTogglingPublic(true)
    const next = !isPublic
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isPublic: next, deviceId: getDeviceId() }),
      })
      if (!res.ok) throw new Error()
      setIsPublic(next)
    } catch {
      /* 静默 */
    } finally {
      setTogglingPublic(false)
    }
  }

  /* 保存到我的计划（访客） */
  const handleSaveToMyPlans = async () => {
    if (saving || saved) return
    setSaving(true)
    try {
      const res = await fetch('/api/plans', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ deviceId: getDeviceId(), itinerary: it, status: 'done' }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
    } catch { /* 静默 */ } finally { setSaving(false) }
  }

  /* 收藏 / 取消收藏（访客） */
  const handleFavorite = async () => {
    if (favLoading) return
    setFavLoading(true)
    const deviceId = getDeviceId()
    try {
      if (favorited) {
        await fetch(`/api/favorites/${id}?deviceId=${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
        setFavorited(false)
        setFavCount(c => Math.max(0, c - 1))
      } else {
        await fetch('/api/favorites', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ deviceId, planId: id }),
        })
        setFavorited(true)
        setFavCount(c => c + 1)
      }
    } catch { /* 静默 */ } finally { setFavLoading(false) }
  }

  return (
    <main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
      <LightBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* 面包屑 */}
            <div className="flex items-center gap-2 mb-6 text-xs" style={{ color: '#94A3B8' }}>
              <Link href="/" className="hover:text-blue-500 transition-colors">首页</Link>
              {fromExplore ? (
                <>
                  <span>/</span>
                  <Link href="/explore" className="hover:text-blue-500 transition-colors">探索行程</Link>
                </>
              ) : isOwner && (
                <>
                  <span>/</span>
                  <Link href={fromFavorites ? '/plans?tab=favorites' : '/plans'} className="hover:text-blue-500 transition-colors">
                    {fromFavorites ? '我的收藏' : '我的计划'}
                  </Link>
                </>
              )}
              <span>/</span>
              <span style={{ color: '#475569' }}>{it.title}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
              <div>
                {/* 返回按钮 */}
                <Link
                  href={
                    fromExplore   ? '/explore' :
                    fromFavorites ? '/plans?tab=favorites' :
                    isOwner       ? '/plans' : '/'
                  }
                  className="flex items-center gap-1.5 mb-4 w-fit transition-all"
                  style={{
                    background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#64748B',
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                  }}
                >
                  <ArrowLeft size={13} />
                  {fromExplore   ? '返回探索' :
                   fromFavorites ? '返回收藏' :
                   isOwner       ? '返回列表' : '去规划我的行程'}
                </Link>

                <div className="flex items-center gap-2 mb-2">
                  <h1 className="font-bold leading-tight" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', color: '#0F172A' }}>
                    {it.title}
                  </h1>
                  {/* 公开标识 */}
                  {isPublic && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                      <Globe size={10} />公开
                    </span>
                  )}
                </div>
                <p className="text-base mb-3" style={{ color: '#475569' }}>{it.summary}</p>

                <div className="flex flex-wrap gap-5">
                  {[
                    { icon: <MapPin size={13} />,   text: it.destination },
                    { icon: <Calendar size={13} />, text: `${it.days?.length ?? 0} 天` },
                    { icon: <Wallet size={13} />,   text: it.budget ? `预算 ¥${it.budget.low}–${it.budget.high}` : '预算未定' },
                  ].map(({ icon, text }, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-sm" style={{ color: '#2563EB' }}>
                      {icon}{text}
                    </span>
                  ))}
                  {favCount > 0 && (
                    <span className="flex items-center gap-1 text-sm" style={{ color: '#EC4899' }}>
                      <Heart size={13} />{favCount} 人收藏
                    </span>
                  )}
                </div>

                {savedDate && <p className="text-xs mt-3" style={{ color: '#94A3B8' }}>保存于 {savedDate}</p>}
              </div>

              {/* 右侧操作区：ExportButton + 公开/收藏按钮同行 */}
              <div className="shrink-0">
                <ExportButton
                  itinerary={it}
                  planId={id}
                  extra={
                    isOwner ? (
                      /* 本人：公开/私密切换 */
                      <button
                        onClick={handleTogglePublic}
                        disabled={togglingPublic}
                        className="flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                        style={{
                          background:   isPublic ? '#EFF6FF' : '#FFFFFF',
                          border:       `1px solid ${isPublic ? '#BFDBFE' : '#E2E8F0'}`,
                          color:        isPublic ? '#2563EB' : '#64748B',
                          padding:      '7px 14px',
                          borderRadius: 8,
                          fontSize:     13,
                          fontWeight:   500,
                          opacity:      togglingPublic ? 0.6 : 1,
                        }}
                      >
                        {togglingPublic
                          ? <Loader2 size={13} className="animate-spin" />
                          : isPublic ? <Globe size={13} /> : <Lock size={13} />
                        }
                        {isPublic ? '已公开' : '设为公开'}
                      </button>
                    ) : (
                      /* 访客：收藏 + 保存 */
                      <>
                        {isPublic && (
                          <button
                            onClick={handleFavorite}
                            disabled={favLoading}
                            className="flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                            style={{
                              background:   favorited ? '#FFF1F2' : '#FFFFFF',
                              border:       `1px solid ${favorited ? '#FECDD3' : '#E2E8F0'}`,
                              color:        favorited ? '#E11D48' : '#64748B',
                              padding:      '7px 14px',
                              borderRadius: 8,
                              fontSize:     13,
                              fontWeight:   500,
                            }}
                          >
                            {favLoading
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Heart size={13} style={{ fill: favorited ? 'currentColor' : 'none' }} />
                            }
                            {favorited ? '已收藏' : '收藏'}
                          </button>
                        )}
                        <button
                          onClick={handleSaveToMyPlans}
                          disabled={saving || saved}
                          className="flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                          style={{
                            background:   saved ? '#F0FDF4' : '#FFFFFF',
                            border:       `1px solid ${saved ? '#BBF7D0' : '#E2E8F0'}`,
                            color:        saved ? '#16A34A' : '#64748B',
                            padding:      '7px 14px',
                            borderRadius: 8,
                            fontSize:     13,
                            fontWeight:   500,
                            opacity:      saving || saved ? 0.7 : 1,
                          }}
                        >
                          {saving ? <Loader2 size={13} className="animate-spin" />
                            : saved ? <CheckCircle size={13} />
                            : <Bookmark size={13} />}
                          {saved ? '已保存' : saving ? '保存中...' : '保存'}
                        </button>
                      </>
                    )
                  }
                />
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
                <DayTimeline
                  dayPlans={it.days ?? []}
                  activeDay={activeDay}
                  onDayChange={(d) => { setActiveDay(d); setActivePOIId(undefined) }}
                  weatherMap={weatherMap}
                  activePOIId={activePOIId}
                  onMapPin={(poiId) => setActivePOIId(poiId)}
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-6" style={{ height: 360 }}>
                {it.days?.[activeDay]
                  ? <RouteMap
                      dayPlan={it.days[activeDay]}
                      activePOIId={activePOIId}
                      onMarkerClick={(poiId) => setActivePOIId(poiId)}
                    />
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
      <FooterPowered />
    </main>
  )
}
