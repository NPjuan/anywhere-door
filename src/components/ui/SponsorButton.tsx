'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, X } from 'lucide-react'
import Image from 'next/image'
import qrCode from '@/assets/payment-collection-code.png'

/* ============================================================
   SponsorButton — 右下角赞助按钮 + 收款码弹窗
   ============================================================ */

export function SponsorButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 触发按钮 */}
      <motion.button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 cursor-pointer w-full"
        style={{
          background:   '#FFFFFF',
          border:       '1px solid #E5E7EB',
          borderRadius: 8,
          padding:      '7px 14px',
          color:        '#6B7280',
          fontSize:     13,
        }}
        whileHover={{ color: '#374151' }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <Heart size={13} />
        <span>赞助</span>
      </motion.button>

      {/* 弹出层遮罩 */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.2)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* 弹窗卡片 */}
            <motion.div
              className="fixed bottom-16 right-6 z-50 w-64"
              style={{
                background:   '#FFFFFF',
                border:       '1px solid #E5E7EB',
                borderRadius: 12,
                boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
                overflow:     'hidden',
              }}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{   opacity: 0, y: 8,   scale: 0.97 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            >
              {/* 头部 */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #F3F4F6' }}
              >
                <div className="flex items-center gap-1.5">
                  <Heart size={13} style={{ color: '#F43F5E' }} />
                  <span className="text-sm font-medium" style={{ color: '#111827' }}>请我喝杯可乐</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center w-6 h-6 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                  style={{ color: '#9CA3AF', border: 'none', background: 'none' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* 收款码 */}
              <div className="px-5 py-4 flex flex-col items-center gap-3">
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid #F3F4F6' }}
                >
                  <Image
                    src={qrCode}
                    alt="收款码"
                    width={180}
                    height={180}
                    style={{ display: 'block' }}
                  />
                </div>
                <p className="text-xs text-center" style={{ color: '#6B7280', lineHeight: 1.6 }}>
                  如果你喜欢这个产品<br />就请我喝一杯无糖可乐吧 🥤
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
