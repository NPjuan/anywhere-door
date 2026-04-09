'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Segmented, ConfigProvider } from 'antd'
import { FlightCard } from './FlightCard'
import { FlightCardSkeleton } from '@/components/ui/Skeleton'
import { useFlightStore } from '@/lib/stores/flightStore'

/* ============================================================
   FlightList — 机票结果列表
   Flight results list with sorting/filtering
   ============================================================ */

export function FlightList() {
  const searchParams = useSearchParams()
  const {
    loadState, error, source,
    sortBy, setSortBy,
    selected, selectFlight,
    setLoading, setOffers, setError,
    getFilteredOffers,
  } = useFlightStore()

  const adults = Number(searchParams.get('adults') ?? 1)

  /* 从 URL 参数发起搜索 / Trigger search from URL params */
  useEffect(() => {
    const from  = searchParams.get('from')
    const to    = searchParams.get('to')
    const date  = searchParams.get('date')
    if (!from || !to || !date) return

    setLoading()
    const query = new URLSearchParams()
    query.set('from', from)
    query.set('to', to)
    query.set('date', date)
    if (searchParams.get('return')) query.set('return', searchParams.get('return')!)
    query.set('adults', String(adults))

    fetch(`/api/flights?${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setOffers(data.offers ?? [], data.source ?? 'unknown')
      })
      .catch((e) => setError(e.message))
  }, [searchParams, setLoading, setOffers, setError, adults])

  const offers = getFilteredOffers()

  /* ── 加载骨架屏 / Loading skeleton ── */
  if (loadState === 'loading') {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <FlightCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  /* ── 错误状态 / Error state ── */
  if (loadState === 'error') {
    return (
      <div
        className="rounded-[var(--radius-xl)] p-8 text-center"
        style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.55)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>搜索失败</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{error}</p>
      </div>
    )
  }

  /* ── 空状态 / Empty state ── */
  if (loadState === 'success' && offers.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-xl)] p-10 text-center"
        style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.55)' }}
      >
        <Plane className="mx-auto mb-3 opacity-30" size={32} style={{ color: 'var(--color-primary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>未找到符合条件的航班</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          试试调整日期或出发城市
        </p>
      </div>
    )
  }

  /* ── 结果列表 / Results ── */
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#0EA5E9', fontFamily: 'Inter, system-ui, sans-serif' } }}>
      <div className="space-y-3">
        {/* 排序 + 结果数 / Sort + count */}
        {loadState === 'success' && (
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              找到 <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{offers.length}</span> 个航班
              {source && source !== 'mock' && (
                <span className="ml-1.5 text-xs opacity-60">· {source}</span>
              )}
            </p>
            <Segmented
              value={sortBy}
              onChange={(v) => setSortBy(v as typeof sortBy)}
              options={[
                { label: '推荐', value: 'best' },
                { label: '最低价', value: 'price' },
                { label: '最快', value: 'duration' },
              ]}
              size="small"
              style={{ background: 'rgba(255,255,255,0.6)' }}
            />
          </div>
        )}

        {/* 机票卡片列表 / Flight cards */}
        {offers.map((offer, i) => (
          <FlightCard
            key={offer.id}
            offer={offer}
            adults={adults}
            selected={selected?.id === offer.id}
            onSelect={selectFlight}
            index={i}
          />
        ))}
      </div>
    </ConfigProvider>
  )
}

/* 需要在组件内用，抽出来避免引用问题 */
function Plane({ size, className, style }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2l2.3 2.3-1.6 4 4 1.6 2.3 2.3zM5 18l4-4M6 20l2-2"/>
    </svg>
  )
}
