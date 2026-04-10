'use client'

import { useState, useRef, useCallback, memo, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ============================================================
   PoweredByName
     'piano'   — 点击每个字母弹不同音符 + 飘心
     'doraemon'— 自动循环演奏ドラえもんのうた，字母依次跳动+飘心
   ============================================================ */

const NOTE_FREQS: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 783.99,
}

// 共享 AudioContext
let _sharedCtx: AudioContext | null = null
function getAudioCtx(): AudioContext {
  if (typeof window === 'undefined') throw new Error('no window')
  if (!_sharedCtx || _sharedCtx.state === 'closed') {
    _sharedCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  if (_sharedCtx.state === 'suspended') _sharedCtx.resume()
  return _sharedCtx
}

// 关闭并销毁当前 AudioContext，停止所有已排队的音符
function killAudioCtx() {
  if (_sharedCtx && _sharedCtx.state !== 'closed') {
    _sharedCtx.close().catch(() => {})
  }
  _sharedCtx = null
}

// 用 Web Audio 精确时间调度播放一个音符（避免 setTimeout 漂移）
function scheduleNote(ctx: AudioContext, freq: number, startAt: number, duration: number) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'triangle'   // triangle 比 sine 更像铃声/音乐盒
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(0.32, startAt + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration * 0.9)
  osc.start(startAt)
  osc.stop(startAt + duration)
}

function playFreq(freq: number, duration = 0.45) {
  try {
    const ctx = getAudioCtx()
    scheduleNote(ctx, freq, ctx.currentTime, duration)
  } catch { /* 静默 */ }
}

// 哆啦A梦（国语版，陈慧琳）
// 简谱 1=C，参考：1113535 5653432 22247765 5554131...
const Q = 450   // 四分音符 ms（≈133 BPM）
const H = 900   // 二分音符
const E = 225   // 八分音符

// 1=C4 2=D4 3=E4 4=F4 5=G4 6=A4 7=B4  高八度加H前缀
const s: Record<string, number> = {
  C4: NOTE_FREQS.C4, D4: NOTE_FREQS.D4, E4: NOTE_FREQS.E4, F4: NOTE_FREQS.F4,
  G4: NOTE_FREQS.G4, A4: NOTE_FREQS.A4, B4: NOTE_FREQS.B4,
  C5: NOTE_FREQS.C5, D5: NOTE_FREQS.D5, E5: NOTE_FREQS.E5, F5: NOTE_FREQS.F5,
  G5: NOTE_FREQS.G5,
}

const DORAEMON_SONG: { note: string; dur: number }[] = [
  // ── 主歌 A ──
  // 心中有许多愿望（1 1 1 3 5 3 5）
  { note: 'C4', dur: Q }, { note: 'C4', dur: E }, { note: 'C4', dur: E },
  { note: 'E4', dur: Q }, { note: 'G4', dur: Q }, { note: 'E4', dur: Q }, { note: 'G4', dur: H },
  // 能够实现有多棒（5 6 5 3 4 3 2）
  { note: 'G4', dur: Q }, { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'E4', dur: Q }, { note: 'F4', dur: Q }, { note: 'E4', dur: Q }, { note: 'D4', dur: H },
  // 拥有一只神奇猫（2 2 2 4 7 7 6 5）
  { note: 'D4', dur: Q }, { note: 'D4', dur: E }, { note: 'D4', dur: E },
  { note: 'F4', dur: Q }, { note: 'B4', dur: Q }, { note: 'B4', dur: Q },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  // 随时帮忙真高兴（5 5 5 4 i3 1̇，1̇=C5）
  { note: 'G4', dur: Q }, { note: 'G4', dur: E }, { note: 'G4', dur: E },
  { note: 'F4', dur: Q }, { note: 'C5', dur: Q }, { note: 'E4', dur: Q }, { note: 'C5', dur: H },

  // ── 主歌 B（重复旋律）──
  // 心中有许多愿望
  { note: 'C4', dur: Q }, { note: 'C4', dur: E }, { note: 'C4', dur: E },
  { note: 'E4', dur: Q }, { note: 'G4', dur: Q }, { note: 'E4', dur: Q }, { note: 'G4', dur: H },
  // 每天都开心相伴（5 6 5 3 4 3 2）
  { note: 'G4', dur: Q }, { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'E4', dur: Q }, { note: 'F4', dur: Q }, { note: 'E4', dur: Q }, { note: 'D4', dur: H },
  // 2 2 2 4 7 7 6 5
  { note: 'D4', dur: Q }, { note: 'D4', dur: E }, { note: 'D4', dur: E },
  { note: 'F4', dur: Q }, { note: 'B4', dur: Q }, { note: 'B4', dur: Q },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  // 5 5 5 4 C5 E4 C5
  { note: 'G4', dur: Q }, { note: 'G4', dur: E }, { note: 'G4', dur: E },
  { note: 'F4', dur: Q }, { note: 'C5', dur: Q }, { note: 'E4', dur: Q }, { note: 'C5', dur: H },

  // ── 副歌 ──
  // 哆 啦 A 梦（6 5 4 | 2 7 6 5 6 5 4）
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'F4', dur: Q },
  { note: 'D4', dur: E }, { note: 'B4', dur: E },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'F4', dur: H },
  // 是我的好朋友（5 6 3 2 1）
  { note: 'G4', dur: Q }, { note: 'A4', dur: Q }, { note: 'E4', dur: Q },
  { note: 'D4', dur: Q }, { note: 'C4', dur: H },
  // 副歌第二句
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'F4', dur: Q },
  { note: 'D4', dur: E }, { note: 'B4', dur: E },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'F4', dur: H },
  // 结束句
  { note: 'G4', dur: Q }, { note: 'A4', dur: Q }, { note: 'E4', dur: Q },
  { note: 'D4', dur: Q }, { note: 'C4', dur: H + Q },
]

const PIANO_FREQS = [
  NOTE_FREQS.C4, NOTE_FREQS.D4, NOTE_FREQS.E4, NOTE_FREQS.F4,
  NOTE_FREQS.G4, NOTE_FREQS.A4, NOTE_FREQS.B4,
  NOTE_FREQS.C5, NOTE_FREQS.D5, NOTE_FREQS.E5, NOTE_FREQS.F5,
]

const HEART_COLORS = ['❤️','🧡','💛','💚','💙','💜','🩷','🩵']

interface FloatingHeart { id: number; x: number; color: string }

interface Props { mode: 'piano' | 'doraemon' }

export const PoweredByName = memo(({ mode }: Props) => {
  const name    = 'Pan Junyuan'
  const letters = useMemo(() => name.split(''), [])
  const nonSpaceIdx = useMemo(
    () => letters.map((ch, i) => ch !== ' ' ? i : -1).filter(i => i !== -1),
    [letters]
  )

  const [shaking, setShaking] = useState<number | null>(null)
  const [hearts, setHearts]   = useState<FloatingHeart[]>([])
  const counterRef   = useRef(0)
  const containerRef = useRef<HTMLSpanElement>(null)
  const letterRefs   = useRef<(HTMLSpanElement | null)[]>([])
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* 自动演奏（doraemon 模式）— 用 Web Audio 精确时间调度 */
  useEffect(() => {
    if (mode !== 'doraemon') {
      if (timerRef.current) clearTimeout(timerRef.current)
      setShaking(null)
      return
    }

    let cancelled   = false
    let letterIdx   = 0

    const spawnHeart = (li: number) => {
      const el  = letterRefs.current[li]
      const box = containerRef.current
      let x = 0
      if (box && el) {
        const cr = box.getBoundingClientRect()
        const lr = el.getBoundingClientRect()
        x = lr.left - cr.left + lr.width / 2 - 8
      }
      const id    = ++counterRef.current
      const color = HEART_COLORS[id % HEART_COLORS.length]
      setHearts(h => [...h, { id, x, color }])
      setTimeout(() => setHearts(h => h.filter(hh => hh.id !== id)), 1400)
    }

    // 一次排队一整段旋律的所有音符，节奏完全准确
    const schedulePass = () => {
      if (cancelled) return
      try {
        const ctx = getAudioCtx()
        let t = ctx.currentTime + 0.05
        DORAEMON_SONG.forEach(({ note, dur }) => {
          const freq   = NOTE_FREQS[note]
          const durSec = dur / 1000
          scheduleNote(ctx, freq, t, durSec * 0.88)

          // 提前算好这个音符对应的字母和爱心，快照进闭包
          const delay    = (t - ctx.currentTime) * 1000
          const snapLi   = nonSpaceIdx[letterIdx % nonSpaceIdx.length]
          const snapHeart = letterIdx % 2 === 0
          letterIdx++   // 同步递增，下一个音符用下一个字母

          setTimeout(() => {
            if (cancelled) return
            setShaking(snapLi)
            setTimeout(() => setShaking(s => s === snapLi ? null : s), dur * 0.65)
            if (snapHeart) spawnHeart(snapLi)
          }, delay)

          t += durSec
        })

        // 整段结束后 500ms 间隔再循环
        const loopDelay = (t - ctx.currentTime) * 1000 + 500
        timerRef.current = setTimeout(() => {
          if (!cancelled) schedulePass()
        }, loopDelay)
      } catch { /* 静默 */ }
    }

    schedulePass()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      killAudioCtx()   // 关闭 AudioContext，立即停止所有已排队音符
      setShaking(null)
    }
  }, [mode, nonSpaceIdx])

  /* 钢琴模式点击 */
  const handleClick = useCallback((i: number, ch: string) => {
    if (ch === ' ' || mode === 'doraemon') return
    setShaking(null)
    requestAnimationFrame(() => setShaking(i))
    setTimeout(() => setShaking(null), 500)
    playFreq(PIANO_FREQS[i % PIANO_FREQS.length])

    const el  = letterRefs.current[i]
    const box = containerRef.current
    let x = 0
    if (box && el) {
      const cr = box.getBoundingClientRect()
      const lr = el.getBoundingClientRect()
      x = lr.left - cr.left + lr.width / 2 - 8
    }
    const id    = ++counterRef.current
    const color = HEART_COLORS[id % HEART_COLORS.length]
    setHearts(h => [...h, { id, x, color }])
    setTimeout(() => setHearts(h => h.filter(hh => hh.id !== id)), 1200)
  }, [mode])

  return (
    <span ref={containerRef} className="relative inline-flex items-center gap-0" style={{ fontWeight: 500 }}>
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          ref={el => { letterRefs.current[i] = el }}
          onClick={() => handleClick(i, ch)}
          animate={{ y: shaking === i ? [0, -6, 2, -3, 1, 0] : 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          style={{
            cursor:        mode === 'doraemon' || ch === ' ' ? 'default' : 'pointer',
            display:       'inline-block',
            pointerEvents: mode === 'doraemon' ? 'none' : 'auto',
          }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </motion.span>
      ))}

      <AnimatePresence>
        {hearts.map(h => (
          <motion.span key={h.id}
            initial={{ opacity: 1, y: 0,   scale: 0.7 }}
            animate={{ opacity: 0, y: -44, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            style={{ position: 'absolute', bottom: '100%', left: h.x, pointerEvents: 'none', fontSize: 14, lineHeight: 1 }}
          >
            {h.color}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
})

PoweredByName.displayName = 'PoweredByName'
