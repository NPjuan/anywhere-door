import * as React from 'react'
import { cn } from '@/lib/utils/cn'

/* ============================================================
   Badge / 标签徽章组件
   用于：旅行风格标签、机票状态、POI 类型
   Used for: travel style tags, flight status, POI types
   ============================================================ */

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'portal'
  | 'success'
  | 'warning'
  | 'error'
  | 'photography'
  | 'foodie'
  | 'adventure'
  | 'culture'
  | 'relaxation'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  /** 圆形小点 / Dot indicator */
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default:      'bg-[var(--color-border)] text-[var(--color-text-muted)]',
  primary:      'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  portal:       'bg-[var(--color-portal-glow)]/15 text-[var(--color-portal-glow)]',
  success:      'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  warning:      'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  error:        'bg-[var(--color-error)]/10 text-[var(--color-error)]',
  /* 旅行风格 / Travel styles */
  photography:  'bg-[var(--color-style-photography)]/10 text-[var(--color-style-photography)]',
  foodie:       'bg-[var(--color-style-foodie)]/10 text-[var(--color-style-foodie)]',
  adventure:    'bg-[var(--color-style-adventure)]/10 text-[var(--color-style-adventure)]',
  culture:      'bg-[var(--color-style-culture)]/10 text-[var(--color-style-culture)]',
  relaxation:   'bg-[var(--color-style-relaxation)]/10 text-[var(--color-style-relaxation)]',
}

const dotColors: Record<BadgeVariant, string> = {
  default:      'bg-[var(--color-text-muted)]',
  primary:      'bg-[var(--color-primary)]',
  portal:       'bg-[var(--color-portal-glow)]',
  success:      'bg-[var(--color-success)]',
  warning:      'bg-[var(--color-warning)]',
  error:        'bg-[var(--color-error)]',
  photography:  'bg-[var(--color-style-photography)]',
  foodie:       'bg-[var(--color-style-foodie)]',
  adventure:    'bg-[var(--color-style-adventure)]',
  culture:      'bg-[var(--color-style-culture)]',
  relaxation:   'bg-[var(--color-style-relaxation)]',
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', dot = false, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-2.5 py-0.5 rounded-[var(--radius-sm)]',
        'text-xs font-medium',
        'font-[family-name:var(--font-body)]',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  ),
)
Badge.displayName = 'Badge'
