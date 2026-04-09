import { create } from 'zustand'
import type { FullItinerary } from '@/lib/agents/types'

/* ============================================================
   itineraryStore — 最终行程状态（纯内存 + Supabase 恢复）
   Final itinerary state — in-memory with Supabase recovery
   
   Flow:
   1. useEffect in page/component calls hydrate(planId)
   2. hydrate() fetches plan from /api/plans/[id]
   3. If plan.status='done' and has itinerary, restore to store
   4. Component re-renders with restored data
   ============================================================ */

interface ItineraryStore {
  itinerary: FullItinerary | null
  rawJson:   string
  activeDay: number
  isLoading: boolean
  planId:    string | null   // 当前计划的 DB id，用于生成分享链接

  setItinerary: (raw: string) => void
  setActiveDay: (day: number) => void
  setLoading:   (v: boolean) => void
  setPlanId:    (id: string | null) => void
  clear:        () => void

  // ===== 新增：从 Supabase 恢复行程 =====
  hydrate: (planId: string) => Promise<void>
}

function extractJSON(raw: string): FullItinerary | null {
  try { return JSON.parse(raw.trim()) } catch {}
  const lastBrace = raw.lastIndexOf('}')
  if (lastBrace < 0) return null
  for (let i = lastBrace; i >= 0; i--) {
    if (raw[i] === '{') {
      try { return JSON.parse(raw.slice(i, lastBrace + 1)) } catch {}
    }
  }
  return null
}

export const useItineraryStore = create<ItineraryStore>()((set) => ({
  itinerary: null,
  rawJson:   '',
  activeDay: 0,
  isLoading: false,
  planId:    null,

  setItinerary: (raw) => {
    const parsed = extractJSON(raw)
    set({ rawJson: raw, itinerary: parsed, isLoading: false })
  },

  setActiveDay: (day) => set({ activeDay: day }),
  setLoading:   (v)   => set({ isLoading: v }),
  setPlanId:    (id)  => set({ planId: id }),
  clear:        ()    => set({ itinerary: null, rawJson: '', activeDay: 0, planId: null }),

  /* ===== 从 Supabase 恢复行程 =====
     用于页面刷新时恢复已生成的行程
     Flow:
     1. 仅当 status='done' 且 itinerary 存在时恢复
     2. 将 itinerary JSON 字符串化后调用 setItinerary
     3. 恢复失败不抛出错误（沉默失败），UI 退回 form 步骤
  */
  hydrate: async (planId: string) => {
    if (!planId) return
    
    set({ isLoading: true })
    try {
      const res = await fetch(`/api/plans/${planId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      const { plan } = await res.json() as { plan?: Record<string, unknown> }
      if (!plan) throw new Error('Plan not found')
      
      // 仅恢复 done 状态且有 itinerary 的计划
      if (plan.status === 'done' && plan.itinerary) {
        const itinerary = plan.itinerary as FullItinerary
        const rawJson = JSON.stringify(itinerary)
        set({
          itinerary,
          rawJson,
          planId,
          isLoading: false,
          activeDay: 0,
        })
        return
      }
      
      // 计划未完成或无数据，清空 loading 状态
      set({ isLoading: false })
    } catch (err) {
      console.warn('[itineraryStore.hydrate] Failed to restore:', err)
      set({ isLoading: false })
    }
  },
}))
