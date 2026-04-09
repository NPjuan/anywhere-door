import { Suspense } from 'react'
import { SkyBackground }  from '@/components/portal/AuroraBackground'
import { SearchForm }     from '@/components/search/SearchForm'
import { FlightList }     from '@/components/search/FlightList'
import { FlightCardSkeleton } from '@/components/ui/Skeleton'

/* 搜索结果页 / Search results page */
export default function SearchPage() {
  return (
    <main
      className="relative min-h-screen pt-20 pb-16 px-4"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <SkyBackground />

      <div
        className="relative max-w-2xl mx-auto flex flex-col gap-5"
        style={{ zIndex: 1 }}
      >
        {/* 紧凑搜索表单 / Compact search form */}
        <div className="pt-4">
          <SearchForm compact />
        </div>

        {/* 机票列表 / Flight list */}
        <Suspense
          fallback={
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <FlightCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <FlightList />
        </Suspense>
      </div>
    </main>
  )
}
