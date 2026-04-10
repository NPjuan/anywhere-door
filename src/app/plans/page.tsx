'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, Calendar, Wallet, Trash2, FolderOpen, Plus, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { TechBackground as LightBackground } from '@/components/portal/AuroraBackground'
import { getDeviceId } from '@/lib/deviceId'

/* ============================================================
   /plans — 已保存的旅行计划列表（Supabase）分页版
   ============================================================ */

const PAGE_SIZE = 10

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

export default function PlansPage() {
  const [plans, setPlans]           = useState<PlanRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [confirmDelete, setConfirm] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchPlans = useCallback(async (p = 1) => {
    setLoading(true)
    setError(null)
    const deviceId = getDeviceId()
    if (!deviceId) { setLoading(false); return }
    try {
      const res = await fetch(`/api/plans?deviceId=${encodeURIComponent(deviceId)}&page=${p}&limit=${PAGE_SIZE}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
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
      // 删除后刷新当前页（若当前页变空则回上一页）
      const newTotal = total - 1
      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE))
      const targetPage = page > newTotalPages ? newTotalPages : page
      fetchPlans(targetPage)
    } finally {
      setDeleting(null)
      setConfirm(null)
    }
  }

  const from = (page - 1) * PAGE_SIZE + 1
  const to   = Math.min(page * PAGE_SIZE, total)

  return (
    <main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
      <LightBackground />

      <div className="relative max-w-3xl mx-auto px-4 py-16" style={{ zIndex: 1 }}>
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-white"
              style={{ border: '1px solid #E5E7EB', color: '#64748B' }}
            >
              <ArrowLeft size={14} />
            </Link>
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>我的计划</h1>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {loading ? '加载中...' : total > 0 ? `共 ${total} 个行程，第 ${from}–${to} 条` : '还没有保存的计划'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchPlans(page)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-white"
              style={{ border: '1px solid #E5E7EB', color: '#64748B' }}
              aria-label="刷新"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
              }}
            >
              <Plus size={14} />
              新建计划
            </Link>
          </div>
        </div>

        {/* 错误状态 */}
        {error && (
          <div
            className="flex items-center gap-3 rounded-lg p-4 mb-6"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
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

        {/* 加载骨架 */}
        {loading && !error && (
          <div className="space-y-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg p-5"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  animation: `skeleton-pulse 1.6s ease-in-out ${i * 0.08}s infinite`,
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="h-5 rounded" style={{ width: `${45 + (i % 3) * 12}%`, background: '#F1F5F9' }} />
                  <div className="h-4 rounded shrink-0" style={{ width: 64, background: '#F1F5F9' }} />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3.5 rounded" style={{ width: '100%', background: '#F1F5F9' }} />
                  <div className="h-3.5 rounded" style={{ width: '72%', background: '#F1F5F9' }} />
                </div>
                <div className="flex gap-3">
                  <div className="h-3.5 rounded" style={{ width: 48, background: '#EFF6FF' }} />
                  <div className="h-3.5 rounded" style={{ width: 36, background: '#EFF6FF' }} />
                  <div className="h-3.5 rounded" style={{ width: 80, background: '#EFF6FF' }} />
                </div>
              </div>
            ))}
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes skeleton-pulse {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0.5; }
              }
            `}} />
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
              <p className="font-medium" style={{ color: '#475569' }}>还没有保存的计划</p>
              <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>生成行程后会自动保存到这里</p>
            </div>
            <Link href="/"
              className="mt-2 px-5 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB' }}>
              去生成行程
            </Link>
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
                return (
                  <motion.div
                    key={plan.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.28, delay: i < 6 ? i * 0.04 : 0 }}
                  >
                    <div
                      className="rounded-lg overflow-hidden"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                        opacity: isDeleting ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <Link href={`/plans/${plan.id}`} className="block p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h2 className="font-semibold leading-snug" style={{ color: '#0F172A' }}>{plan.title}</h2>
                          <span className="shrink-0 text-xs" style={{ color: '#94A3B8' }}>{date}</span>
                        </div>
                        {plan.summary && (
                          <p className="text-sm line-clamp-2 mb-3" style={{ color: '#64748B' }}>{plan.summary}</p>
                        )}
                        <div className="flex flex-wrap gap-4">
                          {plan.destination && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: '#2563EB' }}>
                              <MapPin size={12} />{plan.destination}
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

                      <div
                        className="flex items-center justify-between px-5 py-2.5 border-t"
                        style={{ borderColor: '#F3F4F6', background: '#FAFAFA' }}
                      >
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          {plan.start_date} {plan.end_date && `→ ${plan.end_date}`}
                        </span>
                        <button
                          onClick={(e) => { e.preventDefault(); handleDelete(plan.id) }}
                          disabled={isDeleting}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-all disabled:opacity-40"
                          style={{
                            background: confirmDelete === plan.id ? '#FEF2F2' : 'transparent',
                            color:      confirmDelete === plan.id ? '#EF4444' : '#94A3B8',
                            border:     confirmDelete === plan.id ? '1px solid #FECACA' : '1px solid transparent',
                          }}
                        >
                          <Trash2 size={11} />
                          {confirmDelete === plan.id ? '确认删除' : '删除'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* 分页 */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => fetchPlans(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ border: '1px solid #E5E7EB', color: '#64748B', background: '#FFFFFF' }}
            >
              <ChevronLeft size={14} />
              上一页
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                // 只显示：第1页、最后一页、当前页前后各1页，其余用省略号
                const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1
                const showEllipsisBefore = p === page - 2 && page - 2 > 1
                const showEllipsisAfter  = p === page + 2 && page + 2 < totalPages
                if (showEllipsisBefore || showEllipsisAfter) {
                  return <span key={p} className="px-1 text-xs" style={{ color: '#CBD5E1' }}>···</span>
                }
                if (!show) return null
                return (
                  <button
                    key={p}
                    onClick={() => fetchPlans(p)}
                    className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: p === page ? '#2563EB' : '#FFFFFF',
                      color:      p === page ? '#FFFFFF' : '#64748B',
                      border:     `1px solid ${p === page ? '#2563EB' : '#E5E7EB'}`,
                    }}
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => fetchPlans(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ border: '1px solid #E5E7EB', color: '#64748B', background: '#FFFFFF' }}
            >
              下一页
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
