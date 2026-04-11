'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, CheckCircle, Share2, Calendar, Loader2 } from 'lucide-react'
import type { PlanShareSettings } from '@/lib/db/types'

interface ShareSettingsModalProps {
  open: boolean
  onClose: () => void
  planId: string
  deviceId: string
  onSave?: () => void
}

export function ShareSettingsModal({
  open,
  onClose,
  planId,
  deviceId,
  onSave,
}: ShareSettingsModalProps) {
  const [shareEnabled, setShareEnabled] = useState(false)
  const [shareExpiresAt, setShareExpiresAt] = useState<string | null>(null)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load current share settings
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)

    // Fetch the current plan share settings
    fetch(`/api/plans/${planId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.plan) {
          setShareEnabled(data.plan.share_enabled ?? false)
          setShareExpiresAt(data.plan.share_expires_at ?? null)
          setShareToken(data.plan.share_token)
        }
      })
      .catch((err) => {
        console.error('Failed to load share settings:', err)
        setError('加载分享设置失败')
      })
      .finally(() => setLoading(false))
  }, [open, planId])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareEnabled,
          shareExpiresAt,
          deviceId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '保存失败')
      }

      onSave?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/plans/${planId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('复制失败')
    }
  }

  const shareUrl = `${window.location.origin}/plans/${planId}`
  const isExpired = shareExpiresAt && new Date(shareExpiresAt) < new Date()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-md rounded-lg shadow-xl"
              style={{ background: '#FFFFFF' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-5 border-b"
                style={{ borderColor: '#E2E8F0' }}
              >
                <div className="flex items-center gap-2">
                  <Share2 size={18} style={{ color: '#2563EB' }} />
                  <h2 className="font-semibold" style={{ color: '#0F172A' }}>
                    分享设置
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 transition-colors"
                  style={{ color: '#94A3B8' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {error && (
                  <div
                    className="p-3 rounded-lg text-sm"
                    style={{
                      background: '#FEE2E2',
                      color: '#991B1B',
                      border: '1px solid #FECACA',
                    }}
                  >
                    {error}
                  </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin" style={{ color: '#2563EB' }} />
                  </div>
                ) : (
                  <>
                    {/* Enable Sharing Toggle */}
                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={shareEnabled}
                            onChange={(e) => {
                              setShareEnabled(e.target.checked)
                              // Auto-generate token if enabling
                              if (e.target.checked && !shareToken) {
                                setShareToken(`share_${Date.now()}`)
                              }
                            }}
                            className="sr-only"
                          />
                          <div
                            className="w-10 h-6 rounded-full transition-colors"
                            style={{
                              background: shareEnabled ? '#2563EB' : '#D1D5DB',
                            }}
                          />
                          <div
                            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
                            style={{
                              background: '#FFFFFF',
                              transform: shareEnabled ? 'translateX(20px)' : 'translateX(0)',
                            }}
                          />
                        </div>
                        <span
                          className="font-medium text-sm"
                          style={{ color: shareEnabled ? '#0F172A' : '#6B7280' }}
                        >
                          启用分享
                        </span>
                      </label>
                      <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                        启用后，其他人可以通过分享链接查看您的行程
                      </p>
                    </div>

                    {/* Share URL */}
                    {shareEnabled && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium" style={{ color: '#374151' }}>
                          分享链接
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-mono"
                            style={{
                              background: '#F9FAFB',
                              border: '1px solid #E5E7EB',
                              color: '#6B7280',
                            }}
                          />
                          <button
                            onClick={handleCopyLink}
                            className="px-3 py-2 rounded-lg transition-all flex items-center gap-2"
                            style={{
                              background: copied ? '#F0FDF4' : '#EFF6FF',
                              border: `1px solid ${copied ? '#BBF7D0' : '#BFDBFE'}`,
                              color: copied ? '#16A34A' : '#2563EB',
                              cursor: 'pointer',
                            }}
                          >
                            {copied ? (
                              <>
                                <CheckCircle size={14} />
                                <span className="text-xs font-medium">已复制</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                <span className="text-xs font-medium">复制</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expiration Date */}
                    {shareEnabled && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium" style={{ color: '#374151' }}>
                          过期时间（可选）
                        </label>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} style={{ color: '#6B7280' }} />
                          <input
                            type="datetime-local"
                            value={shareExpiresAt ? shareExpiresAt.slice(0, 16) : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setShareExpiresAt(new Date(e.target.value).toISOString())
                              } else {
                                setShareExpiresAt(null)
                              }
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-sm"
                            style={{
                              background: '#F9FAFB',
                              border: '1px solid #E5E7EB',
                              color: '#374151',
                            }}
                          />
                        </div>
                        {isExpired && (
                          <p className="text-xs" style={{ color: '#DC2626' }}>
                            ⚠️ 分享链接已过期，不允许访问
                          </p>
                        )}
                        {shareExpiresAt && !isExpired && (
                          <p className="text-xs" style={{ color: '#059669' }}>
                            ✓ 将在 {new Date(shareExpiresAt).toLocaleString('zh-CN')} 过期
                          </p>
                        )}
                      </div>
                    )}

                    {/* Share Status Info */}
                    {!shareEnabled && (
                      <div
                        className="p-3 rounded-lg text-sm"
                        style={{
                          background: '#F3F4F6',
                          color: '#6B7280',
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        <p>分享已关闭。其他人无法通过分享链接访问您的行程。</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div
                className="flex justify-end gap-2 p-5 border-t"
                style={{ borderColor: '#E2E8F0' }}
              >
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
                  style={{
                    background: '#F3F4F6',
                    color: '#374151',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2"
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
