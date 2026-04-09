import { Suspense } from 'react'
import PlanContent from './PlanContent'

export default function PlanPage() {
  return (
    <Suspense fallback={
      <main className="relative min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg-base)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>加载中...</p>
      </main>
    }>
      <PlanContent />
    </Suspense>
  )
}
