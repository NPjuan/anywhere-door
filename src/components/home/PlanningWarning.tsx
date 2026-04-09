'use client'

import { memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RefreshCw } from 'lucide-react'
import type { WarningType } from '@/hooks/useHomeFlow'

interface PlanningWarningProps {
  warning: WarningType
  onRetry?: () => void
}

/**
 * ===== PlanningWarning 组件 =====
 * 规划过程中的网络延迟警告，支持重试功能
 * 
 * 两级警告：
 * 1. 'slow-processing': 30s+ 无显著进度 → 温和提示
 * 2. 'taking-longer': 90s+ 仍在处理 → 紧急提示 + 重试按钮
 * 
 * 使用 memo 优化：仅当 warning 类型或 onRetry 回调变化时重新渲染
 */
export const PlanningWarning = memo(({ warning, onRetry }: PlanningWarningProps) => {
  const handleRetry = useCallback(() => {
    onRetry?.()
  }, [onRetry])

  const warningConfig = {
    'slow-processing': {
      icon: <AlertCircle size={16} />,
      title: '处理中...',
      message: '行程规划中，可能需要更多时间，请耐心等待',
      background: '#FEF3C7',
      border: '#FCD34D',
      textColor: '#92400E',
      showRetry: false,
    },
    'taking-longer': {
      icon: <AlertCircle size={16} />,
      title: '处理时间较长',
      message: '规划花费的时间比预期长，可能是网络延迟或服务繁忙',
      background: '#FEE2E2',
      border: '#FECACA',
      textColor: '#991B1B',
      showRetry: true,
    },
  }

  if (!warning || !warningConfig[warning]) {
    return null
  }

  const config = warningConfig[warning]

  return (
    <AnimatePresence>
      {warning && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="mb-4 rounded-lg p-4 border flex items-start gap-3"
          style={{
            background: config.background,
            borderColor: config.border,
            color: config.textColor,
          }}
        >
          <div className="shrink-0 mt-0.5">
            {config.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">{config.title}</h4>
            <p className="text-xs leading-relaxed mb-3">{config.message}</p>
            
            {config.showRetry && onRetry && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded transition-all"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  border: `1px solid ${config.textColor}40`,
                  color: config.textColor,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={12} />
                重试规划
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.warning === nextProps.warning &&
    prevProps.onRetry === nextProps.onRetry
  )
})

PlanningWarning.displayName = 'PlanningWarning'
