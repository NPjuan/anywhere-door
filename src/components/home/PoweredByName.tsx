'use client'

import { useState, useRef, useCallback, memo, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ============================================================
   PoweredByName
     'piano'   — 点击每个字母弹不同音符 + 飘心
     'doraemon'— 自动循环演奏ドラえもんのうた，字母依次跳动+飘心
   ============================================================ */

const NOTE_FREQS: Record<string, number> = {
  A3: 220.00, B3: 246.94,
  C4: 261.63, C_4: 277.18, D4: 293.66, E4: 329.63,
  F4: 349.23, F_4: 369.99, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, C_5: 554.37, D5: 587.33, E5: 659.25,
  F5: 698.46, G5: 783.99,
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

// 哆啦A梦主题曲（国语版），D大调钢琴谱主旋律
// D4=1 E4=2 F#4=3 G4=4 A4=5 B4=6 C#5=7 D5=1' E5=2' F#5=3'
const Q  = 500   // 四分音符 ms（BPM≈120）
const H  = 1000  // 二分音符
const E  = 250   // 八分音符
const DQ = 750   // 附点四分

const DORAEMON_SONG: { note: string; dur: number }[] = [
  // ══ 主歌「心中有许多愿望 能够实现有多棒」══
  // A A A F# | D5 B A -
  { note: 'A4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'A4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'D5',  dur: Q }, { note: 'B4',  dur: Q }, { note: 'A4',  dur: H },

  // A A A F# | D5 B A -（重复）
  { note: 'A4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'A4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'D5',  dur: Q }, { note: 'B4',  dur: Q }, { note: 'A4',  dur: H },

  // ══「只有多啦A梦 可以带着我实现梦想」══
  // B D5 E5 D5 | C#5 D5 E5 -
  { note: 'B4',  dur: Q }, { note: 'D5',  dur: Q },
  { note: 'E5',  dur: Q }, { note: 'D5',  dur: Q },
  { note: 'C_5', dur: Q }, { note: 'D5',  dur: Q }, { note: 'E5',  dur: H },

  // D5 C#5 B A | B· A - B C#5
  { note: 'D5',  dur: Q }, { note: 'C_5', dur: Q },
  { note: 'B4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'B4',  dur: DQ }, { note: 'A4',  dur: E },
  { note: 'A4',  dur: E  }, { note: 'B4',  dur: E }, { note: 'C_5', dur: E },

  // ══「可爱圆圆胖脸庞 总会在我不知所措给我帮忙」══
  // A F# A B | A B D5 -
  { note: 'A4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'A4',  dur: Q }, { note: 'B4',  dur: Q },
  { note: 'A4',  dur: Q }, { note: 'B4',  dur: Q }, { note: 'D5',  dur: H },

  // B A F# E | A F# E D
  { note: 'B4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'F_4', dur: Q }, { note: 'E4',  dur: Q },
  { note: 'A4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'E4',  dur: Q }, { note: 'D4',  dur: Q },

  // ══ 副歌「哆啦A梦/なんでもできる」══
  // F# A B A | F# E D -
  { note: 'F_4', dur: Q }, { note: 'A4',  dur: Q },
  { note: 'B4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'F_4', dur: Q }, { note: 'E4',  dur: Q }, { note: 'D4',  dur: H },

  // E A G F# | E C# D -
  { note: 'E4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'G4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'E4',  dur: Q }, { note: 'C_4', dur: Q }, { note: 'D4',  dur: H },

  // ══ 主歌2「每天过得都一样 偶尔会突发奇想」══
  { note: 'A4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'A4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'D5',  dur: Q }, { note: 'B4',  dur: Q }, { note: 'A4',  dur: H },

  { note: 'A4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'A4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'D5',  dur: Q }, { note: 'B4',  dur: Q }, { note: 'A4',  dur: H },

  { note: 'B4',  dur: Q }, { note: 'D5',  dur: Q },
  { note: 'E5',  dur: Q }, { note: 'D5',  dur: Q },
  { note: 'C_5', dur: Q }, { note: 'D5',  dur: Q }, { note: 'E5',  dur: H },

  { note: 'D5',  dur: Q }, { note: 'C_5', dur: Q },
  { note: 'B4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'B4',  dur: DQ }, { note: 'A4',  dur: E },
  { note: 'A4',  dur: E  }, { note: 'B4',  dur: E }, { note: 'C_5', dur: E },

  { note: 'A4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'A4',  dur: Q }, { note: 'B4',  dur: Q },
  { note: 'A4',  dur: Q }, { note: 'B4',  dur: Q }, { note: 'D5',  dur: H },

  { note: 'B4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'F_4', dur: Q }, { note: 'E4',  dur: Q },
  { note: 'A4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'E4',  dur: Q }, { note: 'D4',  dur: Q },

  // ══ 副歌2（重复，最后一音延长）══
  { note: 'F_4', dur: Q }, { note: 'A4',  dur: Q },
  { note: 'B4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'F_4', dur: Q }, { note: 'E4',  dur: Q }, { note: 'D4',  dur: H },

  { note: 'E4',  dur: Q }, { note: 'A4',  dur: Q },
  { note: 'G4',  dur: Q }, { note: 'F_4', dur: Q },
  { note: 'E4',  dur: Q }, { note: 'C_4', dur: Q }, { note: 'D4',  dur: H + Q },
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
