'use client'

import { useState, useRef, useCallback, memo, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ============================================================
   PoweredByName
     'piano'   — 点击每个字母弹不同音符 + 飘心
     'doraemon'— 用 Tone.js 播放真实 MIDI 钢琴曲，字母随节拍跳动
   ============================================================ */

const NOTE_SYMBOLS = ['♩','♪','♫','♬','♩','♪','♫','♬']
const NOTE_COLORS  = ['#2563EB','#7C3AED','#0891B2','#059669','#D97706','#DC2626','#6366F1','#0EA5E9']
const PIANO_NOTE_NAMES = ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5']

// 模块级缓存：预加载完成后复用，避免重复加载
let _samplerReady: Promise<{ sampler: import('tone').Sampler; Tone: typeof import('tone') }> | null = null
let _midiReady: Promise<import('@tonejs/midi').Midi> | null = null

// 就绪回调列表，供外部订阅
let _doraemonReady = false
const _readyCallbacks: Array<() => void> = []
export function onDoraemonReady(cb: () => void) {
  if (_doraemonReady) { cb(); return }
  _readyCallbacks.push(cb)
}

function preload() {
  if (!_samplerReady) {
    _samplerReady = (async () => {
      const Tone = await import('tone')
      const sampler = new Tone.Sampler({
        urls: {
          A0: 'A0.mp3', C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
          A1: 'A1.mp3', C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
          A2: 'A2.mp3', C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
          A3: 'A3.mp3', C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
          A4: 'A4.mp3', C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
          A5: 'A5.mp3', C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
          A6: 'A6.mp3', C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
          A7: 'A7.mp3', C8: 'C8.mp3',
        },
        release: 1,
        baseUrl: '/piano/',
      }).toDestination()
      await Tone.loaded()
      return { sampler, Tone }
    })()
  }
  if (!_midiReady) {
    _midiReady = (async () => {
      const { Midi } = await import('@tonejs/midi')
      const res = await fetch('/doraemon.mid')
      const buf = await res.arrayBuffer()
      return new Midi(buf)
    })()
  }
  // 两者都就绪后通知订阅者
  Promise.all([_samplerReady, _midiReady]).then(() => {
    if (!_doraemonReady) {
      _doraemonReady = true
      _readyCallbacks.forEach(cb => cb())
      _readyCallbacks.length = 0
    }
  }).catch(() => {})
}

interface FloatingNote { id: number; x: number; symbol: string; color: string }
interface Props { mode: 'piano' | 'doraemon' }

// 模块级音频状态 — 跨组件实例和页面导航持久化
let _activePart: { dispose: () => void } | null = null
let _isPlaying = false
let _beatSec   = 60 / 126  // 在 startDoraemon 里更新
// 视觉回调：每次组件 mount 时注册，unmount 时注销
let _onBeat: (() => void) | null = null

// 启动 doraemon 播放（幂等，已在播放则跳过）
async function startDoraemon(onBeat: () => void) {
  _onBeat = onBeat
  if (_isPlaying) return  // 已在播放，只更新视觉回调即可

  preload()
  const [{ sampler, Tone }, midi] = await Promise.all([_samplerReady!, _midiReady!])

  const bpm = midi.header.tempos[0]?.bpm ?? 126
  Tone.getTransport().bpm.value = bpm
  const beatSec = 60 / bpm
  _beatSec = beatSec

  const track = midi.tracks[0]
  let lastBeatTime = -1
  const beatNotes = track.notes.filter(n => {
    const beatIdx = Math.round(n.time / beatSec)
    if (beatIdx !== lastBeatTime) { lastBeatTime = beatIdx; return true }
    return false
  })

  if (_activePart) { _activePart.dispose(); _activePart = null }

  const part = new Tone.Part((time: number, note: { name: string; duration: number; velocity: number; isBeat?: boolean }) => {
    sampler.triggerAttackRelease(note.name, note.duration, time, note.velocity)
    if (!note.isBeat) return
    const delayMs = Math.max(0, (time - Tone.now()) * 1000)
    setTimeout(() => { _onBeat?.() }, delayMs)
  }, [
    ...track.notes.map(n => ({ time: n.time, name: n.name, duration: n.duration, velocity: n.velocity, isBeat: false })),
    ...beatNotes.map(n  => ({ time: n.time,  name: n.name,  duration: n.duration,  velocity: n.velocity,  isBeat: true })),
  ])

  part.loop    = true
  part.loopEnd = midi.duration
  _activePart  = part as unknown as { dispose: () => void }

  Tone.getTransport().stop()
  Tone.getTransport().cancel()
  part.start(0)
  Tone.getTransport().start()
  _isPlaying = true
}

// 停止 doraemon 播放
function stopDoraemon() {
  _onBeat    = null
  _isPlaying = false
  if (_activePart) { _activePart.dispose(); _activePart = null }
  _samplerReady?.then(({ Tone }) => {
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
  }).catch(() => {})
}

export const PoweredByName = memo(({ mode }: Props) => {
  const name    = 'Pan Junyuan'
  const letters = useMemo(() => name.split(''), [])
  const nonSpaceIdx = useMemo(
    () => letters.map((ch, i) => ch !== ' ' ? i : -1).filter(i => i !== -1),
    [letters]
  )

  const [shaking, setShaking] = useState<number | null>(null)
  const [notes,   setNotes]   = useState<FloatingNote[]>([])
  const counterRef    = useRef(0)
  const containerRef  = useRef<HTMLSpanElement>(null)
  const letterRefs    = useRef<(HTMLSpanElement | null)[]>([])
  const tonePartsRef  = useRef<{ dispose: () => void }[]>([])  // 保留以防万一，不再主动使用
  const letterCycleRef = useRef(0)

  const spawnNote = useCallback((li: number) => {
    const el  = letterRefs.current[li]
    const box = containerRef.current
    let x = 0
    if (box && el) {
      const cr = box.getBoundingClientRect()
      const lr = el.getBoundingClientRect()
      x = lr.left - cr.left + lr.width / 2 - 8
    }
    const id     = ++counterRef.current
    const symbol = NOTE_SYMBOLS[id % NOTE_SYMBOLS.length]
    const color  = NOTE_COLORS[id % NOTE_COLORS.length]
    setNotes(n => [...n, { id, x, symbol, color }])
    setTimeout(() => setNotes(n => n.filter(nn => nn.id !== id)), 1400)
  }, [])

  /* 组件 mount 时静默预加载，不等用户操作 */
  useEffect(() => {
    preload()
  }, [])

  /* doraemon 模式：播放 MIDI
     音频状态在模块级管理，组件 unmount 时不停止音频（跨页面持久播放）
     只在切回钢琴模式时真正停止 */
  useEffect(() => {
    if (mode !== 'doraemon') {
      stopDoraemon()
      setShaking(null)
      return
    }

    const onBeat = () => {
      const li = nonSpaceIdx[letterCycleRef.current % nonSpaceIdx.length]
      letterCycleRef.current++
      setShaking(li)
      setTimeout(() => setShaking(s => s === li ? null : s), _beatSec * 600)
      if (letterCycleRef.current % 3 === 0) spawnNote(li)
    }

    startDoraemon(onBeat).catch(err => {
      console.error('[PoweredByName] MIDI playback error:', err)
    })

    // 组件 unmount 时只注销视觉回调，不停止音频
    return () => {
      _onBeat = null
      setShaking(null)
    }
  }, [mode, nonSpaceIdx, spawnNote])

  /* 钢琴模式：点击弹音 */
  const handleClick = useCallback(async (i: number, ch: string) => {
    if (ch === ' ' || mode === 'doraemon') return

    setShaking(null)
    requestAnimationFrame(() => setShaking(i))
    setTimeout(() => setShaking(null), 500)

    try {
      const Tone = await import('tone')
      const synth = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination()
      synth.triggerAttackRelease(PIANO_NOTE_NAMES[i % PIANO_NOTE_NAMES.length], '8n')
      setTimeout(() => synth.dispose(), 2000)
    } catch { /* 静默 */ }

    const el  = letterRefs.current[i]
    const box = containerRef.current
    let x = 0
    if (box && el) {
      const cr = box.getBoundingClientRect()
      const lr = el.getBoundingClientRect()
      x = lr.left - cr.left + lr.width / 2 - 8
    }
    const id     = ++counterRef.current
    const symbol = NOTE_SYMBOLS[id % NOTE_SYMBOLS.length]
    const color  = NOTE_COLORS[id % NOTE_COLORS.length]
    setNotes(n => [...n, { id, x, symbol, color }])
    setTimeout(() => setNotes(n => n.filter(nn => nn.id !== id)), 1200)
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
        {notes.map(n => (
          <motion.span key={n.id}
            initial={{ opacity: 1, y: 0,   scale: 0.8 }}
            animate={{ opacity: 0, y: -44, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            style={{ position: 'absolute', bottom: '100%', left: n.x, pointerEvents: 'none', fontSize: 15, lineHeight: 1, color: n.color, fontWeight: 700 }}
          >
            {n.symbol}
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  )
})

PoweredByName.displayName = 'PoweredByName'
