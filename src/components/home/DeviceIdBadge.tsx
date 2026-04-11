'use client'

import { useState, memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

/**
 * ===== DeviceIdBadge 组件 =====
 * 设备 ID 显示徽章，支持复制功能
 * 使用 memo 优化：仅当 id 变化时重新渲染
 */
export const DeviceIdBadge = memo(({ id }: { id: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* 静默 */
    }
  }, [id])

  return (
    <motion.button
      onClick={handleCopy}
      whileTap={{ scale: 0.95 }}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all"
      style={{
        background: copied ? '#F0FDF4' : '#FFFFFF',
        border: `1px solid ${copied ? '#BBF7D0' : '#E2E8F0'}`,
        color: copied ? '#16A34A' : '#94A3B8',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        fontFamily: 'monospace',
      }}
      title="点击复制 ID"
    >
      {/* 始终占位，保持宽度 */}
      <span style={{ color: '#CBD5E1', opacity: copied ? 0 : 1 }}>ID</span>
      <span style={{ opacity: copied ? 0 : 1 }}>{id}</span>

      {/* 复制成功浮层，绝对居中，不影响宽度 */}
      {copied && (
        <span className="absolute inset-0 flex items-center justify-center gap-1">
          <CheckCircle2 size={11} />已复制
        </span>
      )}
    </motion.button>
  )
})

DeviceIdBadge.displayName = 'DeviceIdBadge'
