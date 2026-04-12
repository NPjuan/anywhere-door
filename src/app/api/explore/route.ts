import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/* ============================================================
   GET /api/explore
   每条行程返回：
   - highlights:    景点/餐厅名（过滤机场/酒店），最多6个
   - days_preview:  每天有坐标的 POI（过滤机场/酒店），供静态地图用
   ============================================================ */

// 需要过滤掉的 category 关键词（机场、住宿类）
const SKIP_CATEGORY = ['机场', '住宿', '宾馆', '酒店']
// 需要过滤掉的活动名称关键词
const SKIP_NAME     = ['机场', '酒店', '宾馆', '大厦', '入住', '退房', '办理入住', '前往机场', '返回酒店']

function isHighlightWorthy(actName: string, poiCategory: string): boolean {
  if (SKIP_CATEGORY.some(k => poiCategory.includes(k))) return false
  if (SKIP_NAME.some(k => actName.includes(k)))          return false
  return true
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('deviceId') ?? ''
  const search   = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const sort     = req.nextUrl.searchParams.get('sort') === 'popular' ? 'popular' : 'latest'
  const page     = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1', 10))
  const limit    = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '12', 10)))

  let query = supabase
    .from('plans')
    .select('id, title, summary, destination, start_date, end_date, days_count, budget_low, budget_high, saved_at, device_id, itinerary')
    .eq('is_public', true)
    .eq('status', 'done')

  if (search) {
    query = query.or(`destination.ilike.%${search}%,title.ilike.%${search}%`)
  }
  if (sort === 'latest') {
    query = query.order('saved_at', { ascending: false })
  }

  const { data: allPlans, error } = await query
  if (error) {
    console.error('[GET /api/explore]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!allPlans?.length) {
    return NextResponse.json({ plans: [], total: 0, page, limit, totalPages: 0 })
  }

  const allIds = allPlans.map(p => p.id)
  const [favCountRes, myFavRes] = await Promise.all([
    supabase.from('favorites').select('plan_id').in('plan_id', allIds),
    deviceId
      ? supabase.from('favorites').select('plan_id').eq('device_id', deviceId).in('plan_id', allIds)
      : Promise.resolve({ data: [] as { plan_id: string }[] }),
  ])

  const countMap: Record<string, number> = {}
  for (const row of favCountRes.data ?? []) {
    countMap[row.plan_id] = (countMap[row.plan_id] ?? 0) + 1
  }
  const myFavSet = new Set((myFavRes.data ?? []).map(r => r.plan_id))

  type PoiPoint = { name: string; lat: number; lng: number }
  type DayPreview = { day: number; date: string; title: string; pois: PoiPoint[] }

  let sorted = allPlans.map(p => {
    const it  = p.itinerary as Record<string, unknown> | null
    const days = (it?.days as Array<Record<string, unknown>> | null) ?? []

    const highlights: string[] = []
    const days_preview: DayPreview[] = []

    for (const day of days) {
      const acts = [
        ...((day.morning   as Array<Record<string, unknown>>) ?? []),
        ...((day.afternoon as Array<Record<string, unknown>>) ?? []),
        ...((day.evening   as Array<Record<string, unknown>>) ?? []),
      ]
      const dayPois: PoiPoint[] = []
      for (const act of acts) {
        const name     = (act.name as string) ?? ''
        const poi      = act.poi as Record<string, unknown> | null
        const category = (poi?.category as string) ?? ''
        const latLng   = poi?.latLng as { lat: number; lng: number } | null

        if (!isHighlightWorthy(name, category)) continue
        if (highlights.length < 6) highlights.push(name)
        if (latLng?.lat && latLng?.lng) {
          dayPois.push({ name, lat: latLng.lat, lng: latLng.lng })
        }
      }
      if (dayPois.length > 0) {
        days_preview.push({
          day:   (day.day   as number) ?? 0,
          date:  (day.date  as string) ?? '',
          title: (day.title as string) ?? '',
          pois:  dayPois,
        })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { itinerary: _it, ...rest } = p
    return {
      ...rest,
      highlights,
      days_preview,
      favorite_count: countMap[p.id] ?? 0,
      is_favorited:   myFavSet.has(p.id),
    }
  })

  if (sort === 'popular') {
    sorted.sort((a, b) =>
      b.favorite_count - a.favorite_count ||
      new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
    )
  }

  const total      = sorted.length
  const totalPages = Math.ceil(total / limit)
  const result     = sorted.slice((page - 1) * limit, page * limit)

  return NextResponse.json({ plans: result, total, page, limit, totalPages })
}

