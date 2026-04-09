import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FullItinerary } from '@/lib/agents/types'

/* ============================================================
   savedPlansStore — 已保存的旅行计划库
   Saved travel plans library (localStorage)
   ============================================================ */

export interface SavedPlan {
  id:          string           // 唯一 ID
  savedAt:     string           // ISO 时间戳
  itinerary:   FullItinerary
}

interface SavedPlansStore {
  plans:       SavedPlan[]

  savePlan:    (itinerary: FullItinerary) => string   // 返回新计划 id
  deletePlan:  (id: string) => void
  hasPlan:     (id: string) => boolean
  getPlan:     (id: string) => SavedPlan | undefined
}

export const useSavedPlansStore = create<SavedPlansStore>()(
  persist(
    (set, get) => ({
      plans: [],

      savePlan: (itinerary) => {
        const id = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const plan: SavedPlan = {
          id,
          savedAt: new Date().toISOString(),
          itinerary: { ...itinerary, id },
        }
        set((s) => ({ plans: [plan, ...s.plans] }))
        return id
      },

      deletePlan: (id) =>
        set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),

      hasPlan: (id) => get().plans.some((p) => p.id === id),

      getPlan: (id) => get().plans.find((p) => p.id === id),
    }),
    {
      name: 'anywhere-door-saved-plans',
    },
  ),
)
