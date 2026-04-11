'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, CheckCircle } from 'lucide-react'
import { getDeviceId } from '@/lib/deviceId'

/* ============================================================
   FeedbackButton — 右下角悬浮反馈入口 + 弹出表单
   ============================================================ */

export function FeedbackButton() {
  const [open, setOpen]         = useState(false)
  const [contact, setContact]   = useState('')
  const [content, setContent]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 打开时聚焦输入框
  useEffect(() => {
    if (open && !done) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [open, done])

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('请填写反馈内容')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          contact:  contact.trim() || null,
          content:  content.trim(),
        }),
      })
      if (!res.ok) throw new Error('提交失败')
      setDone(true)
      // 2.5 秒后自动关闭
      setTimeout(() => {
        setOpen(false)
        setTimeout(() => {
          setDone(false)
          setContact('')
          setContent('')
        }, 300)
      }, 2500)
    } catch {
      setError('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setError('')
  }

  return (
    <>
      {/* 触发按钮 */}
      <motion.button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 cursor-pointer w-full"
        style={{
          background:   '#FFFFFF',
          border:       '1px solid #E5E7EB',
          borderRadius: 8,
          padding:      '7px 14px',
          color:        '#6B7280',
          fontSize:     13,
        }}
        whileHover={{ color: '#374151' }}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <MessageSquare size={13} />
        <span>反馈</span>
      </motion.button>

      {/* 弹出层遮罩 */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50"
              style={{ background: 'rgba(0,0,0,0.15)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
            />

            {/* 表单卡片 */}
            <motion.div
              className="fixed bottom-16 right-6 z-50 w-80"
              style={{
                background:   '#FFFFFF',
                border:       '1px solid #E5E7EB',
                borderRadius: 12,
                boxShadow:    '0 8px 32px rgba(0,0,0,0.12)',
                overflow:     'hidden',
              }}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{   opacity: 0, y: 8,   scale: 0.97 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            >
              {/* 头部 */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #F3F4F6' }}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} style={{ color: '#2563EB' }} />
                  <span className="text-sm font-medium" style={{ color: '#111827' }}>
                    意见反馈
                  </span>
                </div>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center w-6 h-6 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                  style={{ color: '#9CA3AF', border: 'none', background: 'none' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* 内容区 */}
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="success"
                    className="flex flex-col items-center justify-center gap-2 py-8"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <CheckCircle size={32} style={{ color: '#10B981' }} />
                    <p className="text-sm font-medium" style={{ color: '#111827' }}>感谢你的反馈！</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>我们会认真阅读每一条建议</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    className="px-4 py-4 flex flex-col gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* 反馈内容 */}
                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: '#374151' }}
                      >
                        反馈内容 <span style={{ color: '#EF4444' }}>*</span>
                      </label>
                      <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={e => { setContent(e.target.value); setError('') }}
                        placeholder="遇到了什么问题？或者有什么改进建议？"
                        rows={4}
                        className="w-full resize-none text-sm outline-none transition-colors"
                        style={{
                          background:   '#F9FAFB',
                          border:       `1px solid ${error ? '#FCA5A5' : '#E5E7EB'}`,
                          borderRadius: 8,
                          padding:      '8px 10px',
                          color:        '#111827',
                          lineHeight:   1.6,
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = '#93C5FD'}
                        onBlur={e => e.currentTarget.style.borderColor = error ? '#FCA5A5' : '#E5E7EB'}
                      />
                      {error && (
                        <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</p>
                      )}
                    </div>

                    {/* 联系方式（可选） */}
                    <div>
                      <label
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: '#374151' }}
                      >
                        联系方式
                        <span className="ml-1 font-normal" style={{ color: '#9CA3AF' }}>（可选，方便我回复你）</span>
                      </label>
                      <input
                        type="text"
                        value={contact}
                        onChange={e => setContact(e.target.value)}
                        placeholder="邮箱 / 手机号 / 微信，随便留"
                        className="w-full text-sm outline-none transition-colors"
                        style={{
                          background:   '#F9FAFB',
                          border:       '1px solid #E5E7EB',
                          borderRadius: 8,
                          padding:      '7px 10px',
                          color:        '#111827',
                          height:       34,
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = '#93C5FD'}
                        onBlur={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                      />
                    </div>

                    {/* 提交按钮 */}
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-1.5 text-sm font-medium cursor-pointer transition-opacity"
                      style={{
                        background:   '#2563EB',
                        color:        '#FFFFFF',
                        border:       'none',
                        borderRadius: 8,
                        height:       36,
                        opacity:      submitting ? 0.7 : 1,
                      }}
                    >
                      {submitting ? (
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: 'rgba(255,255,255,0.4) transparent rgba(255,255,255,0.4) rgba(255,255,255,0.4)' }} />
                      ) : (
                        <>
                          <Send size={13} />
                          提交反馈
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
