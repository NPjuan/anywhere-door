'use client'

import { useSearchStore } from '@/lib/stores/searchStore'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const STORAGE_KEY = 'ad_ai_model'

const MODELS = [
  { value: 'deepseek', label: 'DeepSeek', desc: '默认，综合能力强' },
] as const

export function ModelSelector() {
  const aiModel    = useSearchStore(s => s.params.aiModel)
  const setAiModel = useSearchStore(s => s.setAiModel)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = MODELS.find(m => m.value === aiModel) ?? MODELS[0]

  // 初始化：从 localStorage 恢复
  useEffect(() => {
    if (MODELS.length <= 1) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && MODELS.some(m => m.value === saved)) {
      setAiModel(saved as Parameters<typeof setAiModel>[0])
    }
  }, [setAiModel])

  // 点击外部关闭
  useEffect(() => {
    if (MODELS.length <= 1) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 选择时持久化
  const handleSelect = (value: Parameters<typeof setAiModel>[0]) => {
    setAiModel(value)
    localStorage.setItem(STORAGE_KEY, value)
    setOpen(false)
  }

  // 只有一个模型时，只展示当前模型名，不可切换
  if (MODELS.length <= 1) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs"
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          background: '#F9FAFB',
          color: '#9CA3AF',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 11 }}>AI模型</span>
        <span style={{ color: '#374151', fontWeight: 600 }}>{current.label}</span>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs font-medium transition-all"
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          background: '#FFFFFF',
          color: '#374151',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: '#6B7280', fontSize: 11 }}>AI模型</span>
        <span style={{ color: '#2563EB', fontWeight: 600 }}>{current.label}</span>
        <ChevronDown size={12} style={{ color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 160,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {MODELS.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => handleSelect(m.value as Parameters<typeof setAiModel>[0])}
              className="w-full text-left transition-colors"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '10px 14px',
                background: aiModel === m.value ? '#EFF6FF' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                gap: 2,
              }}
              onMouseEnter={e => { if (aiModel !== m.value) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
              onMouseLeave={e => { if (aiModel !== m.value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: aiModel === m.value ? '#2563EB' : '#111827' }}>
                {m.label}
              </span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{m.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
