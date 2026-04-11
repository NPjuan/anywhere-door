/**
 * 简易内存限流（适用于单实例 / Edge Runtime 单进程环境）
 * 生产多实例场景可替换为 Upstash Redis 实现。
 *
 * 用法：
 *   const result = rateLimit(ip, { limit: 5, windowMs: 60_000 })
 *   if (!result.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 */

interface BucketEntry {
  count: number
  resetAt: number
}

const buckets = new Map<string, BucketEntry>()

// 定期清理过期桶，避免内存泄漏（每 5 分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key)
    }
  }, 5 * 60 * 1000)
}

interface RateLimitOptions {
  /** 窗口内最大请求数，默认 10 */
  limit?: number
  /** 窗口时长（毫秒），默认 60000（1 分钟）*/
  windowMs?: number
}

interface RateLimitResult {
  ok: boolean
  /** 当前窗口内已用次数 */
  used: number
  /** 剩余可用次数 */
  remaining: number
  /** 窗口重置时间戳（ms） */
  resetAt: number
}

export function rateLimit(
  key: string,
  { limit = 10, windowMs = 60_000 }: RateLimitOptions = {}
): RateLimitResult {
  const now = Date.now()
  let entry = buckets.get(key)

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs }
    buckets.set(key, entry)
  }

  entry.count += 1

  return {
    ok:        entry.count <= limit,
    used:      entry.count,
    remaining: Math.max(0, limit - entry.count),
    resetAt:   entry.resetAt,
  }
}
