import type {
  FlightAdapter, FlightSearchParams, FlightOffer,
  FlightItinerary, FlightSegment, FlightEndpoint,
} from './types'

/* ============================================================
   AmadeusTokenManager — OAuth2 token 内存缓存
   OAuth2 token in-memory cache

   Amadeus 使用 client_credentials 模式
   token 有效期约 1799s，提前 60s 刷新
   ============================================================ */

interface TokenCache {
  token:     string
  expiresAt: number   // Date.now() ms
}

const AMADEUS_BASE = {
  test:       'https://test.api.amadeus.com',
  production: 'https://api.amadeus.com',
}

class AmadeusTokenManager {
  private cache: TokenCache | null = null

  constructor(
    private clientId:     string,
    private clientSecret: string,
    private env:          'test' | 'production' = 'test',
  ) {}

  async getToken(): Promise<string> {
    // 缓存有效则直接返回 / Return cached token if still valid
    if (this.cache && Date.now() < this.cache.expiresAt - 60_000) {
      return this.cache.token
    }

    const base = AMADEUS_BASE[this.env]
    const res = await fetch(`${base}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     this.clientId,
        client_secret: this.clientSecret,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Amadeus token error ${res.status}: ${text}`)
    }

    const data = await res.json()
    this.cache = {
      token:     data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    }
    return this.cache.token
  }
}

/* ============================================================
   AmadeusAdapter — Amadeus 机票搜索适配器
   Amadeus Flight Offers Search adapter

   API: GET /v2/shopping/flight-offers
   免费沙盒: 500 calls/month, test.api.amadeus.com
   ============================================================ */

export class AmadeusAdapter implements FlightAdapter {
  name = 'amadeus' as const
  priority = 1

  private tokenManager: AmadeusTokenManager
  private base: string

  constructor() {
    const env = (process.env.AMADEUS_ENVIRONMENT ?? 'test') as 'test' | 'production'
    this.base = AMADEUS_BASE[env]
    this.tokenManager = new AmadeusTokenManager(
      process.env.AMADEUS_CLIENT_ID     ?? '',
      process.env.AMADEUS_CLIENT_SECRET ?? '',
      env,
    )
  }

  async isAvailable(): Promise<boolean> {
    return !!(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET)
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    const token = await this.tokenManager.getToken()

    const query = new URLSearchParams({
      originLocationCode:      params.originCode,
      destinationLocationCode: params.destinationCode,
      departureDate:           params.departureDate,
      adults:                  String(params.adults),
      currencyCode:            params.currencyCode ?? 'CNY',
      max:                     String(params.maxResults ?? 10),
    })
    if (params.returnDate) query.set('returnDate', params.returnDate)

    const res = await fetch(`${this.base}/v2/shopping/flight-offers?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      next:    { revalidate: 300 },   // 5min 缓存 / 5min cache
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Amadeus search error ${res.status}: ${text}`)
    }

    const data = await res.json()
    return (data.data ?? []).map((raw: AmadeusOffer) => this.normalize(raw))
  }

  private normalize(raw: AmadeusOffer): FlightOffer {
    const itineraries: FlightItinerary[] = raw.itineraries.map((itin) => ({
      totalDuration: itin.duration,
      segments: itin.segments.map((seg): FlightSegment => ({
        origin: {
          code:     seg.departure.iataCode,
          name:     seg.departure.iataCode,
          airport:  seg.departure.iataCode,
          time:     seg.departure.at,
          terminal: seg.departure.terminal,
        } as FlightEndpoint,
        destination: {
          code:     seg.arrival.iataCode,
          name:     seg.arrival.iataCode,
          airport:  seg.arrival.iataCode,
          time:     seg.arrival.at,
          terminal: seg.arrival.terminal,
        } as FlightEndpoint,
        carrier:      seg.carrierCode,
        carrierName:  seg.carrierCode,   // Phase 5+ 可扩展名称映射
        flightNumber: `${seg.carrierCode}${seg.number}`,
        duration:     seg.duration,
        stops:        seg.numberOfStops ?? 0,
      })),
    }))

    const price = raw.price
    return {
      id:                raw.id,
      itineraries,
      price: {
        total:     parseFloat(price.total),
        base:      parseFloat(price.base ?? price.total),
        currency:  price.currency,
        per_adult: parseFloat(price.total) / raw.travelerPricings.length,
      },
      seats:             raw.numberOfBookableSeats,
      cabinClass:        (raw.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin ?? 'ECONOMY') as FlightOffer['cabinClass'],
      validatingCarrier: raw.validatingAirlineCodes?.[0] ?? '',
      source:            'amadeus',
      raw,
    }
  }
}

/* ---- Amadeus 原始类型（部分）/ Amadeus raw types (partial) ---- */
interface AmadeusOffer {
  id: string
  itineraries: Array<{
    duration: string
    segments: Array<{
      departure: { iataCode: string; at: string; terminal?: string }
      arrival:   { iataCode: string; at: string; terminal?: string }
      carrierCode: string
      number: string
      duration: string
      numberOfStops?: number
    }>
  }>
  price: { total: string; base?: string; currency: string }
  numberOfBookableSeats?: number
  validatingAirlineCodes?: string[]
  travelerPricings: Array<{
    fareDetailsBySegment: Array<{ cabin?: string }>
  }>
}
