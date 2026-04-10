'use client'

import { useEffect, useRef, memo, useCallback } from 'react'
import { ArrowLeft, Sparkles, Square } from 'lucide-react'

interface PromptPreviewCardProps {
  isGenerating: boolean
  isPlanning?:  boolean
  prompt: string
  onChange: (v: string) => void
  onBack: () => void
  onConfirm: () => void
  onInterrupt?: () => void
}

/**
 * ===== PromptPreviewCard 组件 =====
 * Prompt 预览和编辑卡片
 * 使用 memo 优化：仅当 isGenerating、prompt 或回调变化时重新渲染
 */
export const PromptPreviewCard = memo(({
  isGenerating,
  isPlanning = false,
  prompt,
  onChange,
  onBack,
  onConfirm,
  onInterrupt,
}: PromptPreviewCardProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isGenerating && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight
    }
  }, [prompt, isGenerating])

  // 防止不必要的闭包重建
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }, [onChange])

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.10)',
      }}
    >
      {/* 顶部栏 */}
      <div
        className="flex items-center gap-2.5 px-5 py-3.5 border-b"
        style={{ borderColor: '#F3F4F6' }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: '#2563EB',
            boxShadow: '0 0 5px rgba(37,99,235,0.5)',
          }}
        />
        <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
          AI 生成预览
        </span>
        {isGenerating && (
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              background: '#EFF6FF',
              color: '#2563EB',
            }}
          >
            ✨ 生成中...
          </span>
        )}
      </div>

      {/* Textarea 区域 */}
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={handleTextChange}
        disabled={isGenerating || isPlanning}
        placeholder="AI 行程建议将显示在这里，你也可以直接编辑..."
        rows={6}
        className="w-full p-5 border-0 focus:outline-none focus:ring-0 resize-none"
        style={{
          color: '#111827',
          fontSize: 13,
          lineHeight: 1.6,
          backgroundColor: (isGenerating || isPlanning) ? '#FAFBFC' : '#FFFFFF',
          opacity: isPlanning ? 0.6 : isGenerating ? 0.9 : 1,
          fontFamily: 'Menlo, Monaco, monospace',
        }}
      />

      {/* 底部操作栏 */}
      <div
        className="flex items-center gap-2 px-5 py-3.5 border-t"
        style={{ borderColor: '#F3F4F6', background: '#FAFBFC', minHeight: 56 }}
      >
        {isPlanning ? (
          /* planning 中：整行「中断生成」按钮 */
          <button
            type="button"
            onClick={onInterrupt}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-sm cursor-pointer transition-all"
            style={{
              background:   'transparent',
              border:       '1px solid #FECACA',
              borderRadius: 8,
              color:        '#EF4444',
            }}
          >
            <Square size={11} />
            中断生成
          </button>
        ) : (
          /* 正常：返回 + 开始规划 */
          <>
            <button
              type="button"
              onClick={onBack}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                color: '#6B7280',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              <ArrowLeft size={14} />
              返回
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={onConfirm}
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-all"
              style={{
                background:
                  !isGenerating && prompt.trim()
                    ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                    : '#F3F4F6',
                color:
                  !isGenerating && prompt.trim() ? '#FFFFFF' : '#9CA3AF',
                border: 'none',
                borderRadius: 8,
                boxShadow:
                  !isGenerating && prompt.trim()
                    ? '0 4px 12px rgba(37,99,235,0.25)'
                    : 'none',
                cursor:
                  !isGenerating && prompt.trim()
                    ? 'pointer'
                    : 'not-allowed',
              }}
            >
              <Sparkles size={14} />
              开始规划
            </button>
          </>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.isGenerating === nextProps.isGenerating &&
    prevProps.isPlanning   === nextProps.isPlanning   &&
    prevProps.prompt       === nextProps.prompt       &&
    prevProps.onChange     === nextProps.onChange     &&
    prevProps.onBack       === nextProps.onBack       &&
    prevProps.onConfirm    === nextProps.onConfirm    &&
    prevProps.onInterrupt  === nextProps.onInterrupt
  )
})

PromptPreviewCard.displayName = 'PromptPreviewCard'
