'use client'

import { useEffect, useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MULTILANG_TITLES = [
  { text: '任意门', lang: 'zh' },
  { text: 'Anywhere Door', lang: 'en' },
  { text: 'どこでもドア', lang: 'ja' },
  { text: 'Porte Magique', lang: 'fr' },
  { text: 'Puerta Mágica', lang: 'es' },
  { text: '어디든 문', lang: 'ko' },
  { text: 'Porta Magica', lang: 'it' },
  { text: 'Wundertür', lang: 'de' },
]

/**
 * ===== HeroSection 组件 =====
 * 多语言标题动画展示
 * 使用 memo 优化：该组件无 props，自管理动画状态，不需要外部重渲染
 */
export const HeroSection = memo(() => {
  const [idx, setIdx] = useState(0)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % MULTILANG_TITLES.length)
      setKey((k) => k + 1)
    }, 2200)
    return () => clearInterval(t)
  }, [])

  const current = MULTILANG_TITLES[idx]
  const isRtl = current.lang === 'ar'

  return (
    <div className="text-center py-16 md:py-24">
      <h1 className="font-black" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 1 }}>
        <motion.div
          key={key}
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={`${current.lang}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #1e40af 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                direction: isRtl ? 'rtl' : 'ltr',
                display: 'inline-block',
                fontStyle: current.lang === 'ja' ? 'italic' : 'normal',
              }}
            >
              {current.text}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </h1>
      <p
        className="mt-4 text-sm md:text-base"
        style={{ color: '#64748B', lineHeight: 1.6 }}
      >
        AI 智能行程规划引擎
        <br />
        🌍 探索世界，从这里开始
      </p>
    </div>
  )
})

HeroSection.displayName = 'HeroSection'
