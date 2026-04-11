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
  const tonePartsRef  = useRef<{ dispose: () => void }[]>([])
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

  /* doraemon 模式：播放 MIDI */
  useEffect(() => {
    if (mode !== 'doraemon') {
      // 停止播放，只清 Part，不 dispose Transport（全局单例，dispose 后无法复用）
      tonePartsRef.current.forEach(p => p.dispose())
      tonePartsRef.current = []
      _samplerReady?.then(({ Tone }) => {
        Tone.getTransport().stop()
        Tone.getTransport().cancel()
      }).catch(() => {})
      setShaking(null)
      return
    }

    let cancelled = false

    const startPlayback = async () => {
      try {
        // 确保预加载已启动（防止 doraemon effect 早于 preload effect 执行）
        preload()
        const [{ sampler, Tone }, midi] = await Promise.all([
          _samplerReady!,
          _midiReady!,
        ])
        if (cancelled) return

        // 设置 BPM
        const bpm = midi.header.tempos[0]?.bpm ?? 126
        Tone.getTransport().bpm.value = bpm
        const beatSec = 60 / bpm

        // 安排所有音符
        const track = midi.tracks[0]

        // 过滤出"主旋律音符"：每 beatSec 间隔里取第一个音符，用于驱动字母跳动
        // 这样字母跳动与音符响声严格对应，而不是独立的节拍循环
        let lastBeatTime = -1
        const beatNotes = track.notes.filter(n => {
          const beatIdx = Math.round(n.time / beatSec)
          if (beatIdx !== lastBeatTime) {
            lastBeatTime = beatIdx
            return true
          }
          return false
        })

        const part  = new Tone.Part((time: number, note: { name: string; duration: number; velocity: number; isBeat?: boolean }) => {
          sampler.triggerAttackRelease(note.name, note.duration, time, note.velocity)

          // 仅在"主旋律"音符时触发字母跳动
          if (!note.isBeat) return
          // 用 (time - Tone.now()) 算出距离音符响起还有多少毫秒，setTimeout 精确对齐
          const delayMs = Math.max(0, (time - Tone.now()) * 1000)
          setTimeout(() => {
            if (cancelled) return
            const li = nonSpaceIdx[letterCycleRef.current % nonSpaceIdx.length]
            letterCycleRef.current++
            setShaking(li)
            setTimeout(() => setShaking(s => s === li ? null : s), beatSec * 600)
            if (letterCycleRef.current % 3 === 0) spawnNote(li)
          }, delayMs)
        }, [
          // 全部音符（播放音乐）
          ...track.notes.map(n => ({ time: n.time, name: n.name, duration: n.duration, velocity: n.velocity, isBeat: false })),
          // 主旋律音符（额外标记，触发视觉）
          ...beatNotes.map(n  => ({ time: n.time,  name: n.name,  duration: n.duration,  velocity: n.velocity,  isBeat: true })),
        ])

        part.loop    = true
        part.loopEnd = midi.duration

        tonePartsRef.current = [
          part  as unknown as { dispose: () => void },
        ]

        // 重置 Transport 位置，确保每次都从 0 开始
        Tone.getTransport().stop()
        Tone.getTransport().cancel()
        part.start(0)
        Tone.getTransport().start()

      } catch (err) {
        console.error('[PoweredByName] MIDI playback error:', err)
      }
    }

    startPlayback()

    return () => {
      cancelled = true
      tonePartsRef.current.forEach(p => p.dispose())
      tonePartsRef.current = []
      setShaking(null)
      _samplerReady?.then(({ Tone }) => {
        Tone.getTransport().stop()
        Tone.getTransport().cancel()
      }).catch(() => {})
    }  }, [mode, nonSpaceIdx, spawnNote])

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
