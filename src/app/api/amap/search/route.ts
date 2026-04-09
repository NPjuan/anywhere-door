import { NextRequest, NextResponse } from 'next/server'

/* ============================================================
   GET /api/amap/search?q=xxx&city=xxx
   代理高德地图地点搜索（Text Search），服务端持有 key，不暴露前端
   ============================================================ */

export async function GET(req: NextRequest) {
  const q    = req.nextUrl.searchParams.get('q')?.trim()
  const city = req.nextUrl.searchParams.get('city')?.trim() ?? ''

  if (!q) return NextResponse.json({ pois: [] })

  const key = process.env.AMAP_SERVER_KEY
  if (!key) return NextResponse.json({ error: 'AMAP_SERVER_KEY not configured' }, { status: 500 })

  const url = new URL('https://restapi.amap.com/v3/place/text')
  url.searchParams.set('key',      key)
  url.searchParams.set('keywords', q)
  url.searchParams.set('city',     city)
  url.searchParams.set('citylimit', city ? 'true' : 'false')
  url.searchParams.set('output',   'JSON')
  url.searchParams.set('offset',   '10')
  url.searchParams.set('page',     '1')
  url.searchParams.set('extensions', 'base')

  try {
    const res  = await fetch(url.toString(), { next: { revalidate: 60 } })
    const data = await res.json() as {
      status: string
      pois?: Array<{
        id:       string
        name:     string
        address:  string | string[]
        location: string   // "lng,lat"
        typecode: string
        cityname: string
      }>
    }

    if (data.status !== '1' || !data.pois) {
      return NextResponse.json({ pois: [] })
    }

    const pois = data.pois.map((p) => {
      const [lng, lat] = (p.location ?? '').split(',').map(Number)
      const address = Array.isArray(p.address) ? p.address.join('') : (p.address ?? '')
      return {
        id:       p.id,
        name:     p.name,
        address,
        cityname: p.cityname,
        lat,
        lng,
      }
    })

    return NextResponse.json({ pois })
  } catch (e) {
    console.error('[/api/amap/search]', e)
    return NextResponse.json({ pois: [] })
  }
}
