'use client'

import { useState, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const NOTE_FREQS = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25,
  698.46,
]

const HEART_COLORS = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🩷', '🩵']

interface FloatingHeart {
  id: number
  x: number
  color: string
}

function playNote(freq: number) {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    /* 静默失败 */
  }
}

/**
 * ===== PoweredByName 组件 =====
 * 交互式作者名字显示，支持点击播放音符和飘心
 * 使用 memo 优化：该组件无 props，自管理交互状态，不需要外部重渲染
 */
export const PoweredByName = memo(() => {
  const name = 'Pan Junyuan'
  const [shaking, setShaking] = useState<number | null>(null)
  const [hearts, setHearts] = useState<FloatingHeart[]>([])
  const counterRef = useRef(0)
  const containerRef = useRef<HTMLSpanElement>(null)
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([])

  const noteMap = useRef<number[]>([])
  if (noteMap.current.length === 0) {
    let noteIdx = 0
    name.split('').forEach((ch) => {
      noteMap.current.push(ch !== ' ' ? noteIdx++ % NOTE_FREQS.length : -1)
    })
  }

  const handleLetterClick = useCallback((i: number) => {
    const noteIdx = noteMap.current[i]
    if (noteIdx >= 0) playNote(NOTE_FREQS[noteIdx])

    setShaking(null)
    requestAnimationFrame(() => setShaking(i))
    setTimeout(() => setShaking(null), 500)

    const container = containerRef.current
    const letterEl = letterRefs.current[i]
    let x = 0
    if (container && letterEl) {
      const cRect = container.getBoundingClientRect()
      const lRect = letterEl.getBoundingClientRect()
      x = lRect.left - cRect.left + lRect.width / 2 - 8
    }

    const id = ++counterRef.current
    const color = HEART_COLORS[id % HEART_COLORS.length]
    setHearts((h) => [...h, { id, x, color }])
    setTimeout(() => setHearts((h) => h.filter((hh) => hh.id !== id)), 1200)
  }, [])

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center gap-0"
      style={{ color: '#94A3B8', fontWeight: 500 }}
    >
      {name.split('').map((ch, i) => (
        <motion.span
          key={i}
          ref={(el) => {
            letterRefs.current[i] = el
          }}
          onClick={() => ch !== ' ' && handleLetterClick(i)}
          animate={{ y: shaking === i ? [0, -5, 2, -3, 1, 0] : 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={{
            cursor: ch === ' ' ? 'default' : 'pointer',
            display: 'inline-block',
          }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}

      {/* 飘起的彩色爱心 */}
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.span
            key={h.id}
            initial={{ opacity: 1, y: 0, scale: 0.7 }}
            animate={{ opacity: 0, y: -40, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: h.x,
              pointerEvents: 'none',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            {h.color}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
})

PoweredByName.displayName = 'PoweredByName'
