'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const PoweredByName = dynamic(
  () => import('@/components/home/PoweredByName').then(m => ({ default: m.PoweredByName })),
  { ssr: false }
)

let _onDoraemonReady: ((cb: () => void) => void) | null = null
async function getOnDoraemonReady() {
  if (!_onDoraemonReady) {
    const m = await import('@/components/home/PoweredByName')
    _onDoraemonReady = m.onDoraemonReady
  }
  return _onDoraemonReady
}

// 模块级持久化 mode，跨页面导航保持状态
let _persistedMode: 'piano' | 'doraemon' = 'piano'

type FooterMode = 'piano' | 'doraemon'

const FOOTER_RAINBOW = ['#FF6B6B','#FF9F43','#FECA57','#1DD1A1','#54A0FF','#A29BFE','#FD79A8']

function RainbowChar({ char, offset }: { char: string; offset: number }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 120)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ color: FOOTER_RAINBOW[(tick + offset) % FOOTER_RAINBOW.length], transition: 'color 0.1s' }}>
      {char}
    </span>
  )
}

function PoweredFlash() {
  const word = 'Powered'
  const [pos, setPos] = useState(-2)

  useEffect(() => {
    let rafId = 0
    const runSweep = () => {
      const start    = performance.now()
      const duration = 600
      const from = -1.5
      const to   = word.length + 0.5
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        setPos(from + t * (to - from))
        if (t < 1) {
          rafId = requestAnimationFrame(tick)
        } else {
          setPos(-2)
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    const init = setTimeout(runSweep, 1500)
    const loop = setInterval(runSweep, 4500)
    return () => { clearTimeout(init); clearInterval(loop); cancelAnimationFrame(rafId) }
  }, [])

  const lerp = (a: string, b: string, t: number) => {
    const hex = (s: string) => [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16)]
    const [ar,ag,ab] = hex(a)
    const [br,bg,bb] = hex(b)
    return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`
  }

  const getColor = (i: number) => {
    const dist = Math.abs(i - pos)
    if (dist > 2.5) return '#94A3B8'
    return lerp('#94A3B8', '#2563EB', Math.max(0, 1 - dist / 2.5))
  }

  return (
    <span>{word.split('').map((ch, i) => <span key={i} style={{ color: getColor(i) }}>{ch}</span>)}</span>
  )
}

export function FooterPowered() {
  const [mode, setMode] = useState<FooterMode>(_persistedMode)
  const [doraemonReady, setDoraemonReady] = useState(false)

  useEffect(() => {
    getOnDoraemonReady().then(fn => fn(() => setDoraemonReady(true)))
  }, [])

  const poweredChars = 'Powered'.split('')

  return (
    <motion.div
      className="relative text-center py-6 text-xs select-none"
      style={{ color: '#CBD5E1', zIndex: 1 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.6 }}
    >
      <span
        onClick={() => {
          const next = mode === 'piano' ? 'doraemon' : 'piano'
          _persistedMode = next
          setMode(next)
        }}
        className="cursor-pointer inline-flex items-center"
        title={mode === 'piano' ? '切换哆啦A梦模式' : '切换钢琴模式'}
      >
        {mode === 'doraemon'
          ? poweredChars.map((ch, i) => <RainbowChar key={i} char={ch} offset={i} />)
          : doraemonReady ? <PoweredFlash /> : <span>Powered</span>
        }
      </span>
      {' by '}
      <PoweredByName mode={mode} />
    </motion.div>
  )
}
