import { AmadeusAdapter }       from './AmadeusAdapter'
import { AviationstackAdapter } from './AviationstackAdapter'
import { MockAdapter }          from './MockAdapter'
import type { FlightAdapter, FlightSearchParams, FlightOffer } from './types'

/* ============================================================
   FlightService — 适配器编排，自动优先级降级
   Adapter orchestrator with automatic priority fallback

   来源 Source: 方案文档 §6.4
   新增 API 只需：/ To add a new API:
     1. 实现 FlightAdapter 接口
     2. 在 this.adapters 数组中注册
     3. .env.local 加对应密钥
   ============================================================ */

export class FlightService {
  private adapters: FlightAdapter[]

  constructor() {
    this.adapters = [
      new AmadeusAdapter(),
      new AviationstackAdapter(),
      new MockAdapter(),         // 始终保底 / Always available as fallback
    ].sort((a, b) => a.priority - b.priority)
  }

  async search(params: FlightSearchParams): Promise<{
    offers:  FlightOffer[]
    source:  string
    adapter: string
  }> {
    const errors: Array<{ adapter: string; error: string }> = []

    for (const adapter of this.adapters) {
      // 先检查适配器是否可用 / Check availability first
      const available = await adapter.isAvailable().catch(() => false)
      if (!available) {
        errors.push({ adapter: adapter.name, error: 'not configured' })
        continue
      }

      try {
        console.log(`[FlightService] Trying ${adapter.name}...`)
        const offers = await adapter.searchFlights(params)

        if (offers.length > 0 || adapter.name === 'mock') {
          console.log(`[FlightService] ✓ ${adapter.name} returned ${offers.length} offers`)
          return { offers, source: adapter.name, adapter: adapter.name }
        }

        // 结果为空则继续尝试下一个 / Empty results → try next
        errors.push({ adapter: adapter.name, error: 'empty results' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[FlightService] ✗ ${adapter.name} failed: ${msg}`)
        errors.push({ adapter: adapter.name, error: msg })
      }
    }

    // 理论上不会走到这里（MockAdapter 始终可用）
    throw new Error(`All flight adapters failed: ${JSON.stringify(errors)}`)
  }
}

// 单例（在 API Route 中复用）/ Singleton for API Route reuse
let _service: FlightService | null = null
export function getFlightService(): FlightService {
  if (!_service) _service = new FlightService()
  return _service
}

export * from './types'
