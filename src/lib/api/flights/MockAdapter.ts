import type { FlightAdapter, FlightSearchParams, FlightOffer } from './types'

/* ============================================================
   MockAdapter — 开发/测试用 Mock 数据适配器
   Development/test mock data adapter

   当所有真实适配器不可用时自动降级到此
   Auto-fallback when all real adapters are unavailable
   ============================================================ */

const AIRLINE_NAMES: Record<string, string> = {
  CA: '中国国际航空', MU: '中国东方航空', CZ: '中国南方航空',
  HU: '海南航空',    '3U': '四川航空',   ZH: '深圳航空',
  FM: '上海航空',    '9C': '春秋航空',   GS: '天津航空',
}

export class MockAdapter implements FlightAdapter {
  name = 'mock' as const
  priority = 99

  async isAvailable(): Promise<boolean> { return true }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    // 模拟 300ms 延迟 / Simulate 300ms delay
    await new Promise((r) => setTimeout(r, 300))

    const carriers = ['CA', 'MU', 'CZ', 'HU', '3U']
    const prices   = [780, 920, 1150, 680, 1380, 850, 1050]
    const hours    = ['06:30', '08:45', '10:20', '13:05', '15:30', '18:00', '20:15']
    const durations= ['PT2H10M', 'PT2H30M', 'PT3H05M', 'PT1H55M', 'PT2H50M']

    return Array.from({ length: Math.min(params.maxResults ?? 6, 6) }, (_, i) => {
      const carrier  = carriers[i % carriers.length]
      const depTime  = `${params.departureDate}T${hours[i % hours.length]}:00`
      const duration = durations[i % durations.length]
      const price    = prices[i % prices.length] * params.adults

      // 计算到达时间 / Calculate arrival time
      const depMs    = new Date(depTime).getTime()
      const durMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
      const durMs    = ((+(durMatch?.[1] ?? 0)) * 60 + +(durMatch?.[2] ?? 0)) * 60_000
      const arrTime  = new Date(depMs + durMs).toISOString().slice(0, 19)

      const offer: FlightOffer = {
        id: `mock-${i}-${params.departureDate}`,
        itineraries: [{
          totalDuration: duration,
          segments: [{
            origin: {
              code:    params.originCode,
              name:    params.originCode,
              airport: params.originCode,
              time:    depTime,
            },
            destination: {
              code:    params.destinationCode,
              name:    params.destinationCode,
              airport: params.destinationCode,
              time:    arrTime,
            },
            carrier,
            carrierName:  AIRLINE_NAMES[carrier] ?? carrier,
            flightNumber: `${carrier}${1000 + i * 11}`,
            duration,
            stops: 0,
          }],
        }],
        price: {
          total:     price,
          base:      Math.round(price * 0.85),
          currency:  'CNY',
          per_adult: price / params.adults,
        },
        seats:             Math.floor(Math.random() * 8) + 1,
        cabinClass:        'ECONOMY',
        validatingCarrier: carrier,
        source:            'mock',
      }

      // 往返：增加回程 / Roundtrip: add return itinerary
      if (params.returnDate) {
        const retDepTime = `${params.returnDate}T${hours[(i + 2) % hours.length]}:00`
        const retDepMs   = new Date(retDepTime).getTime()
        const retArrTime = new Date(retDepMs + durMs).toISOString().slice(0, 19)

        offer.itineraries.push({
          totalDuration: duration,
          segments: [{
            origin: {
              code:    params.destinationCode,
              name:    params.destinationCode,
              airport: params.destinationCode,
              time:    retDepTime,
            },
            destination: {
              code:    params.originCode,
              name:    params.originCode,
              airport: params.originCode,
              time:    retArrTime,
            },
            carrier,
            carrierName:  AIRLINE_NAMES[carrier] ?? carrier,
            flightNumber: `${carrier}${1001 + i * 11}`,
            duration,
            stops: 0,
          }],
        })
      }

      return offer
    })
  }
}
