'use client'

import { motion } from 'framer-motion'
import { Plane, Clock, ArrowRight, Users, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import {
  formatDuration, formatTime, formatDate,
  type FlightOffer,
} from '@/lib/api/flights/types'
import { POPULAR_CITIES } from '@/lib/cities'

/* ============================================================
   FlightCard — 单张机票卡片
   Single flight offer card

   风格: 白色磨砂玻璃 + hover 上浮
   Style: Frosted glass white + hover lift
   来源: design-system/pages/search-results.md
   ============================================================ */

interface FlightCardProps {
  offer:    FlightOffer
  adults:   number
  selected: boolean
  onSelect: (offer: FlightOffer) => void
  index:    number   // 用于进场动画错开 / For staggered entrance animation
}

const AIRLINE_LOGO_COLORS: Record<string, string> = {
  CA: '#E8001D', MU: '#1564B0', CZ: '#0052A5',
  HU: '#E4173E', '3U': '#E60026', ZH: '#006DB7',
  FM: '#E60012', '9C': '#FF6600', GS: '#005BAC',
}

export function FlightCard({ offer, adults, selected, onSelect, index }: FlightCardProps) {
  const outbound = offer.itineraries[0]
  const seg      = outbound?.segments[0]
  if (!seg) return null

  const totalStops = outbound.segments.reduce((a, s) => a + s.stops, 0) +
                     (outbound.segments.length - 1)

  const originCity  = POPULAR_CITIES.find((c) => c.code === seg.origin.code)
  const destCity    = POPULAR_CITIES.find((c) => c.code === seg.destination.code)

  const logoColor = AIRLINE_LOGO_COLORS[seg.carrier] ?? 'var(--color-primary)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        role="article"
        aria-label={`${seg.carrierName} ${seg.flightNumber} — ¥${offer.price.per_adult}`}
        onClick={() => onSelect(offer)}
        className={cn(
          'relative w-full rounded-[var(--radius-lg)] cursor-pointer',
          'border transition-all duration-[var(--duration-base)]',
          'bg-white/70 backdrop-blur-[8px]',
          selected
            ? 'border-[var(--color-primary)] shadow-[0_0_0_2px_rgba(14,165,233,0.2),0_4px_20px_rgba(14,165,233,0.12)]'
            : 'border-white/60 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-[0_8px_24px_rgba(14,165,233,0.12)]',
        )}
      >
        <div className="p-4">
          {/* ── 顶部：航司 + 价格 / Top: airline + price ── */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              {/* 航司色块 Logo / Airline color logo */}
              <div
                className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: logoColor }}
                aria-hidden="true"
              >
                {seg.carrier}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {seg.carrierName}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {seg.flightNumber}
                  {offer.source === 'mock' && (
                    <span className="ml-1.5 opacity-50">(示例数据)</span>
                  )}
                </p>
              </div>
            </div>

            {/* 价格 / Price */}
            <div className="text-right">
              <p
                className="text-2xl font-bold leading-none"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: selected ? 'var(--color-primary)' : 'var(--color-text)',
                }}
              >
                ¥{Math.round(offer.price.per_adult).toLocaleString()}
              </p>
              {adults > 1 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  共 ¥{Math.round(offer.price.total).toLocaleString()}
                </p>
              )}
              <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                /人
              </p>
            </div>
          </div>

          {/* ── 中部：行程时间线 / Middle: route timeline ── */}
          <div className="flex items-center gap-3">
            {/* 出发 / Departure */}
            <div className="text-center min-w-[52px]">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--color-text)' }}>
                {formatTime(seg.origin.time)}
              </p>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-primary)' }}>
                {originCity?.name ?? seg.origin.code}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                {seg.origin.code}
              </p>
            </div>

            {/* 中间线 / Center line */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Clock size={11} />
                <span>{formatDuration(outbound.totalDuration)}</span>
              </div>
              <div className="w-full flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                <div className="flex-1 h-px" style={{ background: 'var(--color-border-strong)' }} />
                <Plane size={13} style={{ color: 'var(--color-primary)' }} />
                <div className="flex-1 h-px" style={{ background: 'var(--color-border-strong)' }} />
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
              </div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.8 }}>
                {totalStops === 0 ? '直飞' : `经停 ${totalStops} 次`}
              </div>
            </div>

            {/* 到达 / Arrival */}
            <div className="text-center min-w-[52px]">
              <p className="text-lg font-bold leading-none" style={{ color: 'var(--color-text)' }}>
                {formatTime(seg.destination.time)}
              </p>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-primary)' }}>
                {destCity?.name ?? seg.destination.code}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                {seg.destination.code}
              </p>
            </div>
          </div>

          {/* ── 底部：标签 + 按钮 / Bottom: badges + button ── */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 flex-wrap">
              {offer.seats !== undefined && offer.seats <= 5 && (
                <Badge variant="error" dot>仅剩 {offer.seats} 座</Badge>
              )}
              <Badge variant="default">
                <Users size={11} className="mr-0.5" />
                {adults}人
              </Badge>
              <Badge variant="default">{offer.cabinClass === 'ECONOMY' ? '经济舱' : offer.cabinClass}</Badge>
              {totalStops === 0 && <Badge variant="success"><Zap size={11} className="mr-0.5" />直飞</Badge>}
              {/* 数据来源标识（开发模式）/ Source badge (dev) */}
              {process.env.NODE_ENV === 'development' && (
                <Badge
                  variant={offer.source === 'amadeus' ? 'primary' : offer.source === 'mock' ? 'default' : 'warning'}
                  dot
                >
                  {offer.source}
                </Badge>
              )}
            </div>

            <Button
              variant={selected ? 'primary' : 'outline'}
              size="sm"
              icon={selected ? <Plane size={13} /> : <ArrowRight size={13} />}
              className="shrink-0"
              onClick={(e) => { e.stopPropagation(); onSelect(offer) }}
            >
              {selected ? '已选' : '选择'}
            </Button>
          </div>
        </div>

        {/* 往返回程摘要 / Return itinerary summary */}
        {offer.itineraries[1] && (
          <div
            className="px-4 py-2.5 border-t flex items-center gap-2 text-xs"
            style={{
              color:       'var(--color-text-muted)',
              borderColor: 'var(--color-border)',
              background:  'rgba(14,165,233,0.03)',
            }}
          >
            <ArrowRight size={12} className="opacity-50 -scale-x-100" />
            <span>返程：</span>
            <span className="font-medium">
              {formatTime(offer.itineraries[1].segments[0].origin.time)}
            </span>
            <span>→</span>
            <span className="font-medium">
              {formatTime(offer.itineraries[1].segments[0].destination.time)}
            </span>
            <span className="opacity-70">
              {formatDate(offer.itineraries[1].segments[0].origin.time)}
            </span>
            <span className="ml-auto opacity-60">
              {formatDuration(offer.itineraries[1].totalDuration)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
