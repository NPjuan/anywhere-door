import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ============================================================
   searchStore — 搜索参数状态（重构版）
   Search params state (redesigned)

   移除机票字段，新增 prompt 字段
   Removed flight fields, added prompt field
   ============================================================ */

export interface CityOption {
  code: string; // 主机场 IATA code（用于行程规划）
  name: string;
  nameEn: string;
  airport: string; // 主机场名
  country: string;
  // 用户选填的具体机场（可与 code 不同）
  selectedAirportCode?: string;
  selectedAirportName?: string;
}

export interface PlacePOI {
  id:       string
  name:     string
  address:  string
  cityname: string
  lat:      number
  lng:      number
}

export interface SearchParams {
  origin: CityOption | null;
  destination: CityOption | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  prompt: string; // 用户自定义旅行诉求 / User travel prompt
  hotelPOI:   PlacePOI | null;
  mustVisit:  PlacePOI[];
  mustAvoid:  PlacePOI[];
}

interface SearchStore {
  params: SearchParams;
  setOrigin: (city: CityOption | null) => void;
  setDestination: (city: CityOption | null) => void;
  setDateRange: (start: string, end: string) => void;
  setPrompt: (prompt: string) => void;
  setHotelPOI: (poi: PlacePOI | null) => void;
  setMustVisit: (pois: PlacePOI[]) => void;
  setMustAvoid: (pois: PlacePOI[]) => void;
  swapCities: () => void;
  reset: () => void;
  isValid: () => boolean;
  getDays: () => number;
}

const defaultParams: SearchParams = {
  origin: null,
  destination: null,
  startDate: '',
  endDate: '',
  prompt: '',
  hotelPOI:  null,
  mustVisit: [],
  mustAvoid: [],
};

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      params: defaultParams,

      setOrigin: (city) =>
        set((s) => ({ params: { ...s.params, origin: city } })),
      setDestination: (city) =>
        set((s) => ({ params: { ...s.params, destination: city } })),
      setDateRange: (start, end) =>
        set((s) => ({
          params: { ...s.params, startDate: start, endDate: end },
        })),
      setPrompt: (prompt) => set((s) => ({ params: { ...s.params, prompt } })),
      setHotelPOI: (poi) => set((s) => ({ params: { ...s.params, hotelPOI: poi } })),
      setMustVisit: (pois) => set((s) => ({ params: { ...s.params, mustVisit: pois } })),
      setMustAvoid: (pois) => set((s) => ({ params: { ...s.params, mustAvoid: pois } })),

      swapCities: () =>
        set((s) => ({
          params: {
            ...s.params,
            origin: s.params.destination,
            destination: s.params.origin,
          },
        })),

      reset: () => set({ params: defaultParams }),

      isValid: () => {
        const { origin, destination, startDate } = get().params;

        if (!origin || !destination) return false;
        if (origin.code === destination.code) return false;
        if (!startDate) return false;

        return true;
      },

      getDays: () => {
        const { startDate, endDate } = get().params;
        if (!startDate || !endDate) return 3;
        const diff =
          (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          86400000;
        return Math.max(1, Math.ceil(diff)) + 1;
      },
    }),
    {
      name: 'anywhere-door-search-v2',
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') return null;
          const v = localStorage.getItem(key);
          return v ? JSON.parse(v) : null;
        },
        setItem: (key, value) =>
          localStorage.setItem(key, JSON.stringify(value)),
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
);
