'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Spin } from 'antd'
import { MapPin, Calendar, Wallet, Heart, Search, X, Compass, ArrowLeft } from 'lucide-react'
import { TechBackground as LightBackground } from '@/components/portal/AuroraBackground'
import { MiniMap } from '@/components/map/MiniMap'
import { FooterPowered } from '@/components/layout/FooterPowered'
import { getDeviceId } from '@/lib/deviceId'

/* ============================================================
   /explore — 公开行程广场（瀑布流 + 无限滚动）
   ============================================================ */

const PAGE_SIZE = 12
const STYLE_TAGS = ['亲子', '蜜月', '背包客', '文化探索', '美食之旅', '自然风光', '都市潮流', '休闲度假']

interface PoiPoint  { name: string; lat: number; lng: number }
interface DayPreview { day: number; date: string; title: string; pois: PoiPoint[] }

interface ExplorePlan {
  id:              string
  title:           string
  summary:         string
  destination:     string
  start_date:      string
  end_date:        string
  days_count:      number
  budget_low:      number
  budget_high:     number
  saved_at:        string
  favorite_count:  number
  is_favorited:    boolean
  highlights:      string[]
  days_preview:    DayPreview[]
  style_tags:      string[]
}

export default function ExplorePage() {
  const [plans,      setPlans]      = useState<ExplorePlan[]>([])
  const [loading,    setLoading]    = useState(true)
  const [loadingMore,setLoadingMore]= useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(true)
  const [total,      setTotal]      = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [sort,       setSort]       = useState<'latest' | 'popular'>('latest')
  const [styleFilter, setStyleFilter] = useState<string>('')
  const [favStates,  setFavStates]  = useState<Record<string, boolean>>({})
  const [favLoading, setFavLoading] = useState<Record<string, boolean>>({})
  // 每张卡片当前选中的 days_preview 索引
  const [mapDayIdx,  setMapDayIdx]  = useState<Record<string, number>>({})
  const searchRef      = useRef('')
  const sortRef        = useRef<'latest' | 'popular'>('latest')
  const styleFilterRef = useRef('')
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentinelRef    = useRef<HTMLDivElement>(null) // 无限滚动哨兵元素

  // 首屏加载（替换）
  const fetchPlans = useCallback(async (q = searchRef.current, s = sortRef.current, st = styleFilterRef.current) => {
    setLoading(true)
    setError(null)
    setPage(1)
    const deviceId = getDeviceId()
    try {
      const params = new URLSearchParams({ page: '1', limit: String(PAGE_SIZE), sort: s })
      if (deviceId) params.set('deviceId', deviceId)
      if (q) params.set('search', q)
      if (st) params.set('style', st)
      const res = await fetch(`/api/explore?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPlans(data.plans ?? [])
      setTotal(data.total ?? 0)
      setHasMore((data.plans?.length ?? 0) < (data.total ?? 0))
      setPage(2)
      const states: Record<string, boolean> = {}
      for (const plan of data.plans ?? []) states[plan.id] = plan.is_favorited
      setFavStates(states)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  // 加载更多（追加）
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const deviceId = getDeviceId()
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort: sortRef.current })
      if (deviceId) params.set('deviceId', deviceId)
      if (searchRef.current) params.set('search', searchRef.current)
      if (styleFilterRef.current) params.set('style', styleFilterRef.current)
      const res = await fetch(`/api/explore?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPlans(prev => {
        const existIds = new Set(prev.map(p => p.id))
        const newOnes = (data.plans ?? []).filter((p: ExplorePlan) => !existIds.has(p.id))
        return [...prev, ...newOnes]
      })
      setPage(p => p + 1)
      setHasMore(plans.length + (data.plans?.length ?? 0) < (data.total ?? 0))
      const states: Record<string, boolean> = {}
      for (const plan of data.plans ?? []) states[plan.id] = plan.is_favorited
      setFavStates(f => ({ ...f, ...states }))
    } catch { /* 静默 */ } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, page, plans.length])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  // IntersectionObserver 监听哨兵，触发加载更多
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, loadMore])

  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchRef.current = val
      fetchPlans(val, sortRef.current)
    }, 400)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    searchRef.current = ''
    fetchPlans('', sortRef.current)
  }

  const handleSortChange = (s: 'latest' | 'popular') => {
    sortRef.current = s
    setSort(s)
    fetchPlans(searchRef.current, s, styleFilterRef.current)
  }

  const handleStyleFilter = (tag: string) => {
    const next = styleFilterRef.current === tag ? '' : tag
    styleFilterRef.current = next
    setStyleFilter(next)
    fetchPlans(searchRef.current, sortRef.current, next)
  }

  const handleFavorite = async (planId: string) => {
    if (favLoading[planId]) return
    const deviceId = getDeviceId()
    if (!deviceId) return
    setFavLoading(f => ({ ...f, [planId]: true }))
    const already = favStates[planId]
    try {
      if (already) {
        await fetch(`/api/favorites/${planId}?deviceId=${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
      } else {
        await fetch('/api/favorites', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId, planId }),
        })
      }
      setFavStates(f => ({ ...f, [planId]: !already }))
      setPlans(ps => ps.map(p => p.id === planId
        ? { ...p, favorite_count: p.favorite_count + (already ? -1 : 1) }
        : p
      ))
    } catch { /* 静默 */ } finally {
      setFavLoading(f => ({ ...f, [planId]: false }))
    }
  }

  return (
    <main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
      <LightBackground />

      <div className="relative max-w-5xl mx-auto px-4 py-16" style={{ zIndex: 1 }}>

        {/* 顶部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center justify-center w-8 h-8 transition-all hover:bg-white"
              style={{ border: '1px solid #E2E8F0', color: '#374151', background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 8 }}>
              <ArrowLeft size={14} />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#0F172A' }}>
                <Compass size={18} style={{ color: '#2563EB' }} />
                探索行程
              </h1>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {loading ? '加载中...' : total > 0 ? `共 ${total} 个公开行程` : '暂无公开行程'}
              </p>
            </div>
          </div>
          <Link href="/plans" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all"
            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#374151', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            我的计划
          </Link>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94A3B8' }} />
          <input type="text" value={searchInput} onChange={e => handleSearchChange(e.target.value)}
            placeholder="搜索目的地或行程名称..."
            className="w-full text-sm outline-none transition-colors"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 36px', color: '#111827', height: 38 }}
            onFocus={e => e.currentTarget.style.borderColor = '#93C5FD'}
            onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
          />
          <AnimatePresence>
            {searchInput && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.12 }}
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 cursor-pointer"
                style={{ background: '#CBD5E1', border: 'none', color: '#FFFFFF', borderRadius: 8 }}>
                <X size={10} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* 排序切换 */}
        <div className="flex items-center gap-2 mb-3">
          {([['latest', '最新发布'], ['popular', '最多收藏']] as ['latest' | 'popular', string][]).map(([key, label]) => (
            <button key={key} onClick={() => handleSortChange(key)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 cursor-pointer transition-all"
              style={{
                background:   sort === key ? '#2563EB' : '#FFFFFF',
                color:        sort === key ? '#FFFFFF' : '#64748B',
                border:       `1px solid ${sort === key ? '#2563EB' : '#E5E7EB'}`,
                borderRadius: 8, fontWeight: sort === key ? 600 : 400,
              }}>
              {key === 'popular' && <Heart size={11} style={{ fill: sort === key ? 'currentColor' : 'none' }} />}
              {label}
            </button>
          ))}
        </div>

        {/* 风格标签筛选 */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {STYLE_TAGS.map(tag => (
            <button key={tag} onClick={() => handleStyleFilter(tag)}
              className="shrink-0 text-xs px-3 py-1.5 cursor-pointer transition-all"
              style={{
                background:   styleFilter === tag ? '#2563EB' : '#FFFFFF',
                color:        styleFilter === tag ? '#FFFFFF' : '#64748B',
                border:       `1px solid ${styleFilter === tag ? '#2563EB' : '#E5E7EB'}`,
                borderRadius: 8, fontWeight: styleFilter === tag ? 600 : 400, whiteSpace: 'nowrap',
              }}>
              {tag}
            </button>
          ))}
        </div>

        {/* 错误 */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
            <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
            <button onClick={() => fetchPlans()} className="ml-auto text-xs font-medium" style={{ color: '#2563EB' }}>重试</button>
          </div>
        )}

        {/* 首屏加载 */}
        {loading && !error && (
          <div className="flex justify-center py-24"><Spin size="large" /></div>
        )}

        {/* 空状态 */}
        {!loading && !error && plans.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4">
            <Compass size={40} style={{ color: '#CBD5E1' }} />
            <div className="text-center">
              <p className="font-medium" style={{ color: '#475569' }}>
                {searchInput ? '没有找到相关行程' : '还没有人公开行程'}
              </p>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
                {searchInput ? '换个关键词试试' : '生成行程后可以设为公开，让更多人看到'}
              </p>
            </div>
          </motion.div>
        )}

        {/* 瀑布流网格 */}
        {!loading && plans.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            <AnimatePresence initial={false}>
              {plans.map((plan, i) => (
                <motion.div key={plan.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.28, delay: i < 12 ? (i % 3) * 0.06 : 0 }}
                  className="break-inside-avoid mb-4"
                >
                  <div className="overflow-hidden relative flex flex-col"
                    style={{
                      background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
                      ;(e.currentTarget as HTMLDivElement).style.borderColor = '#BFDBFE'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
                      ;(e.currentTarget as HTMLDivElement).style.borderColor = '#E5E7EB'
                    }}
                  >
                    {/* 右上角季节 tag */}
                    {plan.start_date && (() => {
                      const month = new Date(plan.start_date).getMonth() + 1
                      const season =
                        month >= 3 && month <= 5  ? { label: '春', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' } :
                        month >= 6 && month <= 8  ? { label: '夏', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' } :
                        month >= 9 && month <= 11 ? { label: '秋', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' } :
                                                    { label: '冬', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' }
                      return (
                        <div className="absolute top-3 right-3 pointer-events-none text-xs font-semibold px-1.5 py-0.5"
                          style={{ background: season.bg, border: `1px solid ${season.border}`, color: season.color, borderRadius: 6, lineHeight: 1.4 }}>
                          {season.label}
                        </div>
                      )
                    })()}

                    <Link href={`/plans/${plan.id}?from=explore`} className="block p-4">
                      {/* 目的地标签 */}
                      {plan.destination && (
                        <div className="flex items-center gap-1 mb-2">
                          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5"
                            style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 6 }}>
                            <MapPin size={10} />{plan.destination}
                          </span>
                          {plan.days_count > 0 && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5"
                              style={{ background: '#F1F5F9', color: '#64748B', borderRadius: 6 }}>
                              <Calendar size={10} />{plan.days_count} 天
                            </span>
                          )}
                          {plan.style_tags?.[0] && (
                            <span className="text-xs px-2 py-0.5"
                              style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 6 }}>
                              {plan.style_tags[0]}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 标题 */}
                      <h2 className="font-semibold text-sm leading-snug mb-2"
                        style={{ color: '#0F172A', paddingRight: plan.favorite_count > 0 ? 40 : 0 }}>
                        {plan.title}
                      </h2>

                      {/* 摘要 */}
                      {plan.summary && (
                        <p className="text-xs leading-relaxed mb-3 line-clamp-3" style={{ color: '#64748B' }}>
                          {plan.summary}
                        </p>
                      )}

                      {/* 行程亮点 */}
                      {plan.highlights.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>行程亮点</p>
                          <div className="flex flex-wrap gap-1.5">
                            {plan.highlights.map((h, j) => (
                              <span key={j} className="text-xs px-2 py-0.5"
                                style={{ background: '#F8FAFF', border: '1px solid #E2E8F0', borderRadius: 6, color: '#475569' }}>
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 预算 + 日期 */}
                      <div className="flex items-center justify-between mt-1">
                        {plan.budget_low > 0 ? (
                          <span className="flex items-center gap-1 text-xs" style={{ color: '#16A34A' }}>
                            <Wallet size={10} />¥{plan.budget_low}–{plan.budget_high}
                          </span>
                        ) : <span />}
                        <span className="text-xs" style={{ color: '#CBD5E1' }}>
                          {new Date(plan.saved_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </Link>

                    {/* 地图区（有 days_preview 才显示）*/}
                    {plan.days_preview.length > 0 && (() => {
                      const idx     = mapDayIdx[plan.id] ?? 0
                      const safeIdx = Math.min(idx, plan.days_preview.length - 1)
                      const dayData = plan.days_preview[safeIdx]

                      return (
                        <div style={{ borderTop: '1px solid #F3F4F6' }}>
                          {/* 天数切换 */}
                          {plan.days_preview.length > 1 && (
                            <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto"
                              style={{ scrollbarWidth: 'none' }}
                              onClick={e => e.preventDefault()}>
                              {plan.days_preview.map((d, j) => (
                                <button
                                  key={j}
                                  onClick={e => { e.preventDefault(); setMapDayIdx(m => ({ ...m, [plan.id]: j })) }}
                                  className="shrink-0 text-xs px-2.5 py-1 cursor-pointer transition-all"
                                  style={{
                                    background:   j === safeIdx ? '#2563EB' : 'transparent',
                                    color:        j === safeIdx ? '#FFFFFF'  : '#94A3B8',
                                    border:       `1px solid ${j === safeIdx ? '#2563EB' : '#E5E7EB'}`,
                                    borderRadius: 6,
                                    fontWeight:   j === safeIdx ? 600 : 400,
                                  }}
                                >
                                  Day {d.day}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 交互地图 */}
                          <div className="px-4 pb-4" onClick={e => e.preventDefault()}>
                            <MiniMap
                              pois={dayData.pois}
                              height={170}
                            />
                          </div>
                        </div>
                      )
                    })()}

                    {/* 底栏：收藏数（左） + 收藏按钮（右）*/}
                    <div className="flex items-center justify-between px-4 py-2.5 border-t"
                      style={{ borderColor: '#F3F4F6', background: '#FAFAFA' }}>
                      {/* 左下角收藏数 */}
                      {plan.favorite_count > 0 ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
                          <Heart size={11} style={{ fill: 'currentColor', color: '#FECDD3' }} />
                          {plan.favorite_count}
                        </span>
                      ) : <span />}
                      <button onClick={() => handleFavorite(plan.id)} disabled={favLoading[plan.id]}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 cursor-pointer transition-all"
                        style={{
                          background:   favStates[plan.id] ? '#FFF1F2' : '#FFFFFF',
                          color:        favStates[plan.id] ? '#E11D48' : '#64748B',
                          border:       `1px solid ${favStates[plan.id] ? '#FECDD3' : '#E5E7EB'}`,
                          borderRadius: 8,
                        }}>
                        <Heart size={12} style={{ fill: favStates[plan.id] ? 'currentColor' : 'none', transition: 'fill 0.15s' }} />
                        {favStates[plan.id] ? '已收藏' : '收藏'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* 无限滚动哨兵 + 加载更多提示 */}
        <div ref={sentinelRef} className="h-8" />
        {loadingMore && (
          <div className="flex justify-center py-6">
            <Spin size="small" />
          </div>
        )}
        {!loading && !loadingMore && !hasMore && plans.length > 0 && (
          <p className="text-center text-xs py-6" style={{ color: '#CBD5E1' }}>— 已加载全部 {total} 个行程 —</p>
        )}
      </div>
      <FooterPowered />
    </main>
  )
}
