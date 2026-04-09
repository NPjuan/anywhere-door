import { create } from 'zustand'
import type { FlightOffer } from '@/lib/api/flights/types'

/* ============================================================
   flightStore — 机票搜索结果状态
   Flight search results state
   ============================================================ */

type LoadState = 'idle' | 'loading' | 'success' | 'error'

interface FlightStore {
  offers:       FlightOffer[]
  selected:     FlightOffer | null
  loadState:    LoadState
  error:        string | null
  source:       string | null   // 'amadeus' | 'aviationstack' | 'mock'
  sortBy:       'price' | 'duration' | 'best'
  filterStops:  number | null   // null = all, 0 = 直飞, 1 = 1次
  filterMaxPrice: number | null

  setOffers:    (offers: FlightOffer[], source: string) => void
  setLoading:   () => void
  setError:     (msg: string) => void
  selectFlight: (offer: FlightOffer) => void
  setSortBy:    (sort: 'price' | 'duration' | 'best') => void
  setFilterStops:    (stops: number | null) => void
  setFilterMaxPrice: (price: number | null) => void
  reset:        () => void

  /** 计算排序+筛选后的结果 / Computed: sorted + filtered offers */
  getFilteredOffers: () => FlightOffer[]
}

export const useFlightStore = create<FlightStore>()((set, get) => ({
  offers:          [],
  selected:        null,
  loadState:       'idle',
  error:           null,
  source:          null,
  sortBy:          'best',
  filterStops:     null,
  filterMaxPrice:  null,

  setOffers: (offers, source) =>
    set({ offers, source, loadState: 'success', error: null }),

  setLoading: () =>
    set({ loadState: 'loading', error: null }),

  setError: (msg) =>
    set({ loadState: 'error', error: msg }),

  selectFlight: (offer) =>
    set({ selected: offer }),

  setSortBy: (sortBy) => set({ sortBy }),

  setFilterStops: (filterStops) => set({ filterStops }),

  setFilterMaxPrice: (filterMaxPrice) => set({ filterMaxPrice }),

  reset: () => set({
    offers: [], selected: null, loadState: 'idle',
    error: null, source: null,
  }),

  getFilteredOffers: () => {
    const { offers, sortBy, filterStops, filterMaxPrice } = get()

    let filtered = offers.filter((o) => {
      const stops = o.itineraries[0]?.segments.reduce(
        (acc, s) => acc + s.stops, 0,
      ) ?? 0
      if (filterStops !== null && stops !== filterStops) return false
      if (filterMaxPrice !== null && o.price.total > filterMaxPrice) return false
      return true
    })

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'price') return a.price.total - b.price.total
      if (sortBy === 'duration') {
        const durA = parseDuration(a.itineraries[0]?.totalDuration ?? '')
        const durB = parseDuration(b.itineraries[0]?.totalDuration ?? '')
        return durA - durB
      }
      // best: score = price rank * 0.6 + duration rank * 0.4
      return a.price.total - b.price.total
    })

    return filtered
  },
}))

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  return ((+(m?.[1] ?? 0)) * 60 + +(m?.[2] ?? 0))
}
