'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TechBackground as LightBackground } from '@/components/portal/AuroraBackground'
import { AgentStatusPanel } from '@/components/agents/AgentStatusPanel'
import { DayTimeline } from '@/components/itinerary/DayTimeline'
import { RouteMap } from '@/components/itinerary/RouteMap'
import { XHSStyleNote } from '@/components/itinerary/XHSStyleNote'
import { ExportButton } from '@/components/itinerary/ExportButton'
import { RefineInput } from '@/components/form/RefineInput'
import type { Activity } from '@/lib/agents/types'
import type { XHSNote } from '@/lib/agents/types'
import { useHomeFlow } from '@/hooks/useHomeFlow'
import { useSearchStore } from '@/lib/stores/searchStore'
import { useItineraryStore } from '@/lib/stores/itineraryStore'
import { getDeviceId } from '@/lib/deviceId'
import Link from 'next/link'
import {
  MapPin,
  Calendar,
  Wallet,
  BookOpen,
  FolderOpen,
  RefreshCw,
  Send,
} from 'lucide-react'
import { HomeForm } from '@/components/home/HomeForm'
import { HeroSection } from '@/components/home/HeroSection'
import { PromptPreviewCard } from '@/components/home/PromptPreviewCard'
import { PoweredByName } from '@/components/home/PoweredByName'
import { DeviceIdBadge } from '@/components/home/DeviceIdBadge'
import { PlanningWarning } from '@/components/home/PlanningWarning'

export default function HomePage() {
  const {
    step,
    previewPrompt,
    finalPrompt,
    error,
    warning,
    generatePromptPreview,
    setFinalPrompt,
    startPlanning,
    interrupt,
    retryAfterFailure,
    goBack,
  } = useHomeFlow()

  const { params, isValid } = useSearchStore()
  const { itinerary, activeDay, setActiveDay, planId } = useItineraryStore()
  const [planCount, setPlanCount] = useState(0)
  const deviceIdShort =
    typeof window !== 'undefined' ? getDeviceId().slice(0, 12) : ''
  const [showRefine, setShowRefine] = useState(false)
  const [refineFeedback, setRefineFeedback] = useState('')
  const refineInsertRef = useRef<
    ((activity: Activity, dayIndex: number) => void) | null
  >(null)

  useEffect(() => {
    const id = getDeviceId()
    if (!id) return
    fetch(`/api/plans?deviceId=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.plans && setPlanCount(d.plans.length))
      .catch(() => {})
  }, [step])

  const promptAreaRef = useRef<HTMLDivElement>(null)
  const planAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step === 'generating' || step === 'prompt-preview') {
      setTimeout(
        () =>
          promptAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          }),
        150
      )
    }
    if (step === 'planning' || step === 'done') {
      setTimeout(
        () =>
          planAreaRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          }),
        150
      )
    }
  }, [step])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid()) return

    generatePromptPreview({
      originCode: params.origin!.code,
      destinationCode: params.destination!.code,
      startDate: params.startDate,
      endDate: params.endDate,
      userPrompt: params.prompt,
      hotelName: params.hotelPOI?.name,
      hotelAddress: params.hotelPOI ? `${params.hotelPOI.address}` : undefined,
      mustVisitNames:
        params.mustVisit.length > 0 ? params.mustVisit.map((p) => p.name) : undefined,
      mustAvoidNames:
        params.mustAvoid.length > 0 ? params.mustAvoid.map((p) => p.name) : undefined,
    })
  }

  const handleConfirm = () => {
    if (!params.origin || !params.destination || !finalPrompt.trim()) return

    const airportHint = [
      params.origin.selectedAirportName &&
        `出发机场：${params.origin.selectedAirportName}（${params.origin.selectedAirportCode}）`,
      params.destination.selectedAirportName &&
        `抵达机场：${params.destination.selectedAirportName}（${params.destination.selectedAirportCode}）`,
    ]
      .filter(Boolean)
      .join('；')

    const extras = [
      airportHint && `[机场] ${airportHint}，请将机场作为行程起止 POI 纳入规划`,
      params.hotelPOI &&
        `[酒店] 住宿地址：${params.hotelPOI.name}（${params.hotelPOI.address}，坐标 ${params.hotelPOI.lng},${params.hotelPOI.lat}），请以酒店为出发/返回基点规划每日行程`,
      params.mustVisit.length > 0 &&
        `[必去] ${params.mustVisit
          .map((p) => `${p.name}（${p.address}）`)
          .join('、')}`,
      params.mustAvoid.length > 0 &&
        `[不去] 请避开以下地点：${params.mustAvoid.map((p) => p.name).join('、')}`,
    ]
      .filter(Boolean)
      .join('\n')

    const enrichedPrompt = extras ? `${finalPrompt}\n\n${extras}` : finalPrompt

    startPlanning({
      originCode: params.origin.selectedAirportCode ?? params.origin.code,
      destinationCode: params.destination.code,
      startDate: params.startDate,
      endDate: params.endDate,
      finalPrompt: enrichedPrompt,
    })
  }

  const handleRefine = () => {
    if (!refineFeedback.trim() || !params.origin || !params.destination)
      return
    const currentSummary = itinerary
      ? `当前行程标题：${itinerary.title}\n当前行程概要：${itinerary.summary}`
      : ''
    const refinePrompt = `${currentSummary}\n\n用户反馈调整意见：${refineFeedback.trim()}\n\n请根据以上反馈，重新规划行程。保持整体框架不变，只针对用户提出的问题进行调整。`
    setShowRefine(false)
    setRefineFeedback('')
    startPlanning({
      originCode: params.origin.selectedAirportCode ?? params.origin.code,
      destinationCode: params.destination.code,
      startDate: params.startDate,
      endDate: params.endDate,
      finalPrompt: refinePrompt,
    })
  }

  const xhsNotes: XHSNote[] =
    (itinerary as unknown as { xhsNotes?: XHSNote[] })?.xhsNotes ??
    (itinerary as unknown as { notes?: XHSNote[] })?.notes ??
    []

  return (
    <main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
      <LightBackground />

      <div className="relative" style={{ zIndex: 1 }}>
        {/* 左上角 — 用户 ID */}
        <div className="fixed top-5 left-5" style={{ zIndex: 50 }}>
          {deviceIdShort && <DeviceIdBadge id={deviceIdShort} />}
        </div>

        {/* 右上角 — 我的计划入口 */}
        <div className="fixed top-5 right-5" style={{ zIndex: 50 }}>
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
        </div>

        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            {/* Hero */}
            <HeroSection />

            {/* Form */}
            {(step === 'form' || step === 'generating' || step === 'prompt-preview') && (
              <>
                <HomeForm onSubmit={handleSubmit} error={error} />

                {/* Prompt Preview */}
                <AnimatePresence>
                  {(step === 'generating' || step === 'prompt-preview') && (
                    <motion.div
                      ref={promptAreaRef}
                      key="prompt-preview"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="mt-5"
                    >
                      <PromptPreviewCard
                        isGenerating={step === 'generating'}
                        prompt={
                          step === 'prompt-preview' ? finalPrompt : previewPrompt
                        }
                        onChange={setFinalPrompt}
                        onBack={goBack}
                        onConfirm={handleConfirm}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Agent Progress */}
            <AnimatePresence>
              {step === 'planning' && (
                <motion.div
                  ref={planAreaRef}
                  key="planning"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-5"
                >
                  <PlanningWarning warning={warning} onRetry={retryAfterFailure} />
                  <AgentStatusPanel onInterrupt={interrupt} />
                </motion.div>
              )}
            </AnimatePresence>
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
                            text: itinerary.destination,
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
                      </div>
                    </div>
                    <div
                      className="px-6 pb-4 flex items-center gap-2"
                      style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}
                    >
                      <ExportButton itinerary={itinerary} />
                      <button
                        onClick={() => setShowRefine((v) => !v)}
                        className="flex items-center gap-1.5 text-sm cursor-pointer transition-all duration-150 hover:bg-gray-50 whitespace-nowrap"
                        style={{
                          background: showRefine ? '#EFF6FF' : '#FFFFFF',
                          border: `1px solid ${
                            showRefine ? '#BFDBFE' : '#E2E8F0'
                          }`,
                          color: showRefine ? '#2563EB' : '#64748B',
                          padding: '7px 14px',
                          borderRadius: 8,
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
                        onDayChange={setActiveDay}
                        refineMode={showRefine}
                        onActivityClick={(activity) => {
                          const dayIndex = (itinerary.days ?? []).findIndex(
                            (d) =>
                              [
                                ...(d.morning ?? []),
                                ...(d.afternoon ?? []),
                                ...(d.evening ?? []),
                              ].includes(activity)
                          )
                          refineInsertRef.current?.(
                            activity,
                            dayIndex >= 0 ? dayIndex : activeDay
                          )
                        }}
                      />
                    </div>

                    <div
                      id="itinerary-map"
                      className="lg:col-span-2 lg:sticky lg:top-6"
                    >
                      {itinerary.days?.[activeDay] ? (
                        <RouteMap dayPlan={itinerary.days[activeDay]} />
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
                    AI
                    在整合行程时遇到问题，可能是网络超时或服务繁忙，请重试一次
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (planId) {
                      fetch(`/api/plans/${planId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'error' }),
                      }).catch(() => {})
                    }
                    retryAfterFailure()
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                  style={{
                    background:
                      'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#FFFFFF',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.30)',
                    border: 'none',
                  }}
                >
                  <RefreshCw size={14} />
                  重新生成
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div
        className="relative text-center py-6 text-xs"
        style={{ color: '#CBD5E1', zIndex: 1 }}
      >
        Powered by <PoweredByName />
      </div>
    </main>
  )
}
