'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

/* ============================================================
   Navbar — 简洁亮色导航（无 Logo 图标）
   Clean light navbar without logo icon
   ============================================================ */

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="fixed top-3 left-4 right-4 z-[var(--z-overlay)]">
      <nav
        className={cn(
          'flex items-center justify-between px-5 h-12',
          'rounded-xl',
          'bg-white/80 backdrop-blur-[12px]',
          'border border-sky-100/80',
          'shadow-[0_2px_12px_rgba(14,165,233,0.08)]',
        )}
        aria-label="主导航"
      >
        {/* 品牌名 — 纯文字，无图标 */}
        <Link
          href="/"
          className={cn(
            'text-sm font-semibold tracking-wide',
            'text-[var(--color-primary)]',
            'transition-opacity duration-150 hover:opacity-70',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded-sm',
          )}
          aria-label="任意门 — 返回主页"
        >
          任意门
          <span className="hidden md:inline text-xs font-normal text-slate-400 ml-2">
            Anywhere Door
          </span>
        </Link>

        {/* 右侧导航 */}
        <div className="flex items-center gap-1">
          <NavLink href="/" current={pathname === '/'}>搜索</NavLink>
        </div>
      </nav>
    </header>
  )
}

function NavLink({ href, children, current }: {
  href: string; children: React.ReactNode; current: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
        current
          ? 'text-[var(--color-primary)] bg-sky-50'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
      )}
    >
      {children}
    </Link>
  )
}
