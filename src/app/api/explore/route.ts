import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/* ============================================================
   GET /api/explore
   每条行程返回：
   - highlights:    景点/餐厅名（过滤机场/酒店），最多6个
   - days_preview:  每天有坐标的 POI（过滤机场/酒店），供静态地图用
   - style_tags:    推断出的风格标签
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

// 风格推断规则
const STYLE_RULES: { tag: string; pattern: RegExp }[] = [
  { tag: '亲子',   pattern: /亲子|宝宝|儿童|小孩|家庭|孩子/ },
  { tag: '蜜月',   pattern: /蜜月|情侣|浪漫|爱情|求婚/ },
  { tag: '背包客', pattern: /穷游|背包|自由行|预算|省钱|经济/ },
  { tag: '文化探索', pattern: /文化|历史|古迹|博物馆|寺庙|古城/ },
  { tag: '美食之旅', pattern: /美食|吃货|小吃|餐厅|特色菜|必吃/ },
  { tag: '自然风光', pattern: /自然|风景|山|湖|海|森林|草原|国家公园/ },
  { tag: '都市潮流', pattern: /购物|潮流|时尚|网红|咖啡|打卡/ },
]

function inferStyleTags(text: string): string[] {
  const matched = STYLE_RULES.filter(r => r.pattern.test(text)).map(r => r.tag)
  return matched.length > 0 ? matched : ['休闲度假']
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get('deviceId') ?? ''
  const search   = req.nextUrl.searchParams.get('search')?.trim() ?? ''
  const sort     = req.nextUrl.searchParams.get('sort') === 'popular' ? 'popular' : 'latest'
  const style    = req.nextUrl.searchParams.get('style')?.trim() ?? ''
  const page     = Math.max(1, parseInt(req.nextUrl.searchParams.get('page')  ?? '1', 10))
  const limit    = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '12', 10)))

  let query = supabase
    .from('plans')
    .select('id, title, summary, destination, start_date, end_date, days_count, budget_low, budget_high, saved_at, device_id, itinerary, planning_params')
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

    // 风格推断：用 highlights + summary 合并文本
    const styleText = [
      p.title ?? '',
      p.summary ?? '',
      highlights.join(' '),
      ((p.planning_params as Record<string, unknown> | null)?.userPrompt as string) ?? '',
    ].join(' ')
    const style_tags = inferStyleTags(styleText)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { itinerary: _it, planning_params: _pp, ...rest } = p
    return {
      ...rest,
      highlights,
      days_preview,
      style_tags,
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

  // 按风格筛选（在 popular 排序之后）
  if (style) {
    sorted = sorted.filter(p => p.style_tags.includes(style))
  }

  const total      = sorted.length
  const totalPages = Math.ceil(total / limit)
  const result     = sorted.slice((page - 1) * limit, page * limit)

  return NextResponse.json({ plans: result, total, page, limit, totalPages })
}

