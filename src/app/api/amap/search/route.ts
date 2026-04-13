import { NextRequest, NextResponse } from 'next/server'

/* ============================================================
   GET /api/amap/search?q=xxx&city=xxx&country=xxx
   代理地点搜索：
   · 中国城市 → 高德 Text Search（citylimit 限城市）
   · 海外城市 → 高德全球搜索（关键词带城市名），兜底 Nominatim
   ============================================================ */

async function searchAmap(q: string, city: string, isChina: boolean, key: string) {
  const url = new URL('https://restapi.amap.com/v3/place/text')
  url.searchParams.set('key',        key)
  url.searchParams.set('keywords',   isChina ? q : `${q} ${city}`.trim())
  url.searchParams.set('output',     'JSON')
  url.searchParams.set('offset',     '10')
  url.searchParams.set('page',       '1')
  url.searchParams.set('extensions', 'base')

  if (isChina && city) {
    url.searchParams.set('city',      city)
    url.searchParams.set('citylimit', 'true')
  }

  const res  = await fetch(url.toString(), { next: { revalidate: 60 } })
  const data = await res.json() as {
    status: string
    pois?: Array<{
      id: string; name: string; address: string | string[]
      location: string; cityname: string
    }>
  }

  if (data.status !== '1' || !data.pois?.length) return []

  return data.pois.map(p => {
    const [lng, lat] = (p.location ?? '').split(',').map(Number)
    return {
      id:       p.id,
      name:     p.name,
      address:  Array.isArray(p.address) ? p.address.join('') : (p.address ?? ''),
      cityname: p.cityname || city,
      lat, lng,
    }
  })
}

async function searchNominatim(q: string, city: string) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q',              `${q}, ${city}`)
  url.searchParams.set('format',         'json')
  url.searchParams.set('limit',          '8')
  url.searchParams.set('addressdetails', '1')

  const res  = await fetch(url.toString(), {
    headers: { 'User-Agent': 'AnywheredoorApp/1.0' },
    next: { revalidate: 300 },
  })
  const data = await res.json() as Array<{
    place_id: string; display_name: string
    lat: string; lon: string
    name?: string; address?: { road?: string; suburb?: string; city?: string; country?: string }
  }>

  return data.map(p => ({
    id:       String(p.place_id),
    name:     p.name || p.display_name.split(',')[0].trim(),
    address:  p.display_name,
    cityname: p.address?.city || city,
    lat:      parseFloat(p.lat),
    lng:      parseFloat(p.lon),
  }))
}

export async function GET(req: NextRequest) {
  const q       = req.nextUrl.searchParams.get('q')?.trim()
  const city    = req.nextUrl.searchParams.get('city')?.trim()    ?? ''
  const country = req.nextUrl.searchParams.get('country')?.trim() ?? '中国'

  if (!q) return NextResponse.json({ pois: [] })

  const isChina = country === '中国' || country === 'China'
  const key     = process.env.AMAP_SERVER_KEY

  try {
    // 1. 先用高德搜（国内 citylimit，海外全局+城市名拼入关键词）
    if (key) {
      const pois = await searchAmap(q, city, isChina, key)
      if (pois.length > 0) return NextResponse.json({ pois })
    }

    // 2. 海外且高德无结果 → Nominatim 兜底
    if (!isChina) {
      const pois = await searchNominatim(q, city)
      return NextResponse.json({ pois })
    }

    return NextResponse.json({ pois: [] })
  } catch (e) {
    console.error('[/api/amap/search]', e)
    return NextResponse.json({ pois: [] })
  }
}
