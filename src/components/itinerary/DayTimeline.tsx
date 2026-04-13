'use client';

import { useState, useRef, useEffect } from 'react';
import { Timeline, ConfigProvider } from 'antd';
import { Clock, MapPin, DollarSign, Navigation, AlertTriangle, RefreshCw, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Activity, DayPlan } from '@/lib/agents/types';
import type { DayWeather } from '@/lib/weather';
import { RefineInput } from '@/components/form/RefineInput';
import { getCurrencySymbol } from '@/lib/currency';

/* 呼吸灯样式 */
const BREATHE_STYLE = `
  @keyframes breathe-border {
    0%, 100% { box-shadow: 0 0 0 1.5px rgba(37,99,235,0.25); border-color: rgba(37,99,235,0.25); }
    50%       { box-shadow: 0 0 0 2px rgba(37,99,235,0.9), 0 0 12px 3px rgba(37,99,235,0.20); border-color: rgba(37,99,235,0.9); }
  }
  .breathe-card {
    animation: breathe-border 2s ease-in-out infinite;
  }
`

/** 从 cost 字符串中提取数字，支持 "60元"、"约100-150元"、"¥200" 等格式 */
function parseCost(cost?: string): { min: number; max: number } | null {
  if (!cost) return null
  const nums = [...cost.matchAll(/\d+\.?\d*/g)].map(m => parseFloat(m[0])).filter(n => n > 0 && n < 100000)
  if (!nums.length) return null
  return { min: Math.min(...nums), max: Math.max(...nums) }
}

/** 计算一天所有活动的费用汇总 */
function calcDayCost(plan: DayPlan): { min: number; max: number } | null {
  const acts = [...(plan.morning ?? []), ...(plan.afternoon ?? []), ...(plan.evening ?? [])]
  let totalMin = 0, totalMax = 0, hasAny = false
  for (const act of acts) {
    const c = parseCost(act.cost)
    if (c) { totalMin += c.min; totalMax += c.max; hasAny = true }
  }
  return hasAny ? { min: totalMin, max: totalMax } : null
}

interface DayTimelineProps {
  dayPlans:          DayPlan[];
  activeDay:         number;
  onDayChange:       (day: number) => void;
  refineMode?:       boolean;
  onActivityClick?:  (activity: Activity) => void;
  weatherMap?:       Map<string, DayWeather>
  activePOIId?:      string
  onMapPin?:         (poiId: string) => void
  onReplanDay?:      (dayIndex: number, feedback?: string) => void
  replanningDay?:    number | null
  currency?:         string   // 货币代码，用于每日费用汇总
}

export function DayTimeline({ dayPlans, activeDay, onDayChange, refineMode = false, onActivityClick, weatherMap, activePOIId, onMapPin, onReplanDay, replanningDay, currency }: DayTimelineProps) {
  if (!dayPlans || !Array.isArray(dayPlans) || dayPlans.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm" style={{ color: '#94A3B8' }}>
        暂无行程数据
      </div>
    );
  }

  const safeActiveDay = Math.max(0, Math.min(activeDay, dayPlans.length - 1));
  const plan = dayPlans[safeActiveDay];
  if (!plan) return null;

  // 反馈输入框状态（每次切换天时重置）
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  // 切换天时重置
  useEffect(() => { setShowFeedback(false); setFeedback(''); }, [safeActiveDay]);

  const sections = [
    { label: '上午', labelEn: 'Morning',   activities: plan.morning   ?? [] },
    { label: '下午', labelEn: 'Afternoon', activities: plan.afternoon ?? [] },
    { label: '晚上', labelEn: 'Evening',   activities: plan.evening   ?? [] },
  ].filter((s) => s.activities.length > 0);

  const timelineItems = sections.flatMap((section) => [
    {
      icon: <span />,
      content: (
        <div className="flex items-center gap-2 -ml-1 mb-1 mt-1">
          <span className="text-xs font-medium" style={{ color: '#2563EB' }}>{section.label}</span>
          <span className="text-xs" style={{ color: '#CBD5E1' }}>{section.labelEn}</span>
        </div>
      ),
    },
    ...section.activities.map((activity) => ({
        icon: (
          <div
            className="w-2 h-2 rounded-full border-[1.5px] bg-white mt-[3px]"
            style={{ borderColor: '#2563EB' }}
          />
        ),
        content: (
          <ActivityCard
            activity={activity}
            refineMode={refineMode}
            onClick={refineMode ? () => onActivityClick?.(activity) : undefined}
            activePOIId={activePOIId}
            onMapPin={onMapPin}
          />
        ),
      })),
  ])

  return (
    <div className="flex flex-col gap-5">
      {/* 呼吸灯样式注入 */}
      {refineMode && <style dangerouslySetInnerHTML={{ __html: BREATHE_STYLE }} />}

      {/* Day 标签页 + 重新规划按钮同一行 */}
      <div className="flex items-center gap-1">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide flex-1 min-w-0">
          {dayPlans.map((dp, i) => {
            const w = weatherMap?.get(dp.date ?? '')
            return (
              <button
                key={i}
                onClick={() => onDayChange(i)}
                aria-pressed={i === safeActiveDay}
                aria-label={`第 ${i + 1} 天：${dp.title}`}
                className="shrink-0 px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 flex flex-col items-center gap-0.5"
                style={{
                  background:   i === safeActiveDay ? '#2563EB' : 'transparent',
                  border:       '1px solid',
                  borderColor:  i === safeActiveDay ? '#2563EB' : '#E2E8F0',
                  color:        i === safeActiveDay ? '#FFFFFF'  : '#94A3B8',
                  borderRadius: 8,
                  minWidth:     64,
                }}
              >
                <span>Day {i + 1}</span>
                {w && (
                  <span className="flex items-center gap-0.5 text-xs leading-none" style={{ opacity: 0.9 }}>
                    <span>{w.icon}</span>
                    <span style={{ fontSize: 10 }}>{w.tempMax}°</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 重新规划按钮 — 最右端，含天数 */}
        {onReplanDay && (
          <button
            onClick={() => {
              if (replanningDay !== null && replanningDay !== undefined) return
              setShowFeedback(f => !f)
              setFeedback('')
            }}
            disabled={replanningDay !== null && replanningDay !== undefined}
            className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 cursor-pointer transition-all"
            title={`重新规划第 ${safeActiveDay + 1} 天`}
            style={{
              background:   showFeedback ? '#EFF6FF' : '#FFFFFF',
              border:       `1px solid ${showFeedback ? '#BFDBFE' : '#E2E8F0'}`,
              borderRadius: 8,
              color:        replanningDay === safeActiveDay ? '#2563EB' : showFeedback ? '#2563EB' : '#64748B',
              opacity:      (replanningDay !== null && replanningDay !== undefined && replanningDay !== safeActiveDay) ? 0.4 : 1,
              whiteSpace:   'nowrap',
            }}
          >
            {replanningDay === safeActiveDay
              ? <Loader2 size={11} className="animate-spin" />
              : <RefreshCw size={11} />
            }
            <span>
              {replanningDay === safeActiveDay
                ? '规划中...'
                : `重新规划第 ${safeActiveDay + 1} 天`
              }
            </span>
            {!replanningDay && !showFeedback && <ChevronDown size={10} style={{ opacity: 0.5 }} />}
          </button>
        )}
      </div>

      {/* 恶劣天气警告 */}
      {(() => {
        const w = weatherMap?.get(plan.date ?? '')
        if (!w?.severe) return null
        return (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
            style={{ background: '#FEF9C3', border: '1px solid #FDE047', color: '#854D0E' }}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: '#CA8A04' }} />
            <span>{w.severeMsg}</span>
          </div>
        )
      })()}

      {/* 当天内容 */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={safeActiveDay}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="flex flex-col gap-4"
        >
          {/* 当天标题 */}
          <div className="flex flex-col gap-2">
            <div style={{ borderLeft: '3px solid #2563EB', paddingLeft: 12 }}>
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                第 {safeActiveDay + 1} 天{/^\d{4}-\d{2}-\d{2}$/.test(plan.date ?? '') ? ` · ${plan.date}` : ''}
              </p>
              <h3 className="text-base font-semibold mt-0.5" style={{ color: '#0F172A' }}>
                {plan.title}
              </h3>
            </div>

            {/* 反馈输入框（@ 触发 POI 选择） */}
            <AnimatePresence>
              {showFeedback && onReplanDay && (
                <FeedbackBox
                  dayPlan={plan}
                  dayIndex={safeActiveDay}
                  onConfirm={(fb) => {
                    setShowFeedback(false)
                    onReplanDay(safeActiveDay, fb || undefined)
                    setFeedback('')
                  }}
                  onCancel={() => { setShowFeedback(false); setFeedback('') }}
                  feedback={feedback}
                  setFeedback={setFeedback}
                />
              )}
            </AnimatePresence>
          </div>

          {/* antd Timeline */}
          <ConfigProvider
            theme={{
              components: {
                Timeline: {
                  tailColor:         '#F1F5F9',
                  tailWidth:         1,
                  dotBorderWidth:    0,
                  itemPaddingBottom: 16,
                },
              },
            }}
          >
            <Timeline items={timelineItems} />
          </ConfigProvider>

          {/* 今日费用小结 */}
          {(() => {
            const cost = calcDayCost(plan)
            if (!cost) return null
            return (
              <div
                className="flex items-center gap-2 mt-1 px-1"
                style={{ fontSize: 12, color: '#64748B' }}
              >
                <DollarSign size={12} style={{ color: '#16A34A' }} />
                <span>今日预估</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>
                  {(() => {
                    const sym = getCurrencySymbol(currency)
                    return cost.min === cost.max ? `${sym}${cost.min}` : `${sym}${cost.min}–${cost.max}`
                  })()}
                </span>
              </div>
            )
          })()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── 活动卡片 ── */
interface ActivityCardProps {
  activity:    Activity;
  refineMode?: boolean;
  onClick?:    () => void;
  activePOIId?: string
  onMapPin?:   (poiId: string) => void
}

export function ActivityCard({ activity, refineMode = false, onClick, activePOIId, onMapPin }: ActivityCardProps) {
  const isClickable = !!onClick
  const poiId       = activity.poi?.id ?? activity.poi?.name
  const isActive    = !!poiId && poiId === activePOIId
  const cardRef     = useRef<HTMLDivElement>(null)

  // 地图驱动高亮时，滚动到可视区
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isActive])

  return (
    <motion.div
      ref={cardRef}
      className={`py-3 px-3.5 -mt-1${refineMode ? ' breathe-card' : ''}`}
      style={{
        background:   isActive ? '#EFF6FF' : '#FAFBFC',
        border:       `1px solid ${isActive ? '#93C5FD' : '#F1F5F9'}`,
        borderRadius: 8,
        cursor:       isClickable ? 'pointer' : undefined,
        transition:   'background 0.2s, border-color 0.2s',
      }}
      whileHover={refineMode ? { backgroundColor: '#EFF6FF', scale: 1.005 } : {}}
      whileTap={refineMode   ? { scale: 0.99 } : {}}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.()
        }
      }}
      onClick={() => onClick?.()}
    >
      {/* 时间 + 名称 + 定位按钮 */}
      <div className="flex items-baseline gap-2.5 mb-1.5">
        <span className="text-xs font-mono tabular-nums" style={{ color: '#2563EB', flexShrink: 0 }}>
          {activity.time}
        </span>
        <h4 className="text-sm font-semibold leading-snug flex-1" style={{ color: '#0F172A' }}>
          {activity.name}
        </h4>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 定位按钮：有 POI 坐标才显示 */}
          {poiId && activity.poi?.latLng && onMapPin && (
            <button
              onClick={(e) => { e.stopPropagation(); onMapPin(poiId) }}
              title="在地图上查看"
              className="flex items-center justify-center w-5 h-5 rounded cursor-pointer transition-colors"
              style={{
                background:  isActive ? '#2563EB' : 'transparent',
                border:      `1px solid ${isActive ? '#2563EB' : '#E2E8F0'}`,
                color:       isActive ? '#FFFFFF' : '#94A3B8',
                flexShrink:  0,
              }}
            >
              <MapPin size={10} />
            </button>
          )}
          {refineMode && (
            <span className="text-xs" style={{ color: '#94A3B8' }}>@ 引用</span>
          )}
        </div>
      </div>

      {/* 描述 */}
      <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
        {activity.description}
      </p>

      {/* 元信息 */}
      <div className="flex flex-wrap gap-3 mt-2">
        {activity.duration && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
            <Clock size={10} />{activity.duration}
          </span>
        )}
        {activity.cost && (
          <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
            <DollarSign size={10} />{activity.cost}
          </span>
        )}
        {activity.poi?.address && (
          <span className="flex items-start gap-1 text-xs" style={{ color: '#94A3B8' }}>
            <MapPin size={10} className="shrink-0 mt-0.5" />{activity.poi.address}
          </span>
        )}
      </div>

      {/* 交通提示 */}
      {activity.transport && (
        <div className="flex items-start gap-1.5 mt-2 text-xs" style={{ color: '#94A3B8' }}>
          <Navigation size={10} style={{ color: '#2563EB', flexShrink: 0, marginTop: 2 }} />
          <span>{activity.transport}</span>
        </div>
      )}
    </motion.div>
  )
}

/* ============================================================
   FeedbackBox — 复用 RefineInput（antd Mentions），样式对齐「重新调整」
   ============================================================ */
interface FeedbackBoxProps {
  dayPlan:    DayPlan
  dayIndex:   number
  feedback:   string
  setFeedback:(v: string) => void
  onConfirm:  (feedback: string) => void
  onCancel:   () => void
}

function FeedbackBox({ dayPlan, feedback, setFeedback, onConfirm, onCancel }: FeedbackBoxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex flex-col gap-3 p-3 rounded-lg"
        style={{ background: '#F8FAFF', border: '1px solid #BFDBFE' }}>
        <p className="text-xs font-medium" style={{ color: '#2563EB' }}>
          哪里不满意？输入 @ 可引用当天具体景点（可留空直接重新规划）
        </p>

        <RefineInput
          dayPlans={[dayPlan]}
          value={feedback}
          onChange={setFeedback}
          placeholder="例如：@涩谷站 附近换成更有特色的小店、整体太赶了想轻松一些..."
          rows={2}
        />

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="text-xs px-3 py-1.5 cursor-pointer"
            style={{ color: '#94A3B8', background: 'none', border: 'none' }}
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(feedback.trim())}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 cursor-pointer transition-all"
            style={{
              background: feedback.trim() ? '#2563EB' : '#F3F4F6',
              color:      feedback.trim() ? '#FFFFFF'  : '#9CA3AF',
              border: 'none', borderRadius: 6,
            }}
          >
            <RefreshCw size={10} />
            开始重新规划
          </button>
        </div>
      </div>
    </motion.div>
  )
}
