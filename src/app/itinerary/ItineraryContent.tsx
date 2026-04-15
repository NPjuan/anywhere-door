'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Wallet, BookOpen } from 'lucide-react';
import { DeepBackground } from '@/components/portal/AuroraBackground';
import { DayTimeline } from '@/components/itinerary/DayTimeline';
import { RouteMap } from '@/components/itinerary/RouteMap';
import { XHSStyleNote } from '@/components/itinerary/XHSStyleNote';
import { ExportButton } from '@/components/itinerary/ExportButton';
import { useItineraryStore } from '@/lib/stores/itineraryStore';
import { useAgentStore } from '@/lib/stores/agentStore';
import { Button } from '@/components/ui/Button';
import { AgentProgressSkeleton } from '@/components/ui/Skeleton';
import type { XHSNote } from '@/lib/agents/types';

/* ============================================================
   ItineraryContent — 行程输出页（重设计版，无机票，大气深色）
   Itinerary output page (redesigned, no flight, bold dark)
   ============================================================ */

export default function ItineraryContent() {
  const router = useRouter();
  const { streamText } = useAgentStore();
  const { itinerary, activeDay, setItinerary, setActiveDay } =
    useItineraryStore();

  useEffect(() => {
    if (streamText && !itinerary) setItinerary(streamText);
  }, [streamText, itinerary, setItinerary]);

  const currentDayPlan = itinerary?.days?.[activeDay];

  /* ── 加载中 / Loading ── */
  if (!itinerary) {
    return (
      <main
        className="relative min-h-screen flex items-center justify-center px-4"
        style={{ background: '#020B18' }}
      >
        <DeepBackground />
        <div className="relative max-w-lg w-full" style={{ zIndex: 1 }}>
          <div
            className="rounded-[28px] p-6"
            style={{
              background: 'rgba(10,20,40,0.80)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <p
              className="text-sm font-medium mb-4"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              AI 行程解析中...
            </p>
            <AgentProgressSkeleton />
          </div>
        </div>
      </main>
    );
  }

  /* xhsNotes 兼容新旧 schema */
  const xhsNotes: XHSNote[] =
    (itinerary as unknown as { xhsNotes?: XHSNote[] }).xhsNotes ??
    (itinerary as unknown as { notes?: XHSNote[] }).notes ??
    [];

  return (
    <main
      className="relative min-h-screen pb-16"
      style={{ background: '#020B18' }}
    >
      <DeepBackground />

      <div
        className="relative max-w-6xl mx-auto px-4 pt-20"
        style={{ zIndex: 1 }}
      >
        {/* ── 顶部：标题区 ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8"
        >
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft size={14} />}
              onClick={() => router.back()}
              className="self-start"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              返回
            </Button>

            <h1
              className="font-bold leading-tight"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                color: 'white',
                textShadow: '0 0 40px rgba(56,189,248,0.3)',
              }}
            >
              {itinerary.title}
            </h1>
            <p className="text-base" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {itinerary.summary}
            </p>
            <div className="flex flex-wrap gap-4 mt-1">
              {[
                { icon: <MapPin size={13} />, text: itinerary.destination },
                {
                  icon: <Calendar size={13} />,
                  text: `${itinerary.days?.length ?? 0} 天`,
                },
                {
                  icon: <Wallet size={13} />,
                  text: itinerary.budget?.low && itinerary.budget?.high
                    ? `预算 ¥${itinerary.budget.low}–${itinerary.budget.high}`
                    : '预算待定',
                },
              ].map(({ icon, text }, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 text-sm"
                  style={{ color: '#38BDF8' }}
                >
                  {icon}
                  {text}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0">
            <ExportButton itinerary={itinerary} />
          </div>
        </motion.div>

        {/* ── 主内容：时间线 + 地图 ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-10"
        >
          {/* 左：每日时间线 */}
          <div className="lg:col-span-3">
            <DayTimeline
              dayPlans={itinerary.days}
              activeDay={activeDay}
              onDayChange={setActiveDay}
            />
          </div>

          {/* 右：高德地图（sticky）*/}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24" style={{ minHeight: 400 }}>
              {currentDayPlan ? (
                <RouteMap dayPlan={currentDayPlan} />
              ) : (
                <div
                  className="h-full rounded-[24px] flex items-center justify-center"
                  style={{
                    minHeight: 320,
                    background: 'rgba(10,20,40,0.70)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    暂无地图数据
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── 小红书笔记区 / XHS Notes ── */}
        {xhsNotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-5">
              <BookOpen size={18} style={{ color: '#818CF8' }} />
              <h2 className="text-xl font-bold" style={{ color: 'white' }}>
                旅行灵感笔记
              </h2>
              <span
                className="text-sm"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                · AI 生成 · 小红书风格
              </span>
            </div>

            {/* 横向滚动 / Horizontal scroll */}
            <div
              className="flex gap-4 overflow-x-auto pb-3"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {xhsNotes.map((note, i) => (
                <div
                  key={i}
                  className="shrink-0 w-72"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <XHSStyleNote note={note} index={i} />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── 注意事项 ── */}
        {itinerary.warnings?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-[24px] p-5 mb-8"
            style={{
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.20)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <h3
              className="text-sm font-semibold mb-3 flex items-center gap-2"
              style={{ color: '#F97316' }}
            >
              注意事项
            </h3>
            <ul className="space-y-1.5">
              {itinerary.warnings.map((w, i) => (
                <li
                  key={i}
                  className="text-xs flex gap-2"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  <span style={{ color: '#F97316' }}>·</span>
                  {w}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </main>
  );
}
