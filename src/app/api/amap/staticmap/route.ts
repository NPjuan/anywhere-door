import { NextRequest, NextResponse } from 'next/server'

/* ============================================================
   GET /api/amap/staticmap?markers=...&center=...&size=...
   代理高德静态地图 API，服务端持有 key，返回图片 Buffer
   ============================================================ */

export async function GET(req: NextRequest) {
  const key     = process.env.AMAP_SERVER_KEY
  if (!key) return new NextResponse('AMAP_SERVER_KEY not configured', { status: 500 })

  const markers = req.nextUrl.searchParams.get('markers') ?? ''
  const center  = req.nextUrl.searchParams.get('center')  ?? ''
  const size    = req.nextUrl.searchParams.get('size')    ?? '600,400'
  const zoom    = req.nextUrl.searchParams.get('zoom')    ?? '13'

  const url = new URL('https://restapi.amap.com/v3/staticmap')
  url.searchParams.set('key',     key)
  url.searchParams.set('size',    size)
  url.searchParams.set('zoom',    zoom)
  url.searchParams.set('scale',   '2')    // retina
  url.searchParams.set('markers', markers)
  if (center) url.searchParams.set('location', center)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) return new NextResponse('Map fetch failed', { status: 502 })

    const buf = await res.arrayBuffer()
    return new NextResponse(buf, {
      headers: {
        'Content-Type':  'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    console.error('[/api/amap/staticmap]', e)
    return new NextResponse('Internal error', { status: 500 })
  }
}
