'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bug, X, RotateCcw } from 'lucide-react'
import { getDeviceId, getSelfDeviceId, devOverrideDeviceId } from '@/lib/deviceId'
import { supabase } from '@/lib/supabase'

/* ============================================================
   DevPanel — 开发模式调试面板（仅 NODE_ENV=development 渲染）
   功能：
   - 查看当前生效的 deviceId
   - 快速切换到其他用户（从 DB 拉取最近有行程的设备列表）
   - 一键恢复自己
   ============================================================ */

interface DevUser {
  device_id: string
  plan_count: number
  last_plan:  string
  destination: string
}

export function DevPanel() {
  const [open,       setOpen]       = useState(false)
  const [currentId,  setCurrentId]  = useState('')
  const [selfId,     setSelfId]     = useState('')
  const [inputId,    setInputId]    = useState('')
  const [users,      setUsers]      = useState<DevUser[]>([])
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    setCurrentId(getDeviceId())
    setSelfId(getSelfDeviceId())
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('plans')
        .select('device_id, title, destination, saved_at')
        .eq('status', 'done')
        .order('saved_at', { ascending: false })
        .limit(50)

      if (!data) return

      // 按 device_id 聚合，取最近一条行程
      const map = new Map<string, DevUser>()
      for (const row of data) {
        if (!map.has(row.device_id)) {
          map.set(row.device_id, {
            device_id:   row.device_id,
            plan_count:  0,
            last_plan:   row.title ?? '',
            destination: row.destination ?? '',
          })
        }
        map.get(row.device_id)!.plan_count++
      }
      setUsers(Array.from(map.values()).slice(0, 12))
    } finally {
      setLoading(false)
    }
  }

  const switchTo = (id: string) => {
    devOverrideDeviceId(id)
    window.location.reload()
  }

  const restoreSelf = () => {
    devOverrideDeviceId('')
    window.location.reload()
  }

  const isOverriding = currentId !== selfId

  return (
    <>
      {/* 常驻触发按钮 — 左下角 fixed */}
      <motion.button
        onClick={() => { setOpen(v => !v); if (!open) loadUsers() }}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-1.5 cursor-pointer"
        style={{
          background:   isOverriding ? '#FEF3C7' : '#1E293B',
          border:       `1px solid ${isOverriding ? '#FCD34D' : '#334155'}`,
          borderRadius: 8,
          padding:      '7px 12px',
          color:        isOverriding ? '#92400E' : '#94A3B8',
          fontSize:     12,
          boxShadow:    '0 2px 8px rgba(0,0,0,0.2)',
        }}
        whileHover={{ color: isOverriding ? '#78350F' : '#F1F5F9' }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Bug size={12} />
        <span>{isOverriding ? '调试中' : 'Dev'}</span>
        {isOverriding && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 ml-0.5" />}
      </motion.button>

      {/* 面板 */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[60]"
              style={{ background: 'rgba(0,0,0,0.15)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed bottom-16 left-6 z-[61] w-80"
              style={{
                background: '#1E293B', borderRadius: 12,
                boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #334155' }}>
                <div className="flex items-center gap-2">
                  <Bug size={13} style={{ color: '#F59E0B' }} />
                  <span className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>Dev Tools</span>
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#F59E0B22', color: '#F59E0B', fontSize: 10 }}>
                    dev only
                  </span>
                </div>
                <button onClick={() => setOpen(false)}
                  className="flex items-center justify-center w-6 h-6 rounded cursor-pointer hover:bg-slate-700 transition-colors"
                  style={{ border: 'none', background: 'none', color: '#64748B' }}>
                  <X size={14} />
                </button>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* 当前 ID */}
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748B' }}>当前 deviceId</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs px-2 py-1 rounded truncate"
                      style={{ background: '#0F172A', color: isOverriding ? '#FCD34D' : '#34D399', fontFamily: 'monospace' }}>
                      {currentId || '—'}
                    </code>
                    {isOverriding && (
                      <button onClick={restoreSelf}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer transition-colors hover:bg-slate-600"
                        style={{ background: '#334155', color: '#94A3B8', border: 'none', borderRadius: 6, whiteSpace: 'nowrap' }}>
                        <RotateCcw size={10} />恢复
                      </button>
                    )}
                  </div>
                  {isOverriding && (
                    <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>
                      ⚠️ 正在模拟其他用户视角
                    </p>
                  )}
                </div>

                {/* 手动输入 */}
                <div>
                  <p className="text-xs mb-1" style={{ color: '#64748B' }}>手动输入 deviceId</p>
                  <div className="flex gap-2">
                    <input
                      value={inputId}
                      onChange={e => setInputId(e.target.value)}
                      placeholder="粘贴任意 deviceId..."
                      className="flex-1 text-xs px-2 py-1.5 outline-none"
                      style={{
                        background: '#0F172A', border: '1px solid #334155',
                        borderRadius: 6, color: '#F1F5F9', fontFamily: 'monospace',
                      }}
                      onKeyDown={e => e.key === 'Enter' && inputId.trim() && switchTo(inputId.trim())}
                    />
                    <button
                      onClick={() => inputId.trim() && switchTo(inputId.trim())}
                      disabled={!inputId.trim()}
                      className="text-xs px-3 py-1.5 rounded cursor-pointer transition-colors"
                      style={{
                        background: inputId.trim() ? '#2563EB' : '#334155',
                        color: '#FFFFFF', border: 'none', borderRadius: 6,
                      }}>
                      切换
                    </button>
                  </div>
                </div>

                {/* 用户列表 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs" style={{ color: '#64748B' }}>近期用户</p>
                    {loading && <span className="text-xs" style={{ color: '#475569' }}>加载中...</span>}
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {users.map(u => (
                      <button
                        key={u.device_id}
                        onClick={() => switchTo(u.device_id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors text-left"
                        style={{
                          background: u.device_id === currentId ? '#1D4ED822' : 'transparent',
                          border: `1px solid ${u.device_id === currentId ? '#2563EB44' : 'transparent'}`,
                          borderRadius: 6,
                        }}
                        onMouseEnter={e => { if (u.device_id !== currentId) (e.currentTarget as HTMLButtonElement).style.background = '#1E3A5F' }}
                        onMouseLeave={e => { if (u.device_id !== currentId) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: u.device_id === selfId ? '#065F46' : '#1E3A5F', color: u.device_id === selfId ? '#34D399' : '#60A5FA' }}>
                          {u.device_id === selfId ? '我' : u.plan_count}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: '#E2E8F0' }}>
                            {u.destination || u.last_plan || '未知'}
                          </p>
                          <p className="text-xs truncate" style={{ color: '#475569', fontFamily: 'monospace' }}>
                            {u.device_id.slice(0, 20)}…
                          </p>
                        </div>
                        {u.device_id === currentId && (
                          <span className="text-xs shrink-0" style={{ color: '#60A5FA' }}>✓</span>
                        )}
                      </button>
                    ))}
                    {!loading && users.length === 0 && (
                      <p className="text-xs text-center py-3" style={{ color: '#475569' }}>暂无数据</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
