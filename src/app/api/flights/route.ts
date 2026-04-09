import { NextRequest, NextResponse } from 'next/server'
import { getFlightService } from '@/lib/api/flights/FlightService'
import { z } from 'zod'

/* ============================================================
   GET /api/flights — 机票搜索代理路由
   Flight search proxy route

   作用: 隐藏 API 密钥，统一错误处理，添加响应缓存
   Purpose: Hide API keys, unified error handling, response cache
   ============================================================ */

const SearchSchema = z.object({
  from:    z.string().length(3),
  to:      z.string().length(3),
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  return:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults:  z.coerce.number().int().min(1).max(9).default(1),
  max:     z.coerce.number().int().min(1).max(20).default(10),
  currency: z.string().length(3).default('CNY'),
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const parsed = SearchSchema.safeParse({
    from:     searchParams.get('from'),
    to:       searchParams.get('to'),
    date:     searchParams.get('date'),
    return:   searchParams.get('return') ?? undefined,
    adults:   searchParams.get('adults'),
    max:      searchParams.get('max'),
    currency: searchParams.get('currency'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid params', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const p = parsed.data

  try {
    const service = getFlightService()
    const result  = await service.search({
      originCode:      p.from,
      destinationCode: p.to,
      departureDate:   p.date,
      returnDate:      p.return,
      adults:          p.adults,
      maxResults:      p.max,
      currencyCode:    p.currency,
    })

    return NextResponse.json(result, {
      headers: {
        // 5分钟缓存 / 5-minute cache
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        'X-Flight-Source': result.adapter,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/flights] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
