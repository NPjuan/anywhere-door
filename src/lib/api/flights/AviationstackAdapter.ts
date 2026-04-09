import type { FlightAdapter, FlightSearchParams, FlightOffer, FlightSegment } from './types'

/* ============================================================
   AviationstackAdapter — Aviationstack 机票搜索适配器
   Aviationstack Flight Search adapter

   API: GET http://api.aviationstack.com/v1/flights
   免费: 500 calls/month, API Key 认证
   注意: 免费版仅 HTTP（通过 Next.js API Route 代理规避）
   Note: Free tier HTTP only — proxied via Next.js API Route
   ============================================================ */

export class AviationstackAdapter implements FlightAdapter {
  name = 'aviationstack' as const
  priority = 2

  private apiKey = process.env.AVIATIONSTACK_API_KEY ?? ''

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    // Aviationstack 主要是实时航班追踪，不是预售搜索
    // 用它来补充当天/次日航班数据
    const query = new URLSearchParams({
      access_key: this.apiKey,
      dep_iata:   params.originCode,
      arr_iata:   params.destinationCode,
      flight_date: params.departureDate,
      limit:      String(params.maxResults ?? 10),
    })

    // 服务端调用，HTTP 可用 / Server-side call, HTTP allowed
    const res = await fetch(
      `http://api.aviationstack.com/v1/flights?${query}`,
      { next: { revalidate: 300 } },
    )

    if (!res.ok) throw new Error(`Aviationstack error ${res.status}`)

    const data = await res.json()
    if (data.error) throw new Error(`Aviationstack API: ${data.error.message}`)

    return (data.data ?? []).map((raw: AviationstackFlight, i: number) =>
      this.normalize(raw, i),
    )
  }

  private normalize(raw: AviationstackFlight, index: number): FlightOffer {
    const dep = raw.departure
    const arr = raw.arrival

    const segment: FlightSegment = {
      origin: {
        code:    dep.iata,
        name:    dep.airport ?? dep.iata,
        airport: dep.airport ?? dep.iata,
        time:    dep.scheduled,
        terminal: dep.terminal,
      },
      destination: {
        code:    arr.iata,
        name:    arr.airport ?? arr.iata,
        airport: arr.airport ?? arr.iata,
        time:    arr.scheduled,
        terminal: arr.terminal,
      },
      carrier:      raw.airline.iata ?? raw.airline.icao ?? '??',
      carrierName:  raw.airline.name ?? raw.airline.iata ?? '',
      flightNumber: raw.flight.iata ?? raw.flight.icao ?? `FL${index}`,
      duration:     'PT2H',   // Aviationstack 免费版无时长，占位
      stops:        0,
    }

    return {
      id:   `aviationstack-${raw.flight.iata ?? index}-${dep.scheduled}`,
      itineraries: [{ segments: [segment], totalDuration: 'PT2H' }],
      price: {
        total:     0,       // Aviationstack 不含价格
        base:      0,
        currency:  'CNY',
        per_adult: 0,
      },
      cabinClass:        'ECONOMY',
      validatingCarrier: segment.carrier,
      source:            'aviationstack',
      raw,
    }
  }
}

/* ---- Aviationstack 原始类型（部分）/ Raw types (partial) ---- */
interface AviationstackFlight {
  departure: { iata: string; airport?: string; scheduled: string; terminal?: string }
  arrival:   { iata: string; airport?: string; scheduled: string; terminal?: string }
  airline:   { name?: string; iata?: string; icao?: string }
  flight:    { iata?: string; icao?: string }
}
