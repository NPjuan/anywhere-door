'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Pagination, Spin } from 'antd'
import { ArrowLeft, MapPin, Calendar, Wallet, Trash2, FolderOpen, Plus, RefreshCw, AlertCircle, Link2, CheckCircle, Search, X, Loader2, Heart } from 'lucide-react'
import { TechBackground as LightBackground } from '@/components/portal/AuroraBackground'
import { getDeviceId } from '@/lib/deviceId'
import { FooterPowered } from '@/components/layout/FooterPowered'

/* ============================================================
   /plans — 已保存的旅行计划列表（Supabase）分页 + 搜索版
   Tab：我的计划 | 我的收藏
   ============================================================ */

const PAGE_SIZE = 6

type TabType = 'plans' | 'favorites'

interface PlanRow {
  id:          string
  status:      string
  title:       string
  summary:     string
  destination: string
  start_date:  string
  end_date:    string
  days_count:  number
  budget_low:  number
  budget_high: number
  saved_at:    string
}

interface FavoriteRow {
  id:      number
  saved_at: string
  plan: {
    id:          string
    title:       string
    summary:     string
    destination: string
    start_date:  string
    end_date:    string
    days_count:  number
    budget_low:  number
    budget_high: number
    is_public:   boolean
  }
}

export default function PlansPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<TabType>(
    searchParams.get('tab') === 'favorites' ? 'favorites' : 'plans'
  )

  // ── 我的计划 ──
  const [plans, setPlans]           = useState<PlanRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [confirmDelete, setConfirm] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [copiedId, setCopiedId]     = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const searchRef   = useRef('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 我的收藏 ──
  const [favList,      setFavList]      = useState<FavoriteRow[]>([])
  const [favLoading,   setFavLoading]   = useState(false)
  const [favError,     setFavError]     = useState<string | null>(null)
  const [favPage,      setFavPage]      = useState(1)
  const [favTotal,     setFavTotal]     = useState(0)
  const [favTotalPages,setFavTotalPages]= useState(1)
  const [unfavId,      setUnfavId]      = useState<string | null>(null)

  const fetchPlans = useCallback(async (p = 1, q = searchRef.current) => {
    setLoading(true)
    setError(null)
    const deviceId = getDeviceId()
    if (!deviceId) { setLoading(false); return }
    try {
      const params = new URLSearchParams({
        deviceId,
        page:  String(p),
        limit: String(PAGE_SIZE),
      })
      if (q) params.set('search', q)
      const res = await fetch(`/api/plans?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // 超过 30 分钟还是 pending 的，自动标记为 error
      const TIMEOUT_MS = 30 * 60 * 1000
      const now = Date.now()
      const stalePending = (data.plans ?? []).filter((plan: PlanRow) =>
        plan.status === 'pending' && now - new Date(plan.saved_at).getTime() > TIMEOUT_MS
      )
      if (stalePending.length > 0) {
        await Promise.all(stalePending.map((plan: PlanRow) =>
          fetch(`/api/plans/${plan.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'error' }),
          })
        ))
        // 重新拉取以获取最新状态
        const res2 = await fetch(`/api/plans?${params}`)
        const data2 = await res2.json()
        setPlans(data2.plans ?? [])
        setTotal(data2.total ?? 0)
        setTotalPages(data2.totalPages ?? 1)
        setPage(p)
        return
      }

      setPlans(data.plans ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
      setPage(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans(1) }, [fetchPlans])

  // 收藏列表拉取
  const fetchFavorites = useCallback(async (p = 1) => {
    setFavLoading(true)
    setFavError(null)
    const deviceId = getDeviceId()
    if (!deviceId) { setFavLoading(false); return }
    try {
      const params = new URLSearchParams({ deviceId, page: String(p), limit: String(PAGE_SIZE) })
      const res = await fetch(`/api/favorites?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFavList(data.favorites ?? [])
      setFavTotal(data.total ?? 0)
      setFavTotalPages(data.totalPages ?? 1)
      setFavPage(p)
    } catch (e) {
      setFavError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setFavLoading(false)
    }
  }, [])

  // 切 tab 时加载对应数据
  useEffect(() => {
    if (tab === 'favorites') fetchFavorites(1)
  }, [tab, fetchFavorites])

  const handleUnfavorite = async (planId: string) => {
    if (unfavId === planId) {
      const deviceId = getDeviceId()
      await fetch(`/api/favorites/${planId}?deviceId=${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
      setUnfavId(null)
      fetchFavorites(favPage)
    } else {
      setUnfavId(planId)
      setTimeout(() => setUnfavId(null), 3000)
    }
  }

  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchRef.current = val
      fetchPlans(1, val)
    }, 400)
  }

  const handleClearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchInput('')
    searchRef.current = ''
    fetchPlans(1, '')
  }

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirm(id)
      setTimeout(() => setConfirm(null), 3000)
      return
    }
    setDeleting(id)
    const deviceId = getDeviceId()
    try {
      await fetch(`/api/plans/${id}?deviceId=${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
      const newTotal = total - 1
      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE))
      const targetPage = page > newTotalPages ? newTotalPages : page
      fetchPlans(targetPage)
    } finally {
      setDeleting(null)
      setConfirm(null)
    }
  }

  const handleCopyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/plans/${id}`)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2200)
    } catch { /* 静默 */ }
  }

  const from = (page - 1) * PAGE_SIZE + 1
  const to   = Math.min(page * PAGE_SIZE, total)

  return (
    <main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
      <LightBackground />

      <div className="relative max-w-3xl mx-auto px-4 py-16" style={{ zIndex: 1 }}>
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center justify-center w-8 h-8 transition-all"
              style={{ border: '1px solid #E2E8F0', color: '#374151', background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderRadius: 8 }}
            >
              <ArrowLeft size={14} />
            </Link>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>我的计划</h1>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {loading
                  ? '加载中...'
                  : total > 0
                    ? searchInput
                      ? `搜索「${searchInput}」找到 ${total} 个行程`
                      : `共 ${total} 个行程，第 ${from}–${to} 条`
                    : searchInput ? `没有匹配「${searchInput}」的行程` : '还没有保存的计划'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPlans(page)}
              className="w-8 h-8 flex items-center justify-center transition-all hover:bg-white"
              style={{ border: '1px solid #E5E7EB', color: '#64748B', borderRadius: 8 }}
              aria-label="刷新"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                borderRadius: 8,
              }}
            >
              <Plus size={14} />
              新建计划
            </Link>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 mb-5 p-1" style={{ background: '#F1F5F9', borderRadius: 8 }}>
          {([['plans', '我的计划'], ['favorites', '我的收藏']] as [TabType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-1.5 text-sm font-medium transition-all cursor-pointer"
              style={{
                background:   tab === key ? '#FFFFFF' : 'transparent',
                color:        tab === key ? '#0F172A' : '#64748B',
                boxShadow:    tab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border:       'none',
                borderRadius: 6,
              }}
            >
              {label}
              {key === 'favorites' && favTotal > 0 && (
                <span className="ml-1.5 text-xs px-1.5 py-0.5"
                  style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 6 }}>
                  {favTotal}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ──────────────────── 我的计划 ──────────────────── */}
        {tab === 'plans' && (<>
          {/* 搜索框 */}
          <div className="relative mb-5">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: '#94A3B8' }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="搜索目的地或行程名称..."
              className="w-full text-sm outline-none transition-colors"
              style={{
                background:   '#FFFFFF',
                border:       '1px solid #E5E7EB',
                borderRadius: 8,
                padding:      '9px 36px',
                color:        '#111827',
                height:       38,
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#93C5FD'}
              onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
            />
            <AnimatePresence>
              {searchInput && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 cursor-pointer"
                  style={{ background: '#CBD5E1', border: 'none', color: '#FFFFFF', borderRadius: 8 }}
                >
                  <X size={10} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

        {/* 错误状态 */}
        {error && (
          <div
            className="flex items-center gap-3 p-4 mb-6"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}
          >
            <AlertCircle size={16} style={{ color: '#EF4444' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: '#EF4444' }}>加载失败</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {error}。请检查 Supabase 配置并确保 plans 表已创建。
              </p>
            </div>
            <button onClick={() => fetchPlans(page)} className="ml-auto text-xs font-medium" style={{ color: '#2563EB' }}>
              重试
            </button>
          </div>
        )}

        {/* 加载状态 */}
        {loading && !error && (
          <div className="flex justify-center py-32">
            <Spin size="large" />
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && plans.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: '#F1F5F9' }}>
              <FolderOpen size={28} style={{ color: '#CBD5E1' }} />
            </div>
            <div className="text-center">
              {searchInput ? (
                <>
                  <p className="font-medium" style={{ color: '#475569' }}>没有找到相关行程</p>
                  <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>试试其他关键词，或</p>
                  <button
                    onClick={handleClearSearch}
                    className="text-sm mt-1 cursor-pointer"
                    style={{ color: '#2563EB', background: 'none', border: 'none' }}
                  >
                    查看全部计划
                  </button>
                </>
              ) : (
                <>
                  <p className="font-medium" style={{ color: '#475569' }}>还没有保存的计划</p>
                  <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>生成行程后会自动保存到这里</p>
                </>
              )}
            </div>
            {!searchInput && (
              <Link href="/"
                className="mt-2 px-5 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB' }}>
                去生成行程
              </Link>
            )}
          </motion.div>
        )}

        {/* 计划列表 */}
        {!loading && (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {plans.map((plan, i) => {
                const date = new Date(plan.saved_at).toLocaleDateString('zh-CN', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })
                const isDeleting = deleting === plan.id

                const highlight = (text: string) => {
                  if (!searchInput || !text) return text
                  const idx = text.toLowerCase().indexOf(searchInput.toLowerCase())
                  if (idx === -1) return text
                  return (
                    <>
                      {text.slice(0, idx)}
                      <mark style={{ background: '#FEF08A', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>
                        {text.slice(idx, idx + searchInput.length)}
                      </mark>
                      {text.slice(idx + searchInput.length)}
                    </>
                  )
                }

                return (
                  <motion.div
                    key={plan.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.28, delay: i < 6 ? i * 0.04 : 0 }}
                  >
                    {(() => {
                      const isPending = plan.status === 'pending'
                      const isError   = plan.status === 'error' || plan.status === 'interrupted'
                      const isBlocked = isPending || isError

                      return (
                        <div
                          className="overflow-hidden"
                          style={{
                            background:   '#FFFFFF',
                            border:       `1px solid ${isError ? '#FECACA' : '#E5E7EB'}`,
                            borderRadius: 8,
                            boxShadow:    '0 1px 4px rgba(0,0,0,0.05)',
                            opacity:      isDeleting ? 0.5 : 1,
                            transition:   'opacity 0.2s',
                          }}
                        >
                          {/* 卡片主体 — pending/error 不可点击 */}
                          {isBlocked ? (
                            <div className="block p-5 cursor-default">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <h2 className="font-semibold leading-snug" style={{ color: isPending ? '#94A3B8' : '#EF4444' }}>
                                    {highlight(plan.title)}
                                  </h2>
                                  {isPending && (
                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5" style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 6 }}>
                                      <Loader2 size={10} className="animate-spin" />规划中
                                    </span>
                                  )}
                                  {isError && (
                                    <span className="flex items-center gap-1 text-xs px-2 py-0.5" style={{ background: '#FEF2F2', color: '#EF4444', borderRadius: 6 }}>
                                      <AlertCircle size={10} />规划失败
                                    </span>
                                  )}
                                </div>
                                <span className="shrink-0 text-xs" style={{ color: '#94A3B8' }}>{date}</span>
                              </div>
                              {isPending && (
                                <p className="text-xs" style={{ color: '#94A3B8' }}>行程正在生成中，请稍候...</p>
                              )}
                              {isError && (
                                <p className="text-xs" style={{ color: '#94A3B8' }}>行程生成失败，可删除后重新规划</p>
                              )}
                              <div className="flex flex-wrap gap-4 mt-2">
                                {plan.destination && (
                                  <span className="flex items-center gap-1 text-xs" style={{ color: '#CBD5E1' }}>
                                    <MapPin size={12} />{plan.destination}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Link href={`/plans/${plan.id}`} className="block p-5">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <h2 className="font-semibold leading-snug" style={{ color: '#0F172A' }}>
                                  {highlight(plan.title)}
                                </h2>
                                <span className="shrink-0 text-xs" style={{ color: '#94A3B8' }}>{date}</span>
                              </div>
                              {plan.summary && (
                                <p className="text-sm line-clamp-2 mb-3" style={{ color: '#64748B' }}>{plan.summary}</p>
                              )}
                              <div className="flex flex-wrap gap-4">
                                {plan.destination && (
                                  <span className="flex items-center gap-1 text-xs" style={{ color: '#2563EB' }}>
                                    <MapPin size={12} />{highlight(plan.destination)}
                                  </span>
                                )}
                                {plan.days_count > 0 && (
                                  <span className="flex items-center gap-1 text-xs" style={{ color: '#2563EB' }}>
                                    <Calendar size={12} />{plan.days_count} 天
                                  </span>
                                )}
                                {plan.budget_low > 0 && (
                                  <span className="flex items-center gap-1 text-xs" style={{ color: '#2563EB' }}>
                                    <Wallet size={12} />¥{plan.budget_low}–{plan.budget_high}
                                  </span>
                                )}
                              </div>
                            </Link>
                          )}

                          <div
                            className="flex items-center justify-between px-5 py-2.5 border-t"
                            style={{ borderColor: '#F3F4F6', background: '#FAFAFA' }}
                          >
                            <span className="text-xs" style={{ color: '#94A3B8' }}>
                              {plan.start_date} {plan.end_date && `→ ${plan.end_date}`}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {!isBlocked && (
                                <button
                                  onClick={(e) => { e.preventDefault(); handleCopyLink(plan.id) }}
                                  className="flex items-center gap-1 text-xs px-2.5 py-1 cursor-pointer transition-all"
                                  title="复制分享链接"
                                  style={{
                                    background:   copiedId === plan.id ? '#F0FDF4' : 'transparent',
                                    color:        copiedId === plan.id ? '#16A34A' : '#94A3B8',
                                    border:       copiedId === plan.id ? '1px solid #BBF7D0' : '1px solid transparent',
                                    borderRadius: 8,
                                  }}
                                >
                                  {copiedId === plan.id ? <CheckCircle size={11} /> : <Link2 size={11} />}
                                  {copiedId === plan.id ? '已复制' : '分享'}
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.preventDefault(); handleDelete(plan.id) }}
                                disabled={isDeleting}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 cursor-pointer transition-all disabled:opacity-40"
                                style={{
                                  background:   confirmDelete === plan.id ? '#FEF2F2' : 'transparent',
                                  color:        confirmDelete === plan.id ? '#EF4444' : '#94A3B8',
                                  border:       confirmDelete === plan.id ? '1px solid #FECACA' : '1px solid transparent',
                                  borderRadius: 8,
                                }}
                              >
                                <Trash2 size={11} />
                                {confirmDelete === plan.id ? '确认删除' : '删除'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* 分页 */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination
              current={page}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={(p) => fetchPlans(p)}
              showSizeChanger={false}
            />
          </div>
        )}
        </>)}

        {/* ──────────────────── 我的收藏 ──────────────────── */}
        {tab === 'favorites' && (
          <>
            {favLoading && <div className="flex justify-center py-32"><Spin size="large" /></div>}
            {favError && (
              <div className="flex items-center gap-3 rounded-lg p-4 mb-4"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="text-sm" style={{ color: '#EF4444' }}>{favError}</p>
                <button onClick={() => fetchFavorites(favPage)} className="ml-auto text-xs" style={{ color: '#2563EB' }}>重试</button>
              </div>
            )}
            {!favLoading && !favError && favList.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: '#FFF1F2' }}>
                  <Heart size={28} style={{ color: '#FECDD3' }} />
                </div>
                <div className="text-center">
                  <p className="font-medium" style={{ color: '#475569' }}>还没有收藏的行程</p>
                  <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>去探索广场发现别人的精彩行程</p>
                </div>
                <Link href="/explore" className="mt-2 px-5 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: '#FFF1F2', border: '1px solid #FECDD3', color: '#E11D48' }}>
                  去探索
                </Link>
              </motion.div>
            )}
            {!favLoading && favList.length > 0 && (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {favList.map((fav, i) => {
                    const p = fav.plan
                    if (!p) return null
                    return (
                      <motion.div key={fav.id} layout
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.24, delay: i < 6 ? i * 0.04 : 0 }}>
                        <div className="overflow-hidden"
                          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                          <Link href={`/plans/${p.id}?from=favorites`} className="block p-5">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h2 className="font-semibold leading-snug" style={{ color: '#0F172A' }}>{p.title}</h2>
                              <span className="shrink-0 text-xs" style={{ color: '#94A3B8' }}>
                                {new Date(fav.saved_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} 收藏
                              </span>
                            </div>
                            {p.summary && <p className="text-sm line-clamp-2 mb-3" style={{ color: '#64748B' }}>{p.summary}</p>}
                            <div className="flex flex-wrap gap-4">
                              {p.destination && <span className="flex items-center gap-1 text-xs" style={{ color: '#2563EB' }}><MapPin size={12} />{p.destination}</span>}
                              {p.days_count > 0 && <span className="flex items-center gap-1 text-xs" style={{ color: '#2563EB' }}><Calendar size={12} />{p.days_count} 天</span>}
                              {p.budget_low > 0 && <span className="flex items-center gap-1 text-xs" style={{ color: '#2563EB' }}><Wallet size={12} />¥{p.budget_low}–{p.budget_high}</span>}
                            </div>
                          </Link>
                          <div className="flex items-center justify-between px-5 py-2.5 border-t"
                            style={{ borderColor: '#F3F4F6', background: '#FAFAFA' }}>
                            <span className="text-xs" style={{ color: '#94A3B8' }}>
                              {p.start_date} {p.end_date && `→ ${p.end_date}`}
                            </span>
                            <button
                              onClick={(e) => { e.preventDefault(); handleUnfavorite(p.id) }}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 cursor-pointer transition-all"
                              style={{
                                background:   unfavId === p.id ? '#FEF2F2' : 'transparent',
                                color:        unfavId === p.id ? '#EF4444' : '#94A3B8',
                                border:       unfavId === p.id ? '1px solid #FECACA' : '1px solid transparent',
                                borderRadius: 8,
                              }}
                            >
                              <Heart size={11} style={{ fill: unfavId === p.id ? 'currentColor' : 'none' }} />
                              {unfavId === p.id ? '确认取消' : '取消收藏'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
            {!favLoading && favTotalPages > 1 && (
              <div className="flex justify-center mt-6">
                <Pagination current={favPage} total={favTotal} pageSize={PAGE_SIZE}
                  onChange={(p) => fetchFavorites(p)} showSizeChanger={false} />
              </div>
            )}
          </>
        )}
      </div>
      <FooterPowered />
    </main>
  )
}
