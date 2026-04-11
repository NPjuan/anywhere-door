/* ============================================================
   天气工具 — 基于 Open-Meteo（完全免费，无需 API Key）
   根据坐标 + 日期数组获取每天天气预报
   ============================================================ */

export interface DayWeather {
  date:       string   // YYYY-MM-DD
  tempMin:    number
  tempMax:    number
  icon:       string   // emoji
  label:      string   // 晴、多云、小雨…
  severe:     boolean  // 是否恶劣天气（暴雨/大雾/暴雪等）
  severeMsg?: string   // 恶劣天气提示文案
}

// WMO 天气代码映射
const WMO_MAP: Record<number, { icon: string; label: string; severe: boolean; msg?: string }> = {
  0:  { icon: '☀️',  label: '晴',       severe: false },
  1:  { icon: '🌤️', label: '晴间多云', severe: false },
  2:  { icon: '⛅',  label: '多云',     severe: false },
  3:  { icon: '☁️',  label: '阴',       severe: false },
  45: { icon: '🌫️', label: '大雾',     severe: true,  msg: '今日大雾，出行能见度低，请注意安全' },
  48: { icon: '🌫️', label: '冻雾',     severe: true,  msg: '今日冻雾，路面可能结冰，请注意安全' },
  51: { icon: '🌦️', label: '毛毛雨',   severe: false },
  53: { icon: '🌦️', label: '毛毛雨',   severe: false },
  55: { icon: '🌧️', label: '毛毛雨',   severe: false },
  61: { icon: '🌧️', label: '小雨',     severe: false },
  63: { icon: '🌧️', label: '中雨',     severe: false },
  65: { icon: '🌧️', label: '大雨',     severe: true,  msg: '今日大雨，建议携带雨具，室外活动酌情调整' },
  71: { icon: '🌨️', label: '小雪',     severe: false },
  73: { icon: '🌨️', label: '中雪',     severe: false },
  75: { icon: '❄️',  label: '大雪',     severe: true,  msg: '今日大雪，注意保暖，交通可能受阻' },
  77: { icon: '🌨️', label: '冰粒',     severe: true,  msg: '今日冰粒，地面湿滑，请小心出行' },
  80: { icon: '🌦️', label: '阵雨',     severe: false },
  81: { icon: '🌧️', label: '阵雨',     severe: false },
  82: { icon: '⛈️',  label: '强阵雨',   severe: true,  msg: '今日强阵雨，建议避开户外活动高峰时段' },
  85: { icon: '🌨️', label: '阵雪',     severe: false },
  86: { icon: '❄️',  label: '强阵雪',   severe: true,  msg: '今日强降雪，注意保暖及交通安全' },
  95: { icon: '⛈️',  label: '雷阵雨',   severe: true,  msg: '今日雷阵雨，请远离空旷地带和高处' },
  96: { icon: '⛈️',  label: '雷阵雨夹冰雹', severe: true, msg: '今日有冰雹，请注意人身及财产安全' },
  99: { icon: '⛈️',  label: '强雷阵雨夹冰雹', severe: true, msg: '今日强对流天气，尽量减少户外活动' },
}

function wmoInfo(code: number) {
  return WMO_MAP[code] ?? { icon: '🌈', label: '未知', severe: false }
}

/**
 * 获取指定坐标的多日天气预报
 * @param lat 纬度
 * @param lng 经度
 * @param dates YYYY-MM-DD 数组（需连续，Open-Meteo 按范围返回）
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  dates: string[],
): Promise<Map<string, DayWeather>> {
  if (!dates.length) return new Map()

  const sorted = [...dates].sort()
  const startDate = sorted[0]
  const endDate   = sorted[sorted.length - 1]

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate}&end_date=${endDate}`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)

  const data = await res.json() as {
    daily: {
      time:                string[]
      weathercode:         number[]
      temperature_2m_max:  number[]
      temperature_2m_min:  number[]
    }
  }

  const result = new Map<string, DayWeather>()
  const { time, weathercode, temperature_2m_max, temperature_2m_min } = data.daily

  for (let i = 0; i < time.length; i++) {
    const date = time[i]
    if (!dates.includes(date)) continue
    const info = wmoInfo(weathercode[i])
    result.set(date, {
      date,
      tempMin:    Math.round(temperature_2m_min[i]),
      tempMax:    Math.round(temperature_2m_max[i]),
      icon:       info.icon,
      label:      info.label,
      severe:     info.severe,
      severeMsg:  info.msg,
    })
  }

  return result
}
