'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spin } from 'antd';
import { TechBackground as LightBackground } from '@/components/portal/AuroraBackground';
import { AgentStatusPanel } from '@/components/agents/AgentStatusPanel';
import { DayTimeline } from '@/components/itinerary/DayTimeline';
import { RouteMap } from '@/components/itinerary/RouteMap';
import { XHSStyleNote } from '@/components/itinerary/XHSStyleNote';
import { ExportButton } from '@/components/itinerary/ExportButton';
import { RefineInput } from '@/components/form/RefineInput';
import type { Activity } from '@/lib/agents/types';
import type { XHSNote } from '@/lib/agents/types';
import { fetchWeather, type DayWeather } from '@/lib/weather';
import { useHomeFlow } from '@/hooks/useHomeFlow';
import { useSearchStore } from '@/lib/stores/searchStore';
import { useItineraryStore } from '@/lib/stores/itineraryStore';
import { getDeviceId } from '@/lib/deviceId';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Wallet,
  BookOpen,
  FolderOpen,
  Compass,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Globe, Lock, Loader2 as PublishLoader } from 'lucide-react';
import { HomeForm } from '@/components/home/HomeForm';
import { HeroSection } from '@/components/home/HeroSection';
import { PromptPreviewCard } from '@/components/home/PromptPreviewCard';
import { DeviceIdBadge } from '@/components/home/DeviceIdBadge';
import { FeedbackButton } from '@/components/ui/FeedbackButton';
import { SponsorButton } from '@/components/ui/SponsorButton';
import { IntroGuide } from '@/components/ui/IntroGuide';
import { FooterPowered } from '@/components/layout/FooterPowered';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { MCPBadge } from '@/components/ui/MCPBadge';

export default function HomePage() {
  const {
    step,
    previewPrompt,
    finalPrompt,
    error,
    generatePromptPreview,
    setFinalPrompt,
    startPlanning,
    interrupt,
    retryAfterFailure,
    reset,
    goBack,
    pendingRestore,
    pendingRestoreStatus,
    pendingRestorePlanId,
    confirmRestore,
    dismissRestore,
  } = useHomeFlow();

  const { params, isValid } = useSearchStore();
  const { itinerary, activeDay, setActiveDay, planId } = useItineraryStore();
  const [planCount, setPlanCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [weatherMap, setWeatherMap] = useState<Map<string, DayWeather>>(new Map());
  const [activePOIId, setActivePOIId] = useState<string | undefined>(undefined);

  // 行程完成后获取天气
  useEffect(() => {
    if (!itinerary?.days?.length) return
    const dates = itinerary.days.map(d => d.date).filter(Boolean) as string[]
    if (!dates.length) return
    let lat: number | null = null, lng: number | null = null
    outer: for (const day of itinerary.days) {
      for (const act of [...(day.morning ?? []), ...(day.afternoon ?? []), ...(day.evening ?? [])]) {
        if (act.poi?.latLng?.lat && act.poi?.latLng?.lng) {
          lat = act.poi.latLng.lat; lng = act.poi.latLng.lng; break outer
        }
      }
    }
    if (lat === null || lng === null) return
    fetchWeather(lat, lng, dates).then(setWeatherMap).catch(() => {})
  }, [itinerary]);

  // mounted 后才读 localStorage，避免 SSR/hydration 不一致
  useEffect(() => { setMounted(true); }, []);

  const deviceIdShort = mounted ? getDeviceId().slice(0, 12) : '';
  const [showRefine, setShowRefine] = useState(false);
  const [isPublic,   setIsPublic]   = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  // 每次生成新行程时重置公开状态
  useEffect(() => { setIsPublic(false); }, [planId]);
  const [refineFeedback, setRefineFeedback] = useState('');
  const [showBudgetDetail, setShowBudgetDetail] = useState(false);
  const refineInsertRef = useRef<
    ((activity: Activity, dayIndex: number) => void) | null
  >(null);

  useEffect(() => {
    const id = getDeviceId();
    if (!id) return;
    fetch(`/api/plans?deviceId=${encodeURIComponent(id)}&page=1&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.total != null && setPlanCount(d.total))
      .catch(() => {});
  }, [step]);

  const promptAreaRef = useRef<HTMLDivElement>(null);
  const planAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 'generating' || step === 'prompt-preview') {
      setTimeout(
        () =>
          promptAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          }),
        150
      );
    }
    if (step === 'planning' || step === 'done') {
      setTimeout(
        () =>
          planAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          }),
        150
      );
    }
  }, [step]);

  const isSubmittingRef = useRef(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid() || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setTimeout(() => { isSubmittingRef.current = false; }, 2000);

    generatePromptPreview({
      originCode: params.origin!.code,
      destinationCode: params.destination!.code,
      startDate: params.startDate,
      endDate: params.endDate,
      userPrompt: params.prompt,
      hotelName: params.hotelPOI?.name,
      hotelAddress: params.hotelPOI ? `${params.hotelPOI.address}` : undefined,
      mustVisitNames:
        params.mustVisit.length > 0
          ? params.mustVisit.map((p) => p.name)
          : undefined,
      mustAvoidNames:
        params.mustAvoid.length > 0
          ? params.mustAvoid.map((p) => p.name)
          : undefined,
      originAirportName: params.origin!.selectedAirportName,
      originAirportCode: params.origin!.selectedAirportCode,
      destAirportName: params.destination!.selectedAirportName,
      destAirportCode: params.destination!.selectedAirportCode,
      arrivalTime: params.arrivalTime || undefined,
      departureTime: params.departureTime || undefined,
      travelers: params.travelers ?? 1,
    });
  };

  const handleConfirm = () => {
    if (!params.origin || !params.destination || !finalPrompt.trim()) return;

    const airportHint = [
      params.origin.selectedAirportName &&
        `出发机场：${params.origin.selectedAirportName}（${params.origin.selectedAirportCode}）`,
      params.destination.selectedAirportName &&
        `抵达机场：${params.destination.selectedAirportName}（${params.destination.selectedAirportCode}）`,
    ]
      .filter(Boolean)
      .join('；');

    const extras = [
      airportHint && `[机场] ${airportHint}，请将机场作为行程起止 POI 纳入规划`,
      params.arrivalTime &&
        `[落地时间] 第一天落地时间为 ${params.arrivalTime}，请从该时间点开始规划当天行程`,
      params.departureTime &&
        `[返程时间] 最后一天返程起飞时间为 ${params.departureTime}，请确保行程在此前结束并预留前往机场的时间`,
      (params.travelers ?? 1) > 1 &&
        `[人数] 共 ${params.travelers} 人出行，请据此调整住宿、餐厅和活动容量`,
      params.hotelPOI &&
        `[酒店] 住宿地址：${params.hotelPOI.name}（${params.hotelPOI.address}，坐标 ${params.hotelPOI.lng},${params.hotelPOI.lat}），请以酒店为出发/返回基点规划每日行程`,
      params.mustVisit.length > 0 &&
        `[必去] ${params.mustVisit
          .map((p) => `${p.name}（${p.address}）`)
          .join('、')}`,
      params.mustAvoid.length > 0 &&
        `[不去] 请避开以下地点：${params.mustAvoid
          .map((p) => p.name)
          .join('、')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const enrichedPrompt = extras ? `${finalPrompt}\n\n${extras}` : finalPrompt;

    startPlanning({
      originCode: params.origin.selectedAirportCode ?? params.origin.code,
      destinationCode: params.destination.code,
      startDate: params.startDate,
      endDate: params.endDate,
      finalPrompt: enrichedPrompt,
      travelers: params.travelers ?? 1,
    });
  };

  const handleRefine = () => {
    if (!refineFeedback.trim() || !params.origin || !params.destination) return;

    // 把完整的每日行程序列化后传给 AI，让它真正知道原来规划了什么
    const currentItineraryText = itinerary
      ? JSON.stringify({
          title:  itinerary.title,
          days:   itinerary.days?.map(d => ({
            day:   d.day,
            date:  d.date,
            title: d.title,
            morning:   d.morning?.map(a => ({ time: a.time, name: a.name })),
            afternoon: d.afternoon?.map(a => ({ time: a.time, name: a.name })),
            evening:   d.evening?.map(a => ({ time: a.time, name: a.name })),
          })),
        })
      : '';

    const refinePrompt = currentItineraryText
      ? `以下是当前已生成的行程方案（JSON格式）：\n${currentItineraryText}\n\n用户调整意见：${refineFeedback.trim()}\n\n请在保留原有行程框架的基础上，只针对用户提出的问题进行调整，输出完整的新行程方案。`
      : refineFeedback.trim();

    setShowRefine(false);
    setRefineFeedback('');
    startPlanning({
      originCode: params.origin.selectedAirportCode ?? params.origin.code,
      destinationCode: params.destination.code,
      startDate: params.startDate,
      endDate: params.endDate,
      finalPrompt: refinePrompt,
    });
  };

  const xhsNotes: XHSNote[] =
    (itinerary as unknown as { xhsNotes?: XHSNote[] })?.xhsNotes ??
    (itinerary as unknown as { notes?: XHSNote[] })?.notes ??
    [];

  /* ── 未挂载时显示全屏 loading ── */
  if (!mounted) {
    return (
      <main className="relative min-h-screen flex items-center justify-center" style={{ background: '#F8FAFF' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-3"
        >
          <Spin size="large" />
          <p className="text-sm" style={{ color: '#94A3B8' }}>任意门启动中...</p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
      <LightBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        {/* 左上角 — 用户 ID + 模型标签 */}
        <motion.div
          className="fixed top-5 left-5 flex flex-col items-start gap-2"
          style={{ zIndex: 50 }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {deviceIdShort && <DeviceIdBadge id={deviceIdShort} />}
          <ModelSelector />
        </motion.div>

        {/* 右上角 — 我的计划入口（有 deviceId 且有计划时才显示）*/}
        {deviceIdShort && (
          <motion.div
            className="fixed top-5 right-5 flex items-center gap-2"
            style={{ zIndex: 50 }}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href="/explore"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#374151',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <Compass size={15} style={{ color: '#8B5CF6' }} />
              探索
            </Link>
            <Link
              href="/plans"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#374151',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <FolderOpen size={15} style={{ color: '#2563EB' }} />
              我的计划
              {planCount > 0 && (
                <span
                  className="min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: '#2563EB', fontSize: 10 }}
                >
                  {planCount}
                </span>
              )}
            </Link>
          </motion.div>
        )}

        <div className="max-w-6xl mx-auto px-4 pt-8">
          <div className="max-w-3xl mx-auto">
            {/* Hero */}
            <HeroSection />

            {/* Form — 始终可见，带进入动画 */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <HomeForm
                onSubmit={handleSubmit}
                error={error}
                isPlanning={['planning'].includes(step as string)}
                isDisabled={step === 'generating' || step === 'prompt-preview' || (step as string) === 'planning'}
              />

              {/* 上次行程记录提示 */}
              <AnimatePresence>
                {pendingRestore && step === 'form' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-center mt-2"
                  >
                    <button
                      onClick={confirmRestore}
                      className="text-xs cursor-pointer transition-opacity hover:opacity-60"
                      style={{ color: '#94A3B8', background: 'none', border: 'none', padding: 0 }}
                    >
                      {pendingRestoreStatus === 'error' || pendingRestoreStatus === 'interrupted'
                        ? '上次规划失败，点击恢复输入'
                        : '使用上次行程输入'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Prompt Preview — generating/prompt-preview 时显示，planning 时置灰保留 */}
              {(step === 'generating' ||
                step === 'prompt-preview' ||
                (step as string) === 'planning') && (
                <motion.div
                  ref={promptAreaRef}
                  key="prompt-preview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-5"
                >
                  <PromptPreviewCard
                    isGenerating={step === 'generating'}
                    isPlanning={(step as string) === 'planning'}
                    prompt={step === 'generating' ? previewPrompt : finalPrompt}
                    onChange={setFinalPrompt}
                    onBack={goBack}
                    onConfirm={handleConfirm}
                    onInterrupt={interrupt}
                  />
                </motion.div>
              )}
            </motion.div>

            {/* Agent Progress */}
            {(step as string) === 'planning' && (
              <div ref={planAreaRef} className="mt-5">
                <AgentStatusPanel />
              </div>
            )}
          </div>
        </div>

        {/* Itinerary Output */}
        <AnimatePresence>
          {step === 'done' && itinerary && (
            <motion.div
              key="itinerary"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.1,
              }}
              className="pb-20"
            >
              <div className="max-w-6xl mx-auto px-4 pt-12">
                <div className="flex flex-col gap-4">
                  {/* Header Card */}
                  <div
                    id="itinerary-header"
                    className="rounded-lg"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      boxShadow:
                        '0 2px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08)',
                    }}
                  >
                    <div className="px-6 pt-6 pb-4">
                      <h2
                        className="font-bold"
                        style={{
                          fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                          color: '#0F172A',
                          lineHeight: 1.25,
                        }}
                      >
                        {itinerary.title}
                      </h2>
                      <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: '#64748B' }}
                      >
                        {itinerary.summary}
                      </p>
                      <div className="flex flex-wrap gap-4 mt-3">
                        {[
                          {
                            icon: <MapPin size={12} />,
                            text:
                              params.destination?.name ?? itinerary.destination,
                          },
                          {
                            icon: <Calendar size={12} />,
                            text: `${itinerary.days?.length ?? 0} 天`,
                          },
                          {
                            icon: <Wallet size={12} />,
                            text:
                              itinerary.budget?.low && itinerary.budget?.high
                                ? `预算 ¥${itinerary.budget.low}–${itinerary.budget.high}`
                                : '预算待定',
                          },
                        ].map(({ icon, text }, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1.5 text-xs font-medium"
                            style={{ color: '#2563EB' }}
                          >
                            {icon}
                            {text}
                          </span>
                        ))}
                        {/* 每日费用明细展开按钮 */}
                        {itinerary.days?.length > 0 && (
                          <button
                            onClick={() => setShowBudgetDetail(v => !v)}
                            className="flex items-center gap-1 text-xs transition-colors"
                            style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {showBudgetDetail ? '收起明细' : '查看明细'}
                            {showBudgetDetail
                              ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            }
                          </button>
                        )}
                      </div>

                      {/* 每日费用明细 */}
                      {showBudgetDetail && (() => {
                        const parseCost = (cost?: string) => {
                          if (!cost) return null
                          const nums = [...cost.matchAll(/\d+\.?\d*/g)].map(m => parseFloat(m[0])).filter(n => n > 0 && n < 100000)
                          if (!nums.length) return null
                          return { min: Math.min(...nums), max: Math.max(...nums) }
                        }
                        const dayCosts = (itinerary.days ?? []).map((day: { title?: string; morning?: { cost?: string }[]; afternoon?: { cost?: string }[]; evening?: { cost?: string }[] }, idx: number) => {
                          const acts = [...(day.morning ?? []), ...(day.afternoon ?? []), ...(day.evening ?? [])]
                          let min = 0, max = 0
                          for (const a of acts) {
                            const c = parseCost(a.cost)
                            if (c) { min += c.min; max += c.max }
                          }
                          return { title: day.title ?? `第${idx + 1}天`, min, max, hasData: min > 0 || max > 0 }
                        }).filter(d => d.hasData)

                        if (!dayCosts.length) return null
                        const total = dayCosts.reduce((s, d) => s + d.max, 0)

                        // 饼图用 SVG conic-gradient 模拟
                        const COLORS = ['#2563EB','#3B82F6','#60A5FA','#93C5FD','#1D4ED8','#1E40AF','#BFDBFE']
                        let cumPct = 0
                        const slices = dayCosts.map((d, i) => {
                          const pct = total > 0 ? (d.max / total) * 100 : 0
                          const start = cumPct
                          cumPct += pct
                          return { ...d, pct, start, color: COLORS[i % COLORS.length] }
                        })

                        return (
                          <div className="mt-4" style={{ fontSize: 12 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ color: '#94A3B8' }}>
                                  <th style={{ textAlign: 'left', fontWeight: 500, paddingBottom: 6, paddingRight: 8 }}>日期</th>
                                  <th style={{ textAlign: 'right', fontWeight: 500, paddingBottom: 6 }}>费用</th>
                                  <th style={{ textAlign: 'right', fontWeight: 500, paddingBottom: 6, paddingLeft: 8 }}>占比</th>
                                </tr>
                              </thead>
                              <tbody>
                                {slices.map((d, i) => (
                                  <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '5px 8px 5px 0', color: '#374151' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                                        {d.title}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'right', color: '#0F172A', fontWeight: 600, padding: '5px 0' }}>
                                      {d.min === d.max ? `¥${d.min}` : `¥${d.min}–${d.max}`}
                                    </td>
                                    <td style={{ textAlign: 'right', color: '#94A3B8', padding: '5px 0 5px 8px' }}>
                                      {d.pct.toFixed(0)}%
                                    </td>
                                  </tr>
                                ))}
                                <tr style={{ borderTop: '2px solid #E2E8F0' }}>
                                  <td style={{ padding: '6px 8px 0 0', color: '#64748B', fontWeight: 500 }}>合计</td>
                                  <td style={{ textAlign: 'right', color: '#2563EB', fontWeight: 700, paddingTop: 6 }}>¥{total}</td>
                                  <td />
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}
                    </div>
                    <div
                      className="px-6 pb-4 flex items-center gap-2 flex-wrap"
                      style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}
                    >
                      <ExportButton
                        itinerary={itinerary}
                        extra={
                          <button
                            onClick={async () => {
                              if (!planId || togglingPublic) return
                              setTogglingPublic(true)
                              const next = !isPublic
                              try {
                                const res = await fetch(`/api/plans/${planId}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ isPublic: next, deviceId: getDeviceId() }),
                                })
                                if (res.ok) setIsPublic(next)
                              } catch { /* 静默 */ } finally { setTogglingPublic(false) }
                            }}
                            disabled={!planId || togglingPublic}
                            className="flex items-center gap-1.5 cursor-pointer transition-all duration-150 whitespace-nowrap"
                            style={{
                              background:   isPublic ? '#EFF6FF' : '#FFFFFF',
                              border:       `1px solid ${isPublic ? '#BFDBFE' : '#E2E8F0'}`,
                              color:        isPublic ? '#2563EB' : '#64748B',
                              padding:      '7px 14px',
                              borderRadius: 8,
                              fontSize:     13,
                              fontWeight:   500,
                              opacity:      (!planId || togglingPublic) ? 0.6 : 1,
                            }}
                          >
                            {togglingPublic
                              ? <PublishLoader size={13} className="animate-spin" />
                              : isPublic ? <Globe size={13} /> : <Lock size={13} />
                            }
                            {isPublic ? '已公开' : '设为公开'}
                          </button>
                        }
                      />
                      <button
                        onClick={() => setShowRefine((v) => !v)}
                        className="flex items-center gap-1.5 cursor-pointer transition-all duration-150 hover:bg-gray-50 whitespace-nowrap"
                        style={{
                          background: showRefine ? '#EFF6FF' : '#FFFFFF',
                          border: `1px solid ${showRefine ? '#BFDBFE' : '#E2E8F0'}`,
                          color: showRefine ? '#2563EB' : '#64748B',
                          padding: '7px 14px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        <RefreshCw size={13} />
                        调整行程
                      </button>
                    </div>

                    {/* Refine Panel */}
                    <AnimatePresence>
                      {showRefine && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          style={{ borderTop: '1px solid #F3F4F6' }}
                        >
                          <div className="px-6 py-4 flex flex-col gap-3">
                            <p
                              className="text-xs font-medium"
                              style={{ color: '#6B7280' }}
                            >
                              告诉 AI 你想调整哪里
                            </p>

                            <div className="flex flex-wrap gap-1.5">
                              {[
                                '回酒店时间太晚了，请提前',
                                '行程太密集，节奏放慢一些',
                                '某个地点不想去，请替换',
                                '景点之间距离太远，优化路线',
                                '预算超了，换一些免费景点',
                                '增加一个好的餐厅推荐',
                              ].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() =>
                                    setRefineFeedback((v) =>
                                      v ? `${v}；${t}` : t
                                    )
                                  }
                                  className="text-xs px-2.5 py-1 cursor-pointer transition-all"
                                  style={{
                                    background: '#F8FAFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 6,
                                    color: '#64748B',
                                  }}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>

                            <RefineInput
                              dayPlans={itinerary.days ?? []}
                              value={refineFeedback}
                              onChange={setRefineFeedback}
                              insertRef={refineInsertRef}
                              placeholder="描述调整需求，输入 @ 搜索并引用行程地点，或点击下方卡片直接引用..."
                              rows={3}
                            />

                            <button
                              type="button"
                              onClick={handleRefine}
                              disabled={!refineFeedback.trim()}
                              className="w-full flex items-center justify-center gap-2 text-sm font-medium transition-all"
                              style={{
                                background: refineFeedback.trim()
                                  ? '#2563EB'
                                  : '#F3F4F6',
                                color: refineFeedback.trim()
                                  ? '#FFFFFF'
                                  : '#9CA3AF',
                                border: 'none',
                                borderRadius: 8,
                                padding: '10px 0',
                                cursor: refineFeedback.trim()
                                  ? 'pointer'
                                  : 'not-allowed',
                              }}
                            >
                              <Send size={13} />
                              重新规划
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Timeline + Map */}
                  <div
                    id="itinerary-day-row"
                    className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start"
                  >
                    <div
                      id="itinerary-timeline"
                      className="lg:col-span-3 rounded-lg p-6"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      }}
                    >
                      <DayTimeline
                        dayPlans={itinerary.days ?? []}
                        activeDay={activeDay}
                        onDayChange={(d) => { setActiveDay(d); setActivePOIId(undefined); }}
                        refineMode={showRefine}
                        weatherMap={weatherMap}
                        activePOIId={activePOIId}
                        onMapPin={(poiId) => setActivePOIId(poiId)}
                        onActivityClick={(activity) => {
                          const dayIndex = (itinerary.days ?? []).findIndex(
                            (d) =>
                              [
                                ...(d.morning ?? []),
                                ...(d.afternoon ?? []),
                                ...(d.evening ?? []),
                              ].includes(activity)
                          );
                          refineInsertRef.current?.(
                            activity,
                            dayIndex >= 0 ? dayIndex : activeDay
                          );
                        }}
                      />
                    </div>

                    <div
                      id="itinerary-map"
                      className="lg:col-span-2 lg:sticky lg:top-6"
                    >
                      {itinerary.days?.[activeDay] ? (
                        <RouteMap
                          dayPlan={itinerary.days[activeDay]}
                          activePOIId={activePOIId}
                          onMarkerClick={(poiId) => setActivePOIId(poiId)}
                        />
                      ) : (
                        <div
                          className="rounded-lg flex items-center justify-center"
                          style={{
                            minHeight: 320,
                            background: '#F8FAFF',
                            border: '1px solid #E2E8F0',
                          }}
                        >
                          <p className="text-sm" style={{ color: '#94A3B8' }}>
                            暂无地图数据
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* XHS Notes */}
                  {xhsNotes.length > 0 && (
                    <div
                      className="rounded-lg p-6"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <BookOpen size={15} style={{ color: '#818CF8' }} />
                        <h3
                          className="text-sm font-semibold"
                          style={{ color: '#0F172A' }}
                        >
                          实用攻略参考
                        </h3>
                        <span className="text-xs" style={{ color: '#94A3B8' }}>
                          AI 整理 · 小红书精选
                        </span>
                      </div>
                      <div className="space-y-2">
                        {xhsNotes.map((note, i) => (
                          <XHSStyleNote key={i} note={note} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Failed State */}
          {step === 'done' && !itinerary && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-3xl mx-auto px-4 pt-12 pb-20"
            >
              <div
                className="rounded-lg p-8 flex flex-col items-center text-center gap-4"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #FECACA',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.06)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ background: '#FEF2F2' }}
                >
                  😞
                </div>
                <div>
                  <h3
                    className="font-semibold text-base mb-1"
                    style={{ color: '#0F172A' }}
                  >
                    行程生成失败
                  </h3>
                  <p className="text-sm" style={{ color: '#64748B' }}>
                    AI 在整合行程时遇到问题，可能是网络超时或服务繁忙
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (planId) {
                        fetch(`/api/plans/${planId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'error' }),
                        }).catch(() => {});
                      }
                      retryAfterFailure();
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.30)',
                      border: 'none',
                    }}
                  >
                    <RefreshCw size={14} />
                    重试规划
                  </button>
                  <button
                    onClick={() => {
                      if (planId) {
                        fetch(`/api/plans/${planId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'error' }),
                        }).catch(() => {});
                      }
                      reset();
                    }}
                    className="text-sm cursor-pointer transition-all"
                    style={{ color: '#94A3B8', background: 'none', border: 'none', padding: 0 }}
                  >
                    重新填写
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <FooterPowered />

      {/* 左下角 — MCP 接入说明 */}
      <motion.div
        className="fixed bottom-6 left-6 z-40"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <MCPBadge />
      </motion.div>

      {/* 右下角功能按钮组（垂直排列） */}
      <motion.div
        className="fixed bottom-6 right-6 z-40 flex flex-col gap-2"
        style={{ alignItems: 'stretch', width: 80 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <IntroGuide />
        <FeedbackButton />
        <SponsorButton />
      </motion.div>
    </main>
  );
}
