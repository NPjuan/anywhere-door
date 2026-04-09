import type { POI } from '@/lib/agents/types'

/* ============================================================
   AmapClient — 高德地图服务端 REST 客户端
   Amap server-side REST client

   文档 Docs: https://lbs.amap.com/api/webservice/guide/api/search
   ============================================================ */

const AMAP_BASE = 'https://restapi.amap.com'

/** 旅行风格 → 高德 POI 类型码映射
    Travel style → Amap POI type code mapping
    来源 Source: design-system/MASTER.md §9 */
const STYLE_POI_TYPES: Record<string, string> = {
  photography: '110000',   // 风景名胜
  foodie:      '050000',   // 餐饮服务
  adventure:   '090000',   // 体育休闲
  culture:     '080000',   // 文化场馆
  relaxation:  '070000',   // 住宿服务
  default:     '110000',
}

export interface AmapPOI {
  id:       string
  name:     string
  address:  string
  type:     string
  location: string   // "lng,lat"
  rating?:  string
  tel?:     string
}

export class AmapClient {
  private key: string

  constructor() {
    this.key = process.env.AMAP_SERVER_KEY ?? ''
  }

  get isAvailable() {
    return !!this.key
  }

  /** 按旅行风格搜索 POI / Search POI by travel style */
  async searchPOI(params: {
    city:        string
    travelStyle: string
    pageSize?:   number
  }): Promise<POI[]> {
    if (!this.isAvailable) return this.getMockPOIs(params.city, params.travelStyle)

    const typeCode = STYLE_POI_TYPES[params.travelStyle] ?? STYLE_POI_TYPES.default

    const query = new URLSearchParams({
      key:      this.key,
      city:     params.city,
      types:    typeCode,
      sortrule: 'rating',
      output:   'JSON',
      offset:   String(params.pageSize ?? 10),
    })

    const res = await fetch(`${AMAP_BASE}/v3/place/text?${query}`, {
      next: { revalidate: 3600 },   // 1h 缓存
    })

    if (!res.ok) throw new Error(`Amap POI error: ${res.status}`)

    const data = await res.json()
    if (data.status !== '1') throw new Error(`Amap error: ${data.info}`)

    return (data.pois ?? []).map((p: AmapPOI) => this.normalizePOI(p))
  }

  private normalizePOI(raw: AmapPOI): POI {
    const [lng, lat] = (raw.location ?? '104.0668,30.5728').split(',').map(Number)
    return {
      id:       raw.id,
      name:     raw.name,
      address:  raw.address,
      category: raw.type,
      latLng:   { lat, lng },
      rating:   raw.rating ? parseFloat(raw.rating) : undefined,
    }
  }

  /** 无密钥时的 Mock POI / Mock POI when no API key */
  private getMockPOIs(city: string, style: string): POI[] {
    const MOCK_DATA: Record<string, Record<string, POI[]>> = {
      '成都': {
        foodie: [
          { id: 'm1', name: '宽窄巷子',  address: '成都市青羊区',   category: '餐饮/景点', latLng: { lat: 30.6724, lng: 104.0601 } },
          { id: 'm2', name: '锦里古街',  address: '成都市武侯区',   category: '餐饮/景点', latLng: { lat: 30.6412, lng: 104.0461 } },
          { id: 'm3', name: '成都小吃街', address: '成都市青羊区',  category: '餐饮',      latLng: { lat: 30.6600, lng: 104.0657 } },
        ],
        photography: [
          { id: 'm4', name: '大熊猫繁育研究基地', address: '成都市成华区', category: '景点', latLng: { lat: 30.7362, lng: 104.1390 } },
          { id: 'm5', name: '青城山',             address: '成都市都江堰', category: '自然', latLng: { lat: 30.9007, lng: 103.5716 } },
          { id: 'm6', name: '都江堰',             address: '成都市都江堰', category: '景点', latLng: { lat: 30.9985, lng: 103.6171 } },
        ],
        culture: [
          { id: 'm7', name: '武侯祠',     address: '成都市武侯区',   category: '历史', latLng: { lat: 30.6412, lng: 104.0461 } },
          { id: 'm8', name: '杜甫草堂',   address: '成都市青羊区',   category: '历史', latLng: { lat: 30.6668, lng: 104.0426 } },
          { id: 'm9', name: '四川博物院', address: '成都市青羊区',   category: '博物馆', latLng: { lat: 30.6620, lng: 104.0420 } },
        ],
      },
    }

    const cityData = MOCK_DATA[city]
    if (cityData) {
      return cityData[style] ?? cityData['foodie'] ?? Object.values(cityData)[0] ?? []
    }

    // 通用 Mock / Generic mock
    return [
      { id: 'g1', name: `${city}市中心景区`, address: `${city}市中心`, category: '景点', latLng: { lat: 30.0, lng: 104.0 } },
      { id: 'g2', name: `${city}特色美食街`, address: `${city}老城区`, category: '餐饮', latLng: { lat: 30.01, lng: 104.01 } },
      { id: 'g3', name: `${city}博物馆`,      address: `${city}文化区`, category: '博物馆', latLng: { lat: 29.99, lng: 103.99 } },
    ]
  }
}

// 单例 / Singleton
let _client: AmapClient | null = null
export function getAmapClient() {
  if (!_client) _client = new AmapClient()
  return _client
}
