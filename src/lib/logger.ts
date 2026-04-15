import fs from 'fs'
import path from 'path'

/* ============================================================
   File-based structured logger
   日志按 deviceId 分目录，按日期分文件
   路径: logs/{deviceId}/{YYYY-MM-DD}.jsonl
   每行一条 JSON，便于 grep / jq 查询
   ============================================================ */

const LOG_DIR = path.resolve(process.cwd(), 'logs')

/** 确保目录存在（同步，只在首次写入时触发） */
const ensuredDirs = new Set<string>()
function ensureDir(dir: string) {
  if (ensuredDirs.has(dir)) return
  fs.mkdirSync(dir, { recursive: true })
  ensuredDirs.add(dir)
}

export interface LogEntry {
  /** 日志级别 */
  level: 'info' | 'warn' | 'error'
  /** 事件名称，如 replan-day-start */
  event: string
  /** 设备 ID */
  deviceId?: string
  /** 计划 ID */
  planId?: string
  /** 自由附加数据 */
  [key: string]: unknown
}

/**
 * 写一条结构化日志到文件
 * - 自动添加 timestamp
 * - 按 deviceId 分目录（无 deviceId 归入 _unknown）
 * - 按日期分文件 YYYY-MM-DD.jsonl
 * - 同时 console.log / console.error
 */
export function log(entry: LogEntry) {
  const now = new Date()
  const ts = now.toISOString()
  const dateStr = ts.slice(0, 10) // YYYY-MM-DD

  const record = { ts, ...entry }

  // console 输出（保持原有可观察性）
  const line = JSON.stringify(record)
  if (entry.level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }

  // 写文件（异步，不阻塞请求）
  try {
    const dirName = entry.deviceId || '_unknown'
    const dir = path.join(LOG_DIR, dirName)
    ensureDir(dir)
    const filePath = path.join(dir, `${dateStr}.jsonl`)
    fs.appendFile(filePath, line + '\n', (err) => {
      if (err) console.error('[logger] write failed:', err.message)
    })
  } catch {
    // 文件写入失败不影响业务
  }
}

/**
 * 创建一个带上下文的 logger 实例
 * 预填 deviceId / planId 等字段，后续调用无需重复传
 */
export function createLogger(ctx: { deviceId?: string; planId?: string; flow: string }) {
  return {
    info(event: string, data?: Record<string, unknown>) {
      log({ level: 'info', event: `${ctx.flow}:${event}`, deviceId: ctx.deviceId, planId: ctx.planId, ...data })
    },
    warn(event: string, data?: Record<string, unknown>) {
      log({ level: 'warn', event: `${ctx.flow}:${event}`, deviceId: ctx.deviceId, planId: ctx.planId, ...data })
    },
    error(event: string, data?: Record<string, unknown>) {
      log({ level: 'error', event: `${ctx.flow}:${event}`, deviceId: ctx.deviceId, planId: ctx.planId, ...data })
    },
  }
}
