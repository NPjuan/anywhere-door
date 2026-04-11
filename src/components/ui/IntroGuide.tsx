'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, X, ArrowRight, ArrowLeft } from 'lucide-react'

/* ============================================================
   IntroGuide — 新手引导 + 右下角 Tips 触发按钮

   行为：
   - 首次访问自动弹出 Intro（localStorage 记录已读）
   - 关闭后右下角显示 Tips 按钮，可随时重新打开
   ============================================================ */

const STORAGE_KEY = 'ad_intro_seen'

const STEPS = [
  {
    emoji: '🚪',
    title: '欢迎使用任意门',
    desc: '用 AI 帮你规划一场说走就走的旅行。填写目的地和日期，几十秒内生成带地图的完整行程。',
  },
  {
    emoji: '🗺️',
    title: '填写你的旅行信息',
    desc: '选择出发地和目的地，设定日期。支持填写酒店、航班时间、必去/不去的地点，越详细越准确。',
  },
  {
    emoji: '✨',
    title: 'AI 生成行程提示词',
    desc: '提交后 AI 会生成一份结构化的规划提示词预览，你可以自由编辑内容，满意后再确认开始规划。',
  },
  {
    emoji: '🤖',
    title: '多 Agent 并行规划',
    desc: '5 个专属 AI Agent 同时运转：景点推荐、路线规划、打包建议、攻略生成……通常 30–60 秒完成。',
  },
  {
    emoji: '🗓️',
    title: '查看并调整行程',
    desc: '生成完整每日行程与路线地图，不满意随时点「调整行程」告诉 AI 改哪里，支持多轮优化。',
  },
]

export function IntroGuide() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)

  useEffect(() => {
    setMounted(true)
    if (!localStorage.getItem(STORAGE_KEY)) {
      // 稍微延迟，让页面先渲染完毕
      setTimeout(() => setOpen(true), 600)
    }
  }, [])

  const handleClose = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
    setTimeout(() => setStep(0), 300)
  }, [])

  const handleOpen = useCallback(() => {
    setStep(0)
    setDirection(1)
    setOpen(true)
  }, [])

  const goNext = useCallback(() => {
    setDirection(1)
    setStep(s => s + 1)
  }, [])

  const goPrev = useCallback(() => {
    setDirection(-1)
    setStep(s => Math.max(0, s - 1))
  }, [])

  const goToStep = useCallback((i: number) => {
    setDirection(i > step ? 1 : -1)
    setStep(i)
  }, [step])

  if (!mounted) return null

  const isLast = step === STEPS.length - 1

  return (
    <>
      {/* ── Tips 触发按钮 ── */}
      <motion.button
        onClick={handleOpen}
        className="flex items-center gap-1.5 cursor-pointer w-full"
        style={{
          background:   '#FFFFFF',
          border:       '1px solid #E5E7EB',
          borderRadius: 8,
          padding:      '7px 14px',
          color:        '#6B7280',
          fontSize:     13,
        }}
        whileHover={{ color: '#374151' }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
      >
        <Lightbulb size={13} />
        <span>Tips</span>
      </motion.button>

      {/* ── Intro 弹窗 ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* 遮罩 */}
            <motion.div
              className="fixed inset-0 z-[60]"
              style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
            />

            {/* 卡片 */}
            <motion.div
              className="fixed z-[61]"
              style={{
                top:          '50%',
                left:         '50%',
                width:        'min(420px, calc(100vw - 32px))',
                background:   '#FFFFFF',
                border:       '1px solid #E5E7EB',
                borderRadius: 18,
                boxShadow:    '0 32px 72px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
                overflow:     'hidden',
              }}
              initial={{ opacity: 0, scale: 0.94, x: '-50%', y: '-46%' }}
              animate={{ opacity: 1, scale: 1,    x: '-50%', y: '-50%' }}
              exit={{   opacity: 0, scale: 0.94, x: '-50%', y: '-46%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              onClick={e => e.stopPropagation()}
            >
              {/* 顶部：步骤点 + 关闭 */}
              <div className="flex items-center justify-between px-5 pt-5">
                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToStep(i)}
                      aria-label={`第 ${i + 1} 步`}
                      style={{
                        width:        i === step ? 22 : 7,
                        height:       7,
                        borderRadius: 99,
                        background:   i === step ? '#2563EB' : i < step ? '#BFDBFE' : '#E2E8F0',
                        border:       'none',
                        cursor:       'pointer',
                        padding:      0,
                        transition:   'all 0.28s cubic-bezier(0.16,1,0.3,1)',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleClose}
                  aria-label="关闭引导"
                  className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer transition-colors"
                  style={{ color: '#9CA3AF', border: 'none', background: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <X size={15} />
                </button>
              </div>

              {/* 内容区（固定高度防止跳动） */}
              <div style={{ height: 232, position: 'relative', overflow: 'hidden' }}>
                <AnimatePresence mode="wait" initial={false} custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={{
                      enter: (d: number) => ({ opacity: 0, x: d * 48 }),
                      center:              { opacity: 1, x: 0 },
                      exit:  (d: number) => ({ opacity: 0, x: d * -48 }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center px-7"
                  >
                    {/* 图标 */}
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1,   opacity: 1 }}
                      transition={{ delay: 0.06, type: 'spring', damping: 18, stiffness: 280 }}
                      style={{
                        fontSize:     52,
                        lineHeight:   1,
                        marginBottom: 18,
                        filter:       'drop-shadow(0 4px 8px rgba(0,0,0,0.08))',
                      }}
                    >
                      {STEPS[step].emoji}
                    </motion.div>

                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 10, lineHeight: 1.3 }}>
                      {STEPS[step].title}
                    </h3>
                    <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.75, maxWidth: 320 }}>
                      {STEPS[step].desc}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 底部操作栏 */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderTop: '1px solid #F3F4F6' }}
              >
                {/* 上一步 */}
                <motion.button
                  onClick={goPrev}
                  disabled={step === 0}
                  animate={{ opacity: step === 0 ? 0 : 1 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          4,
                    fontSize:     13,
                    color:        '#6B7280',
                    background:   'none',
                    border:       '1px solid #E5E7EB',
                    cursor:       step === 0 ? 'default' : 'pointer',
                    padding:      '6px 12px',
                    borderRadius: 8,
                    pointerEvents: step === 0 ? 'none' : 'auto',
                  }}
                >
                  <ArrowLeft size={13} />
                  上一步
                </motion.button>

                {/* 步骤计数 */}
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                  {step + 1} / {STEPS.length}
                </span>

                {/* 下一步 / 开始使用 */}
                <motion.button
                  onClick={isLast ? handleClose : goNext}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          4,
                    fontSize:     13,
                    fontWeight:   600,
                    color:        '#FFFFFF',
                    background:   isLast
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    border:       'none',
                    cursor:       'pointer',
                    padding:      '7px 16px',
                    borderRadius: 8,
                    boxShadow:    isLast
                      ? '0 4px 12px rgba(16,185,129,0.30)'
                      : '0 4px 12px rgba(37,99,235,0.25)',
                    transition:   'background 0.3s, box-shadow 0.3s',
                  }}
                >
                  {isLast ? '开始使用 🎉' : <>下一步 <ArrowRight size={13} /></>}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
