import { flushSync } from 'react-dom'
import type { DayPlan, FullItinerary } from '@/lib/agents/types'

/* ============================================================
   itineraryCanvas — 基于 snapdom 截取页面现有 DOM
   完整保留页面样式，支持地图，每天一张高清 PNG
   ============================================================ */

async function getSnapdom() {
  const mod = await import('@zumer/snapdom')
  return mod.snapdom
}

// 截图前锁定容器为固定宽度，确保低分辨率屏幕输出一致
const CAPTURE_WIDTH = 1200

function lockWidth(el: HTMLElement) {
  const prev = {
    width:    el.style.width,
    minWidth: el.style.minWidth,
    maxWidth: el.style.maxWidth,
  }
  el.style.width    = `${CAPTURE_WIDTH}px`
  el.style.minWidth = `${CAPTURE_WIDTH}px`
  el.style.maxWidth = `${CAPTURE_WIDTH}px`
  return () => {
    el.style.width    = prev.width
    el.style.minWidth = prev.minWidth
    el.style.maxWidth = prev.maxWidth
  }
}

/**
 * 截取单天行程并下载为 PNG
 * 流程：切换到目标 day → 等待渲染 → 锁宽 → snapdom 截图 → 恢复宽度 → 下载
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
    // 使用 flushSync 强制 React 同步渲染，确保 DOM 在 await 之前已更新
    flushSync(() => setActiveDay(dayIndex))
    // 等待地图瓦片等异步资源加载
    await new Promise((r) => setTimeout(r, 900))
  }

  const row = document.getElementById('itinerary-day-row')
  if (!row) {
    console.warn('[downloadDayAsImage] #itinerary-day-row not found')
    return
  }

  // 锁定宽度，保证截图尺寸与分辨率无关
  const restoreWidth = lockWidth(row)
  // 等一帧让 grid/flex 重新布局
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

  try {
    const result = await snapdom(row, {
      scale:       2,
      dpr:         1,           // 固定 dpr=1，配合锁宽保证输出稳定
      embedFonts:  true,
      backgroundColor: '#F8FAFF',
      exclude:     ['.amap-ctrl-list', '.amap-logo', '.amap-copyright'],
    })
    await result.download({
      filename: `${itinerary.title}-Day${day.day}.png`,
    })
  } finally {
    restoreWidth()
  }
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
  let current = currentDay
  for (let i = 0; i < itinerary.days.length; i++) {
    await downloadDayAsImage(
      itinerary,
      itinerary.days[i],
      i,
      setActiveDay,
      current,
    )
    current = i   // 截图完成后，页面已切换到 day i
    if (i < itinerary.days.length - 1) {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  // 恢复原 day
  setActiveDay(original)
}
