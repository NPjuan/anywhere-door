import type { DayPlan, FullItinerary } from '@/lib/agents/types'

/* ============================================================
   itineraryCanvas — 基于 snapdom 截取页面现有 DOM
   完整保留页面样式，支持地图，每天一张高清 PNG
   ============================================================ */

async function getSnapdom() {
  const mod = await import('@zumer/snapdom')
  return mod.snapdom
}

/**
 * 截取单天行程并下载为 PNG
 * 流程：切换到目标 day → 等待渲染 → snapdom 截图 → 下载
 */
export async function downloadDayAsImage(
  itinerary:    FullItinerary,
  day:          DayPlan,
  dayIndex:     number,
  setActiveDay: (i: number) => void,
  currentDay:   number,
) {
  const snapdom = await getSnapdom()

  // 切换到目标天（如果不是当前显示的）
  if (dayIndex !== currentDay) {
    setActiveDay(dayIndex)
    // 等待 React 渲染 + 地图瓦片加载
    await new Promise((r) => setTimeout(r, 900))
  }

  const row = document.getElementById('itinerary-day-row')
  if (!row) {
    console.warn('[downloadDayAsImage] #itinerary-day-row not found')
    return
  }

  const result = await snapdom(row, {
    scale:       3,           // 3x 超清
    dpr:         window.devicePixelRatio || 2,
    embedFonts:  true,
    backgroundColor: '#F8FAFF',
    // 排除地图控件按钮（截图里不需要）
    exclude:     ['.amap-ctrl-list', '.amap-logo', '.amap-copyright'],
  })

  await result.download({
    format:   'png',
    filename: `${itinerary.title}-Day${day.day}`,
  })
}

/**
 * 逐天下载所有天
 */
export async function downloadAllDays(
  itinerary:    FullItinerary,
  setActiveDay: (i: number) => void,
  currentDay:   number,
) {
  const original = currentDay
  for (let i = 0; i < itinerary.days.length; i++) {
    await downloadDayAsImage(
      itinerary,
      itinerary.days[i],
      i,
      setActiveDay,
      i === 0 ? currentDay : i - 1,
    )
    if (i < itinerary.days.length - 1) {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  // 恢复原 day
  setActiveDay(original)
}
