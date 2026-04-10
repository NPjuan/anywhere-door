'use client'

import { useState, useRef, useCallback, memo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ============================================================
   PoweredByName — 交互式作者名
   mode 由父组件传入：
     'piano'   — 每个字母点击弹不同音符 + 飘心
     'doraemon'— 点击按小叮当旋律弹奏
   ============================================================ */

/* 音符频率表 */
const NOTE_FREQS: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 783.99, A5: 880.00,
}

// 小叮当（Jingle Bells）核心旋律
const DORAEMON_MELODY = [
  'E4','E4','E4',
  'E4','E4','E4',
  'E4','G4','C4','D4','E4',
  'F4','F4','F4','F4',
  'F4','E4','E4','E4','E4',
  'E4','D4','D4','E4','D4','G4',
  'E4','E4','E4',
  'E4','E4','E4',
  'E4','G4','C4','D4','E4',
  'F4','F4','F4','F4',
  'F4','E4','E4','E4','G4','G4',
  'F4','D4','C4',
]

const PIANO_FREQS = Object.values(NOTE_FREQS).slice(0, 11)

const RAINBOW_COLORS = [
  '#FF6B6B','#FF9F43','#FECA57','#48DBFB',
  '#1DD1A1','#54A0FF','#A29BFE','#FD79A8',
]

interface FloatingHeart {
  id: number
  x: number
  color: string
}

function playFreq(freq: number, duration = 0.5) {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch { /* 静默 */ }
}

interface Props {
  mode: 'piano' | 'doraemon'
}

export const PoweredByName = memo(({ mode }: Props) => {
  const name = 'Pan Junyuan'
  const [shaking, setShaking] = useState<number | null>(null)
  const [hearts, setHearts]   = useState<FloatingHeart[]>([])
  const counterRef   = useRef(0)
  const melodyIdxRef = useRef(0)
  const containerRef = useRef<HTMLSpanElement>(null)
  const letterRefs   = useRef<(HTMLSpanElement | null)[]>([])

  // 切换模式时重置旋律进度
  useEffect(() => {
    melodyIdxRef.current = 0
  }, [mode])

  const getLetterColor = useCallback((_charIdx: number) => {
    return undefined  // 名字字母不做彩虹，颜色由父级 color 继承
  }, [])

  const handleClick = useCallback((i: number, ch: string) => {
    if (ch === ' ') return

    // 1. 振动动画
    setShaking(null)
    requestAnimationFrame(() => setShaking(i))
    setTimeout(() => setShaking(null), 500)

    // 2. 发声
    if (mode === 'piano') {
      const noteIdx = i % PIANO_FREQS.length
      playFreq(PIANO_FREQS[noteIdx])
    } else if (mode === 'doraemon') {
      const freq = NOTE_FREQS[DORAEMON_MELODY[melodyIdxRef.current % DORAEMON_MELODY.length]]
      playFreq(freq, 0.4)
      melodyIdxRef.current++
    }

    // 3. 飘心（仅钢琴模式）
    if (mode === 'piano') {
      const container = containerRef.current
      const letterEl  = letterRefs.current[i]
      let x = 0
      if (container && letterEl) {
        const cRect = container.getBoundingClientRect()
        const lRect = letterEl.getBoundingClientRect()
        x = lRect.left - cRect.left + lRect.width / 2 - 8
      }
      const id    = ++counterRef.current
      const color = ['❤️','🧡','💛','💚','💙','💜','🩷','🩵'][id % 8]
      setHearts(h => [...h, { id, x, color }])
      setTimeout(() => setHearts(h => h.filter(hh => hh.id !== id)), 1200)
    }
  }, [mode])

  const letters = name.split('')

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center gap-0"
      style={{ fontWeight: 500 }}
    >
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          ref={el => { letterRefs.current[i] = el }}
          onClick={() => handleClick(i, ch)}
          animate={{ y: shaking === i ? [0, -5, 2, -3, 1, 0] : 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          style={{
            cursor:  ch === ' ' ? 'default' : 'pointer',
            display: 'inline-block',
            color:   ch === ' ' ? undefined : getLetterColor(i),
            transition: mode === 'doraemon' ? 'color 0.1s' : undefined,
          }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}

      {/* 飘起的彩色爱心（钢琴模式） */}
      <AnimatePresence>
        {hearts.map(h => (
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
