/* ============================================================
   SkipLink — 键盘用户跳过导航的 Skip Link
   Skip navigation link for keyboard users

   来源 Source: ui-ux-pro-max → "Skip to main content link" (High severity)
   默认隐藏，Tab 时浮出 / Hidden by default, appears on Tab
   ============================================================ */

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className={[
        'fixed top-2 left-2 z-[999]',
        'px-4 py-2 rounded-[var(--radius-md)]',
        'text-sm font-medium text-white',
        'translate-y-[-200%] focus:translate-y-0',
        'transition-transform duration-150',
        'focus:outline-none focus:ring-2 focus:ring-white',
      ].join(' ')}
      style={{ background: 'var(--color-primary)' }}
    >
      跳到主要内容 Skip to main content
    </a>
  )
}
