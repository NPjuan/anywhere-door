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

/* ---- 探索行程卡片骨架 / Explore Plan Card Skeleton ---- */
export function ExplorePlanCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="行程卡片加载中 / Plan card loading"
      className="break-inside-avoid mb-4"
      style={{
        background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
      }}
    >
      {/* 季节标签位置保留 */}
      <div className="absolute top-3 right-3 w-8 h-5 shimmer rounded" style={{ borderRadius: 6 }} />

      {/* 卡片内容 */}
      <div className="p-4 space-y-3">
        {/* 目的地标签行 */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="w-20 h-5" />
          <Skeleton className="w-16 h-5" />
          <Skeleton className="w-12 h-5" />
        </div>

        {/* 标题 */}
        <div className="space-y-2">
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-full h-4" />
        </div>

        {/* 摘要（3行） */}
        <div className="space-y-2">
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-2/3 h-3" />
        </div>

        {/* 行程亮点 */}
        <div className="space-y-2">
          <Skeleton className="w-16 h-3" />
          <div className="flex gap-1.5">
            <Skeleton className="w-14 h-5" />
            <Skeleton className="w-14 h-5" />
            <Skeleton className="w-14 h-5" />
          </div>
        </div>

        {/* 预算 + 日期 */}
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="w-24 h-3" />
          <Skeleton className="w-12 h-3" />
        </div>
      </div>

      {/* 地图区 */}
      <div style={{ borderTop: '1px solid #F3F4F6' }} className="p-4">
        <div className="flex items-center gap-1 mb-2">
          <Skeleton className="w-12 h-6" />
          <Skeleton className="w-12 h-6" />
        </div>
        <Skeleton className="w-full h-[170px]" />
      </div>
    </div>
  )
}

/* ---- 地图骨架 / Map Skeleton ---- */
export function MapSkeleton() {
  return (
    <div
      role="status"
      aria-label="地图加载中 / Map loading"
      className="relative w-full rounded-lg overflow-hidden h-[280px] sm:h-[400px]"
      style={{ background: '#F8FAFF' }}
    >
      {/* 地图背景骨架 */}
      <div className="absolute inset-0 space-y-2 p-4">
        {/* 模拟地图网格效果 */}
        <div className="grid grid-cols-3 gap-2 h-full">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-full rounded" />
          ))}
        </div>
      </div>

      {/* 控件位置占位符 */}
      <div className="absolute bottom-4 right-3 z-[1000] flex flex-col gap-1">
        <Skeleton className="w-8 h-8 rounded" />
        <div style={{ height: 4 }} />
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-8 h-8 rounded" />
      </div>

      {/* 加载指示器 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/20">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#2563EB transparent #2563EB #2563EB' }} />
      </div>
    </div>
  )
}
