'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

/* ============================================================
   PortalTransition — 全屏传送门页面过渡
   Full-screen portal page transition

   触发 Trigger: 传送门进入 OPEN 状态后调用
   技术 Tech: clip-path circle expand → router.push → AnimatePresence
   规则 Rule: 一次性动画（forwards），非装饰性 infinite
              One-shot animation (forwards), not decorative infinite
   ============================================================ */

interface PortalTransitionProps {
  /** 是否激活过渡 / Whether to activate transition */
  active: boolean
  /** 目标路由 / Target route */
  href: string
  /** 过渡颜色 / Transition color */
  color?: string
  /** 过渡完成后回调 / Callback after transition completes */
  onComplete?: () => void
}

export function PortalTransition({
  active,
  href,
  color = 'var(--color-portal-glow)',
  onComplete,
}: PortalTransitionProps) {
  const router = useRouter()
  const hasNavigated = useRef(false)

  useEffect(() => {
    if (active && !hasNavigated.current) {
      hasNavigated.current = true
      /* 在动画进行到一半时开始预取路由 / Prefetch route halfway through animation */
      const timer = setTimeout(() => {
        router.push(href)
        onComplete?.()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [active, href, router, onComplete])

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* 白色闪光层（先于扩展出现）/ White flash layer (before expand) */}
          <motion.div
            key="flash"
            className="fixed inset-0 pointer-events-none"
            style={{ backgroundColor: 'white', zIndex: 'calc(var(--z-portal) - 1)' as string }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />

          {/* 主扩展层 / Main expand layer */}
          <motion.div
            key="expand"
            className="fixed inset-0 pointer-events-none"
            style={{ backgroundColor: color, zIndex: 'var(--z-portal)' as string }}
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </>
      )}
    </AnimatePresence>
  )
}
