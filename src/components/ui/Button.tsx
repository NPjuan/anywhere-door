import * as React from 'react'
import { cn } from '@/lib/utils/cn'

/* ============================================================
   Button / 按钮组件
   基于设计系统 token，支持 5 种变体 + 3 种尺寸
   Based on design tokens, supports 5 variants + 3 sizes
   ============================================================ */

export type ButtonVariant = 'primary' | 'cta' | 'outline' | 'ghost' | 'portal'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** 加载状态 / Loading state */
  loading?: boolean
  /** 图标（左侧）/ Icon (left side) */
  icon?: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  /** 主要操作 / Primary action */
  primary: [
    'bg-[var(--color-primary)] text-white',
    'hover:bg-[var(--color-primary-hover)]',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
  ].join(' '),

  /** 行动按钮（出发橙）/ CTA button (go orange) */
  cta: [
    'bg-[var(--color-cta)] text-white font-[family-name:var(--font-heading)] tracking-widest uppercase',
    'hover:bg-[var(--color-cta-hover)]',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-cta)] focus-visible:ring-offset-2',
    'shadow-[0_4px_20px_rgba(249,115,22,0.35)]',
    'hover:shadow-[0_6px_28px_rgba(249,115,22,0.5)]',
  ].join(' '),

  /** 边框按钮 / Outline button */
  outline: [
    'border border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent',
    'hover:bg-[var(--color-primary)] hover:text-white',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
  ].join(' '),

  /** 透明按钮 / Ghost button */
  ghost: [
    'text-[var(--color-text-muted)] bg-transparent',
    'hover:bg-[var(--color-border)] hover:text-[var(--color-text)]',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-portal-glow)] focus-visible:ring-offset-2',
  ].join(' '),

  /** 传送门风格（深色背景专用）/ Portal style (for dark backgrounds) */
  portal: [
    'border-2 border-[var(--color-portal-glow)] text-[var(--color-portal-glow)] bg-transparent',
    'hover:bg-[var(--color-portal-glow)]/10',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-portal-glow)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-deep)]',
    'shadow-[0_0_12px_rgba(56,189,248,0.3)]',
    'hover:shadow-[0_0_24px_rgba(56,189,248,0.5)]',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm:  'h-8  px-3 text-sm  rounded-[var(--radius-sm)]',
  md:  'h-10 px-4 text-sm  rounded-[var(--radius-md)]',
  lg:  'h-14 px-6 text-base rounded-[var(--radius-lg)]',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      icon,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          /* 基础样式 / Base styles */
          'inline-flex items-center justify-center gap-2',
          'font-medium transition-all duration-[var(--duration-base)]',
          'cursor-pointer select-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none',
          /* 变体 + 尺寸 / Variant + size */
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {/* 加载 spinner / Loading spinner */}
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}

        {/* 左侧图标 / Left icon */}
        {!loading && icon && (
          <span className="shrink-0" aria-hidden="true">{icon}</span>
        )}

        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
