import * as React from 'react'
import { cn } from '@/lib/utils/cn'

/* ============================================================
   Card / 卡片组件
   支持 3 种变体：默认、玻璃态、传送门
   Supports 3 variants: default, glass, portal
   ============================================================ */

export type CardVariant = 'default' | 'glass' | 'portal'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** 悬停时上浮效果 / Hover lift effect */
  hoverable?: boolean
  /** 点击态 / Clickable state */
  clickable?: boolean
}

const variantStyles: Record<CardVariant, string> = {
  /** 标准白色卡片（搜索结果页）/ Standard white card (search results) */
  default: [
    'bg-white border border-[var(--color-border)]',
    'shadow-[var(--shadow-card)]',
  ].join(' '),

  /** 玻璃态卡片（深色背景专用）/ Glassmorphism card (dark backgrounds only) */
  glass: [
    'bg-[var(--color-glass)] backdrop-blur-xl',
    'border border-[var(--color-glass-border)]',
  ].join(' '),

  /** 传送门主题卡片 / Portal theme card */
  portal: [
    'bg-white/5 backdrop-blur-lg',
    'border border-[var(--color-portal-glow)]/30',
    'shadow-[0_0_20px_rgba(56,189,248,0.1)]',
  ].join(' '),
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverable = false, clickable = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-md)]',
        'transition-all duration-[var(--duration-base)]',
        variantStyles[variant],
        hoverable && [
          'hover:-translate-y-0.5',
          'hover:shadow-[var(--shadow-lg)]',
          variant === 'default' && 'hover:border-[var(--color-primary)]',
          variant === 'portal' && 'hover:shadow-[0_0_32px_rgba(56,189,248,0.25)]',
        ],
        clickable && 'cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
)
Card.displayName = 'Card'

/* ---- 子组件 / Sub-components ---- */

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 pt-5 pb-3', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'font-[family-name:var(--font-heading)] text-base font-semibold',
        'tracking-wider text-[var(--color-text)]',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  ),
)
CardTitle.displayName = 'CardTitle'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 pb-5', className)} {...props} />
  ),
)
CardContent.displayName = 'CardContent'

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-5 py-3 border-t border-[var(--color-border)] flex items-center gap-2',
        className,
      )}
      {...props}
    />
  ),
)
CardFooter.displayName = 'CardFooter'
