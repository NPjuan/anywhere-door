import { Suspense } from 'react'
import ItineraryContent from './ItineraryContent'

export default function ItineraryPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg-base)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>加载行程中...</p>
      </main>
    }>
      <ItineraryContent />
    </Suspense>
  )
}
