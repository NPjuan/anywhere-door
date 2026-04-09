/* ============================================================
   Flight API 标准类型 / Canonical Flight Types
   所有适配器必须将响应 normalize 成这些类型
   All adapters must normalize responses to these types
   ============================================================ */

/** 机场/城市端点 / Airport/city endpoint */
export interface FlightEndpoint {
  code:     string   // IATA code, e.g. "PEK"
  name:     string   // 城市名 / City name
  airport:  string   // 机场名 / Airport name
  time:     string   // ISO datetime, e.g. "2025-05-01T08:30:00"
  terminal?: string
}

/** 航段 / Flight segment */
export interface FlightSegment {
  origin:      FlightEndpoint
  destination: FlightEndpoint
  carrier:     string   // 航司代码 / Carrier code, e.g. "CA"
  carrierName: string   // 航司全称 / Carrier full name
  flightNumber: string  // e.g. "CA1234"
  aircraft?:   string
  duration:    string   // ISO 8601 duration, e.g. "PT2H30M"
  stops:       number
}

/** 行程（含中转）/ Itinerary (may include connections) */
export interface FlightItinerary {
  segments:     FlightSegment[]
  totalDuration: string   // ISO 8601 total duration
}

/** 价格 / Price */
export interface FlightPrice {
  total:    number
  base:     number
  currency: string   // e.g. "CNY"
  per_adult: number
}

/** 标准化机票报价 / Canonical flight offer */
export interface FlightOffer {
  id:           string
  itineraries:  FlightItinerary[]   // [0]=去程, [1]=返程(可选)
  price:        FlightPrice
  seats?:       number              // 剩余座位 / Remaining seats
  cabinClass:   'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'
  bookingClass?: string
  validatingCarrier: string
  /** 数据来源适配器 / Source adapter name */
  source:       'amadeus' | 'aviationstack' | 'mock'
  /** 原始响应（调试用）/ Raw response (debug) */
  raw?:         unknown
}

/** 机票搜索参数 / Flight search params */
export interface FlightSearchParams {
  originCode:      string   // IATA
  destinationCode: string   // IATA
  departureDate:   string   // YYYY-MM-DD
  returnDate?:     string   // YYYY-MM-DD (往返)
  adults:          number
  currencyCode?:   string   // default: CNY
  maxResults?:     number   // default: 10
}

/** 适配器接口 / Adapter interface */
export interface FlightAdapter {
  /** 适配器名称 / Adapter name */
  name: 'amadeus' | 'aviationstack' | 'mock'
  /** 优先级，越小越优先 / Priority, lower = higher */
  priority: number
  /** 搜索航班 / Search flights */
  searchFlights(params: FlightSearchParams): Promise<FlightOffer[]>
  /** 健康检查（是否可用）/ Health check */
  isAvailable(): Promise<boolean>
}

/* ---- 工具函数 / Utility functions ---- */

/** 解析 ISO 8601 时长为可读字符串 / Parse ISO 8601 duration to readable string */
export function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return iso
  const h = match[1] ? `${match[1]}h` : ''
  const m = match[2] ? `${match[2]}m` : ''
  return [h, m].filter(Boolean).join(' ') || iso
}

/** 格式化时间 / Format time from ISO datetime */
export function formatTime(iso: string): string {
  return iso.slice(11, 16)   // "HH:MM"
}

/** 格式化日期 / Format date from ISO datetime */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
