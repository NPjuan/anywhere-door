/* ============================================================
   API 配额监控 / API Quota Monitor
   追踪各 API 本月使用量，达到 80% 时触发警告
   Tracks monthly API usage, warns at 80% threshold
   ============================================================ */

interface QuotaConfig {
  limit:  number
  label:  string
  color:  'blue' | 'orange' | 'gray'
}

const QUOTA_LIMITS: Record<string, QuotaConfig> = {
  amadeus:       { limit: 500,   label: 'Amadeus',       color: 'blue'   },
  aviationstack: { limit: 500,   label: 'Aviationstack', color: 'orange' },
  amap:          { limit: 10000, label: '高德地图',       color: 'blue'   },
}

const STORAGE_KEY = 'anywhere-door-api-quota'
const WARN_THRESHOLD = 0.8   // 80% 时警告 / Warn at 80%

interface QuotaData {
  counts:    Record<string, number>
  resetDate: string   // YYYY-MM
}

function getMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function loadQuota(): QuotaData {
  if (typeof window === 'undefined') return { counts: {}, resetDate: getMonthKey() }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { counts: {}, resetDate: getMonthKey() }
    const data: QuotaData = JSON.parse(raw)
    // 新月份自动重置 / Auto-reset for new month
    if (data.resetDate !== getMonthKey()) {
      return { counts: {}, resetDate: getMonthKey() }
    }
    return data
  } catch {
    return { counts: {}, resetDate: getMonthKey() }
  }
}

function saveQuota(data: QuotaData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/** 记录 API 调用 / Record an API call */
export function recordAPICall(api: keyof typeof QUOTA_LIMITS, count = 1) {
  const data = loadQuota()
  data.counts[api] = (data.counts[api] ?? 0) + count
  saveQuota(data)
}

/** 获取使用统计 / Get usage stats */
export function getQuotaStats() {
  const data = loadQuota()
  return Object.entries(QUOTA_LIMITS).map(([api, config]) => {
    const used    = data.counts[api] ?? 0
    const pct     = used / config.limit
    const warning = pct >= WARN_THRESHOLD
    return {
      api,
      label:   config.label,
      used,
      limit:   config.limit,
      pct:     Math.min(pct, 1),
      warning,
      color:   config.color,
    }
  })
}

/** 检查是否有任何 API 超过警告阈值 / Check if any API exceeded warning threshold */
export function hasQuotaWarning(): boolean {
  return getQuotaStats().some((s) => s.warning)
}
