'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { PortalState } from '@/hooks/usePortalAnimation'

/* ============================================================
   PortalDoor — 深色背景版传送门（大气版）
   Portal Door for deep background (bold version)

   改动: 玻璃内部改为深色半透明（适配深色背景）
   Change: Glass interior now dark-translucent (fits deep bg)
   尺寸: Desktop 480px, Tablet 360px, Mobile 280px
   ============================================================ */

interface PortalDoorProps {
  state:      PortalState
  ringColor?: string
  size?:      number
  onClick?:   () => void
}

export function PortalDoor({
  state,
  ringColor = '#38BDF8',
  size = 420,
  onClick,
}: PortalDoorProps) {
  const isIdle      = state === 'IDLE'
  const isSearching = state === 'SEARCHING'
  const isOpen      = state === 'OPEN'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>

      {/* 全屏展开 / Full-screen expand on OPEN */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="portal-expand"
            className="fixed inset-0"
            style={{ background: `radial-gradient(circle at center, ${ringColor}CC, #0A1E38)`, zIndex: 'var(--z-portal)' as string }}
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </AnimatePresence>

      {/* 最外层大光晕 / Outermost large glow */}
      {!isOpen && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 1.5, height: size * 1.5,
            background: `radial-gradient(circle, ${ringColor}12 0%, transparent 65%)`,
          }}
          animate={isIdle ? { scale: [1, 1.08, 1] } : { scale: 1.1 }}
          transition={isIdle ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
        />
      )}

      {/* 中间光圈 / Middle glow ring */}
      {!isOpen && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 1.12, height: size * 1.12,
            border: `1px solid ${ringColor}25`,
          }}
          animate={isIdle ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.9 }}
          transition={isIdle ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : {}}
        />
      )}

      {/* 波纹（OPEN 时）/ Ripple on OPEN */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ripple"
            className="absolute rounded-full pointer-events-none"
            style={{ width: size, height: size, border: `2px solid ${ringColor}` }}
            initial={{ scale: 1, opacity: 0.9 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* 传送门主体 / Main circle */}
      <motion.button
        aria-label={isIdle ? '任意门' : isSearching ? '规划中...' : '出发！'}
        disabled={!onClick || isOpen}
        onClick={onClick}
        className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
        style={{ width: size, height: size, cursor: onClick && !isOpen ? 'pointer' : 'default' }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        whileHover={onClick && isIdle ? { scale: 1.03 } : undefined}
        whileTap={onClick && isIdle ? { scale: 0.97 } : undefined}
      >
        {/* 外圈边框 / Outer border ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `1.5px solid ${ringColor}` }}
          animate={
            isIdle
              ? { boxShadow: [`0 0 20px ${ringColor}30, inset 0 0 20px ${ringColor}10`, `0 0 50px ${ringColor}70, inset 0 0 30px ${ringColor}25`, `0 0 20px ${ringColor}30, inset 0 0 20px ${ringColor}10`] }
              : isSearching
              ? { rotate: 360, borderStyle: 'dashed', boxShadow: `0 0 40px ${ringColor}90` }
              : { boxShadow: `0 0 80px ${ringColor}` }
          }
          transition={
            isIdle
              ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
              : isSearching
              ? { rotate: { duration: 2, repeat: Infinity, ease: 'linear' } }
              : { duration: 0.3 }
          }
        />

        {/* 深色玻璃内部（深色背景专用）/ Dark glass interior */}
        <div
          className="absolute inset-2 rounded-full overflow-hidden"
          style={{
            background: 'rgba(5,15,35,0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${ringColor}30`,
          }}
        >
          {/* 内部高光（左上）/ Inner highlight top-left */}
          <div
            className="absolute"
            style={{
              top: '10%', left: '10%', width: '40%', height: '40%',
              background: `radial-gradient(circle, ${ringColor}18 0%, transparent 70%)`,
            }}
          />
        </div>

        {/* 传送门内容 / Portal content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <PortalContent state={state} ringColor={ringColor} size={size} />
        </div>
      </motion.button>
    </div>
  )
}

function PortalContent({ state, ringColor, size }: { state: PortalState; ringColor: string; size: number }) {
  const iconSize = size * 0.22

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <motion.svg
        width={iconSize} height={iconSize} viewBox="0 0 56 56" fill="none" aria-hidden="true"
        animate={state === 'SEARCHING' ? { rotate: 360 } : { rotate: 0 }}
        transition={state === 'SEARCHING' ? { duration: 2, repeat: Infinity, ease: 'linear' } : { duration: 0.4 }}
      >
        <circle cx="28" cy="28" r="24" stroke={ringColor} strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
        <circle cx="28" cy="28" r="16" stroke={ringColor} strokeWidth="1.5" opacity="0.7" />
        <circle cx="28" cy="28" r="7"  fill={ringColor} opacity="0.9" />
        <line x1="28" y1="3"  x2="28" y2="10" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <line x1="28" y1="46" x2="28" y2="53" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <line x1="3"  y1="28" x2="10" y2="28" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <line x1="46" y1="28" x2="53" y2="28" stroke={ringColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </motion.svg>

      <motion.div
        key={state}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }} className="text-center"
      >
        <div style={{ fontSize: size * 0.07, fontWeight: 700, color: ringColor, letterSpacing: '0.02em' }}>
          {state === 'IDLE' && '任意门'}
          {state === 'SEARCHING' && '规划中'}
          {state === 'OPEN' && '出发！'}
        </div>
        <div style={{ fontSize: size * 0.04, color: ringColor, opacity: 0.5, letterSpacing: '0.12em', marginTop: 4 }}>
          {state === 'IDLE' && 'ANYWHERE DOOR'}
          {state === 'SEARCHING' && 'AI PLANNING...'}
          {state === 'OPEN' && "LET'S GO!"}
        </div>
      </motion.div>
    </div>
  )
}
