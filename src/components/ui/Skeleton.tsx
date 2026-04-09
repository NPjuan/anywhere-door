import * as React from 'react'
import { cn } from '@/lib/utils/cn'

/* ============================================================
   Skeleton / 骨架屏组件
   使用 globals.css 的 .shimmer 效果
   Uses .shimmer effect from globals.css
   ============================================================ */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 圆形骨架（头像、传送门）/ Circular skeleton (avatar, portal) */
  circle?: boolean
}

export function Skeleton({ className, circle = false, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-label="加载中 / Loading"
      className={cn(
        'shimmer',
        circle ? 'rounded-full' : 'rounded-[var(--radius-sm)]',
        className,
      )}
      {...props}
    />
  )
}

/* ---- 机票卡片骨架 / Flight Card Skeleton ---- */
export function FlightCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="机票加载中 / Flight loading"
      className="bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] p-5 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton circle className="w-9 h-9" />
          <Skeleton className="w-24 h-4" />
        </div>
        <Skeleton className="w-20 h-6" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="w-16 h-8" />
        <Skeleton className="flex-1 mx-6 h-1" />
        <Skeleton className="w-16 h-8" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="w-14 h-5" />
        <Skeleton className="w-20 h-5" />
      </div>
    </div>
  )
}

/* ---- Agent 进度骨架 / Agent Progress Skeleton ---- */
export function AgentProgressSkeleton() {
  return (
    <div
      role="status"
      aria-label="AI 规划中 / AI planning"
      className="space-y-3"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton circle className="w-8 h-8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="w-24 h-3.5" />
              <Skeleton className="w-16 h-3.5" />
            </div>
            <Skeleton className="w-full h-2 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
