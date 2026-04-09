'use client';

import { Timeline, ConfigProvider } from 'antd';
import { Clock, MapPin, DollarSign, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Activity, DayPlan } from '@/lib/agents/types';

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

interface DayTimelineProps {
  dayPlans:          DayPlan[];
  activeDay:         number;
  onDayChange:       (day: number) => void;
  refineMode?:       boolean;
  onActivityClick?:  (activity: Activity) => void;
}

export function DayTimeline({ dayPlans, activeDay, onDayChange, refineMode = false, onActivityClick }: DayTimelineProps) {
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

  const sections = [
    { label: '上午', labelEn: 'Morning',   activities: plan.morning   ?? [] },
    { label: '下午', labelEn: 'Afternoon', activities: plan.afternoon ?? [] },
    { label: '晚上', labelEn: 'Evening',   activities: plan.evening   ?? [] },
  ].filter((s) => s.activities.length > 0);

  const timelineItems = sections.flatMap((section) => [
    {
      dot: <span />,
      children: (
        <div className="flex items-center gap-2 -ml-1 mb-1 mt-1">
          <span className="text-xs font-medium" style={{ color: '#2563EB' }}>{section.label}</span>
          <span className="text-xs" style={{ color: '#CBD5E1' }}>{section.labelEn}</span>
        </div>
      ),
    },
    ...section.activities.map((activity) => ({
      dot: (
        <div
          className="w-2 h-2 rounded-full border-[1.5px] bg-white mt-[3px]"
          style={{ borderColor: '#2563EB' }}
        />
      ),
      children: (
        <ActivityCard
          activity={activity}
          refineMode={refineMode}
          onClick={refineMode ? () => onActivityClick?.(activity) : undefined}
        />
      ),
    })),
  ])

  return (
    <div className="flex flex-col gap-5">
      {/* 呼吸灯样式注入 */}
      {refineMode && <style dangerouslySetInnerHTML={{ __html: BREATHE_STYLE }} />}

      {/* Day 标签页 */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {dayPlans.map((dp, i) => (
          <button
            key={i}
            onClick={() => onDayChange(i)}
            aria-pressed={i === safeActiveDay}
            aria-label={`第 ${i + 1} 天：${dp.title}`}
            className="shrink-0 px-4 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            style={{
              background:   i === safeActiveDay ? '#2563EB' : 'transparent',
              border:       '1px solid',
              borderColor:  i === safeActiveDay ? '#2563EB' : '#E2E8F0',
              color:        i === safeActiveDay ? '#FFFFFF'  : '#94A3B8',
              borderRadius: 6,
            }}
          >
            Day {i + 1}
          </button>
        ))}
      </div>

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
          <div style={{ borderLeft: '3px solid #2563EB', paddingLeft: 12 }}>
            <p className="text-xs" style={{ color: '#94A3B8' }}>
              第 {safeActiveDay + 1} 天{/^\d{4}-\d{2}-\d{2}$/.test(plan.date ?? '') ? ` · ${plan.date}` : ''}
            </p>
            <h3 className="text-base font-semibold mt-0.5" style={{ color: '#0F172A' }}>
              {plan.title}
            </h3>
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── 活动卡片 ── */
interface ActivityCardProps {
  activity:   Activity;
  refineMode?: boolean;
  onMapPin?:  (activity: Activity) => void;
  onClick?:   () => void;
}

export function ActivityCard({ activity, refineMode = false, onMapPin, onClick }: ActivityCardProps) {
  const isClickable = !!onClick || !!onMapPin;

  return (
    <motion.div
      className={`py-3 px-3.5 -mt-1${refineMode ? ' breathe-card' : ''}`}
      style={{
        background:   '#FAFBFC',
        border:       '1px solid #F1F5F9',
        borderRadius: 8,
        cursor:       isClickable ? 'pointer' : undefined,
      }}
      whileHover={refineMode ? { backgroundColor: '#EFF6FF', scale: 1.005 } : {}}
      whileTap={refineMode   ? { scale: 0.99 } : {}}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.();
          onMapPin?.(activity);
        }
      }}
      onClick={() => { onClick?.(); onMapPin?.(activity); }}
    >
      {/* 时间 + 名称 */}
      <div className="flex items-baseline gap-2.5 mb-1.5">
        <span className="text-xs font-mono tabular-nums" style={{ color: '#2563EB', flexShrink: 0 }}>
          {activity.time}
        </span>
        <h4 className="text-sm font-semibold leading-snug" style={{ color: '#0F172A' }}>
          {activity.name}
        </h4>
        {refineMode && (
          <span className="ml-auto text-xs shrink-0" style={{ color: '#94A3B8' }}>@ 引用</span>
        )}
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
          <span className="flex items-center gap-1 text-xs truncate max-w-[180px]" style={{ color: '#94A3B8' }}>
            <MapPin size={10} />{activity.poi.address}
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
  );
}
