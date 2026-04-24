import { create } from 'zustand';

/* ============================================================
   searchStore — 搜索参数状态（纯内存，不使用 localStorage）
   持久化通过 Supabase DB（planning_params 字段）
   ============================================================ */

export interface CityOption {
  code: string;
  name: string;
  nameEn: string;
  airport: string;
  country: string;
  selectedAirportCode?: string;
  selectedAirportName?: string;
  selectedStationName?: string;   // 高铁站名，如 '北京南站'
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
  origin:        CityOption | null;
  destination:   CityOption | null;
  startDate:     string;
  endDate:       string;
  prompt:        string;
  travelers:     number;
  hotelPOI:      PlacePOI | null;
  mustVisit:     PlacePOI[];
  mustAvoid:     PlacePOI[];
  arrivalTime:   string;   // HH:mm，落地时间（选填）
  departureTime: string;   // HH:mm，返程起飞时间（选填）
  budgetLimit:   string;   // 预算上限，如 "5000"（选填）
  aiModel:       'deepseek' | 'deepseek-flash' | 'glm-4-flash' | 'glm-5-turbo' | 'glm-5' | 'glm-5.1' | 'claude';  // AI 模型选择
}

interface SearchStore {
  params: SearchParams;
  setOrigin:        (city: CityOption | null) => void;
  setDestination:   (city: CityOption | null) => void;
  setDateRange:     (start: string, end: string) => void;
  setPrompt:        (prompt: string) => void;
  setTravelers:     (n: number) => void;
  setHotelPOI:      (poi: PlacePOI | null) => void;
  setMustVisit:     (pois: PlacePOI[]) => void;
  setMustAvoid:     (pois: PlacePOI[]) => void;
  setArrivalTime:   (t: string) => void;
  setDepartureTime: (t: string) => void;
  setBudgetLimit:   (v: string) => void;
  setAiModel:       (m: 'deepseek' | 'deepseek-flash' | 'glm-4-flash' | 'glm-5-turbo' | 'glm-5' | 'glm-5.1' | 'claude') => void;
  swapCities:       () => void;
  reset:            () => void;
  restore:          (partial: Partial<SearchParams>) => void;
  isValid:          () => boolean;
  getDays:          () => number;
}

export const defaultSearchParams: SearchParams = {
  origin:        null,
  destination:   null,
  startDate:     '',
  endDate:       '',
  prompt:        '',
  travelers:     1,
  hotelPOI:      null,
  mustVisit:     [],
  mustAvoid:     [],
  arrivalTime:   '',
  departureTime: '',
  budgetLimit:   '',
  aiModel:       'deepseek-flash',
};

export const useSearchStore = create<SearchStore>()((set, get) => ({
  params: defaultSearchParams,

  setOrigin:      (city) => set((s) => ({ params: { ...s.params, origin: city } })),
  setDestination: (city) => set((s) => ({ params: { ...s.params, destination: city } })),
  setDateRange:   (start, end) => set((s) => ({ params: { ...s.params, startDate: start, endDate: end } })),
  setPrompt:      (prompt) => set((s) => ({ params: { ...s.params, prompt } })),
  setTravelers:     (n) => set((s) => ({ params: { ...s.params, travelers: Math.max(1, Math.min(20, n)) } })),
  setHotelPOI:      (poi) => set((s) => ({ params: { ...s.params, hotelPOI: poi } })),
  setMustVisit:     (pois) => set((s) => ({ params: { ...s.params, mustVisit: pois } })),
  setMustAvoid:     (pois) => set((s) => ({ params: { ...s.params, mustAvoid: pois } })),
  setArrivalTime:   (t) => set((s) => ({ params: { ...s.params, arrivalTime: t } })),
  setDepartureTime: (t) => set((s) => ({ params: { ...s.params, departureTime: t } })),
  setBudgetLimit:   (v) => set((s) => ({ params: { ...s.params, budgetLimit: v } })),
  setAiModel:       (m) => set((s) => ({ params: { ...s.params, aiModel: m } })),

  swapCities: () => set((s) => ({
    params: { ...s.params, origin: s.params.destination, destination: s.params.origin },
  })),

  reset: () => set({ params: defaultSearchParams }),

  // 从 DB planning_params 恢复表单数据
  restore: (partial) => set((s) => ({
    params: { ...defaultSearchParams, ...s.params, ...partial },
  })),

  isValid: () => {
    const { origin, destination, startDate } = get().params;
    if (!origin || !destination) return false;
    // 用城市名判断是否同城（兼容无机场城市 code 为空的情况）
    if (origin.name === destination.name) return false;
    if (!startDate) return false;
    return true;
  },

  getDays: () => {
    const { startDate, endDate } = get().params;
    if (!startDate || !endDate) return 3;
    const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
    return Math.max(1, Math.ceil(diff)) + 1;
  },
}));
