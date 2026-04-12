/* ============================================================
   deviceId — 浏览器设备标识
   用 localStorage 持久化 UUID，跨页面一致

   开发模式（NODE_ENV=development）下支持 override：
   localStorage.setItem('dev_override_device_id', 'xxx') 后刷新即可切换用户
   ============================================================ */

const KEY          = 'anywhere-door-device-id'
const DEV_OVERRIDE = 'dev_override_device_id'

export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''

  // 开发模式：优先使用 override id
  if (process.env.NODE_ENV === 'development') {
    const override = localStorage.getItem(DEV_OVERRIDE)
    if (override?.trim()) return override.trim()
  }

  let id = localStorage.getItem(KEY)
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(KEY, id)
  }
  return id
}

/** 仅开发模式可用：切换到指定 deviceId，传空字符串恢复自己 */
export function devOverrideDeviceId(id: string) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'development') return
  if (id.trim()) {
    localStorage.setItem(DEV_OVERRIDE, id.trim())
  } else {
    localStorage.removeItem(DEV_OVERRIDE)
  }
}

/** 获取真实自身 deviceId（不受 override 影响）*/
export function getSelfDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(KEY, id)
  }
  return id
}
