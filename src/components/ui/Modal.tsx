'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from './Button'

/* ============================================================
   Modal / 模态框组件
   使用 React Portal 渲染到 body，支持 ESC 关闭和背景点击关闭
   Renders via React Portal to body; supports ESC and backdrop click to close
   ============================================================ */

export interface ModalProps {
  /** 是否显示 / Whether visible */
  open: boolean
  /** 关闭回调 / Close callback */
  onClose: () => void
  /** 标题 / Title */
  title?: string
  /** 内容 / Content */
  children: React.ReactNode
  /** 底部操作区 / Footer actions */
  footer?: React.ReactNode
  /** 自定义宽度类 / Custom width class */
  widthClass?: string
}

export function Modal({ open, onClose, title, children, footer, widthClass = 'max-w-lg' }: ModalProps) {
  /* ESC 关闭 / ESC to close */
  React.useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  /* 防止背景滚动 / Prevent background scroll */
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    /* 背景遮罩 / Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className={cn(
        'fixed inset-0 z-[var(--z-modal)]',
        'flex items-center justify-center p-4',
        'bg-black/50 backdrop-blur-sm',
        'animate-[fadeIn_200ms_ease]',
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* 模态框主体 / Modal body */}
      <div
        className={cn(
          'relative w-full bg-white',
          'rounded-[var(--radius-xl)]',
          'shadow-[var(--shadow-lg)]',
          'animate-[slideUp_250ms_var(--ease-portal)]',
          widthClass,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 / Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
            <h2
              id="modal-title"
              className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-wider text-[var(--color-text)]"
            >
              {title}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              aria-label="关闭 / Close"
              onClick={onClose}
              icon={<X size={16} />}
              className="w-8 h-8 p-0 rounded-full"
            />
          </div>
        )}

        {/* 内容区 / Content */}
        <div className="px-6 py-5">{children}</div>

        {/* 底部 / Footer */}
        {footer && (
          <div className="px-6 pb-5 pt-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}

        {/* 无标题时的关闭按钮 / Close button when no title */}
        {!title && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="关闭 / Close"
            onClick={onClose}
            icon={<X size={16} />}
            className="absolute top-4 right-4 w-8 h-8 p-0 rounded-full"
          />
        )}
      </div>
    </div>
  )
}
