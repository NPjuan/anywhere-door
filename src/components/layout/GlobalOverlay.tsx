'use client'

import { FooterPowered } from '@/components/layout/FooterPowered'
import { DevPanel } from '@/components/ui/DevPanel'

/* 全局常驻层：Footer + Dev 面板（仅 dev） */
export function GlobalOverlay() {
  return (
    <>
      {process.env.NODE_ENV === 'development' && <DevPanel />}
    </>
  )
}

/* 单独导出 Footer，供各页面按需引用（位置灵活） */
export { FooterPowered }
