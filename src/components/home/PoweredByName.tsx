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

// 哆啦A梦（国语版，陈慧琳）— 1=F 大调
// 简谱对照：1=F4 2=G4 3=A4 4=Bb4 5=C5 6=D5 7=E5
const Q = 420     // 四分音符 ms
const H = 840     // 二分音符
const E = 210     // 八分音符
const DQ = 630    // 附点四分

const DORAEMON_SONG: { note: string; dur: number }[] = [
  // ── 主歌第一段「心中有许多愿望」──
  // 心 中 有 许 多 愿 望
  { note: 'F4', dur: Q }, { note: 'A4', dur: Q }, { note: 'C5', dur: Q },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'F4', dur: Q },
  { note: 'C5', dur: H },
  // 能 够 实 现 有 多 棒
  { note: 'C5', dur: Q }, { note: 'D5', dur: Q }, { note: 'C5', dur: Q },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'F4', dur: Q },
  { note: 'G4', dur: H },
  // 只有多啦A梦 可以带着我实现梦想
  { note: 'A4', dur: Q }, { note: 'C5', dur: Q }, { note: 'A4', dur: Q },
  { note: 'G4', dur: Q }, { note: 'F4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'A4', dur: Q }, { note: 'C5', dur: Q }, { note: 'D5', dur: Q },
  { note: 'C5', dur: H },

  // ── 「可爱圆圆胖脸庞」──
  // 可 爱 圆 圆 胖 脸 庞
  { note: 'C5', dur: Q }, { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'A4', dur: Q }, { note: 'C5', dur: Q }, { note: 'A4', dur: Q },
  { note: 'F4', dur: H },
  // 小 小 叮 当 挂 身 上
  { note: 'F4', dur: Q }, { note: 'G4', dur: Q }, { note: 'A4', dur: Q },
  { note: 'G4', dur: Q }, { note: 'F4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'C4', dur: H },
  // 总会在我不知所措的时候 给我帮忙
  { note: 'F4', dur: Q }, { note: 'G4', dur: Q }, { note: 'A4', dur: Q },
  { note: 'C5', dur: Q }, { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'F4', dur: Q },
  { note: 'F4', dur: H },

  // ── 「当想象的天堂穿越了时光」──
  // 当 想 象 的 天 堂 穿 越 了 时 光
  { note: 'A4', dur: Q }, { note: 'C5', dur: Q }, { note: 'D5', dur: Q },
  { note: 'C5', dur: Q }, { note: 'A4', dur: Q }, { note: 'G4', dur: DQ },
  { note: 'F4', dur: E }, { note: 'G4', dur: H },
  // 来 我们坐上时光机
  { note: 'C5', dur: Q }, { note: 'D5', dur: Q }, { note: 'C5', dur: Q },
  { note: 'A4', dur: Q }, { note: 'C5', dur: H },

  // ── 副歌「ang ang ang 多啦A梦和我一起让梦想发光」──
  { note: 'F4', dur: E }, { note: 'G4', dur: E }, { note: 'A4', dur: E },
  { note: 'C5', dur: E }, { note: 'D5', dur: Q }, { note: 'C5', dur: Q },
  { note: 'A4', dur: H },
  { note: 'A4', dur: Q }, { note: 'C5', dur: Q }, { note: 'D5', dur: Q },
  { note: 'C5', dur: Q }, { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'F4', dur: H },
  { note: 'F4', dur: Q }, { note: 'G4', dur: Q }, { note: 'A4', dur: Q },
  { note: 'C5', dur: Q }, { note: 'D5', dur: Q }, { note: 'C5', dur: Q },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'C5', dur: H + Q },

  // ── 主歌第二段「每天过的都一样」──
  // 每 天 过 的 都 一 样
  { note: 'F4', dur: Q }, { note: 'A4', dur: Q }, { note: 'C5', dur: Q },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'F4', dur: Q },
  { note: 'C5', dur: H },
  // 偶 尔 会 突 发 奇 想
  { note: 'C5', dur: Q }, { note: 'D5', dur: Q }, { note: 'C5', dur: Q },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q }, { note: 'F4', dur: Q },
  { note: 'G4', dur: H },
  // 只要有了多啦A梦 幻想就会无限延长
  { note: 'A4', dur: Q }, { note: 'C5', dur: Q }, { note: 'A4', dur: Q },
  { note: 'G4', dur: Q }, { note: 'F4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'A4', dur: Q }, { note: 'C5', dur: Q }, { note: 'D5', dur: Q },
  { note: 'C5', dur: H },

  // ── 副歌重复 ──
  { note: 'F4', dur: E }, { note: 'G4', dur: E }, { note: 'A4', dur: E },
  { note: 'C5', dur: E }, { note: 'D5', dur: Q }, { note: 'C5', dur: Q },
  { note: 'A4', dur: H },
  { note: 'A4', dur: Q }, { note: 'C5', dur: Q }, { note: 'D5', dur: Q },
  { note: 'C5', dur: Q }, { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'F4', dur: H },
  { note: 'F4', dur: Q }, { note: 'G4', dur: Q }, { note: 'A4', dur: Q },
  { note: 'C5', dur: Q }, { note: 'D5', dur: Q }, { note: 'C5', dur: Q },
  { note: 'A4', dur: Q }, { note: 'G4', dur: Q },
  { note: 'F4', dur: H + Q },
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
