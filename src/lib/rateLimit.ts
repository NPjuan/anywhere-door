/**
 * 限流模块
 *
 * - 生产环境（Vercel 多实例）：使用 Upstash Redis，跨实例共享计数
 *   需要配置环境变量：UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *
 * - 本地开发 / 未配置 Redis：降级为内存限流（单进程有效）
 */

interface RateLimitResult {
  ok: boolean
  used: number
  remaining: number
  resetAt: number
}

/* ─── Upstash Redis 实现 ─── */

let _upstashLimiter: import('@upstash/ratelimit').Ratelimit | null = null

function getUpstashLimiter() {
  if (_upstashLimiter) return _upstashLimiter

  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    const { Redis }     = require('@upstash/redis')
    const { Ratelimit } = require('@upstash/ratelimit')
    const redis = new Redis({ url, token })
    _upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(5, '60 s'),
      analytics: false,
      prefix: 'anywhere-door:rl',
    })
    return _upstashLimiter
  } catch {
    return null
  }
}

/* ─── 内存降级实现 ─── */

interface BucketEntry { count: number; resetAt: number }
const buckets = new Map<string, BucketEntry>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key)
    }
  }, 5 * 60 * 1000)
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
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

/* ─── 统一入口 ─── */

export async function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter()

  if (limiter) {
    try {
      const result = await limiter.limit(key)
      return {
        ok:        result.success,
        used:      result.limit - result.remaining,
        remaining: result.remaining,
        resetAt:   result.reset,
      }
    } catch (err) {
      // Redis 不可用时降级内存
      console.warn('[rateLimit] Upstash unavailable, falling back to memory:', err)
    }
  }

  return memoryRateLimit(key, limit, windowMs)
}
