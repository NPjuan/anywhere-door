/* ============================================================
   deviceId — 浏览器设备标识
   用 localStorage 持久化 UUID，跨页面一致
   Device identifier stored in localStorage
   ============================================================ */

const KEY = 'anywhere-door-device-id'

export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(KEY, id)
  }
  return id
}
