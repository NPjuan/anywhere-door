'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

/* ============================================================
   PromptInput — 旅行诉求输入 + 预设风格卡片
   Travel prompt input + preset style cards

   交互: 点击预设卡片 → 填入 textarea（可继续编辑）
   Interaction: Click preset card → fill textarea (editable)
   ============================================================ */

interface PromptInputProps {
  value:    string
  onChange: (v: string) => void
}

const PRESETS = [
  {
    icon: '📸',
    title: '摄影打卡',
    desc: '寻找最美拍摄地',
    prompt: '帮我规划一次以摄影为主题的旅行，寻找最佳拍摄地点、黄金光线时间段和绝美构图场景，推荐适合拍照的网红地标和小众秘境，包括日出日落的最佳观赏位置。',
  },
  {
    icon: '🍜',
    title: '深度美食',
    desc: '吃货视角看世界',
    prompt: '我想来一次深度美食之旅，探索当地最地道的街边小吃、老字号餐厅和隐藏美食，从早餐到夜宵全覆盖，吃货视角规划每日行程，附上必吃菜品和点单攻略。',
  },
  {
    icon: '☕',
    title: '轻松漫游',
    desc: '不赶路的慢旅行',
    prompt: '帮我规划一次悠闲自在的慢节奏旅行，不赶时间、随性漫步，多一些独立咖啡馆、特色书店、安静公园和有故事的老街巷，享受当地的生活方式。',
  },
  {
    icon: '🏛️',
    title: '文化探索',
    desc: '历史与人文之旅',
    prompt: '我希望深度了解当地历史文化，参观重要博物馆、古迹遗址和传统市集，体验当地民俗活动和非遗文化，让旅行有知识深度和人文温度。',
  },
] as const

export function PromptInput({ value, onChange }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handlePreset = (prompt: string) => {
    onChange(prompt)
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(prompt.length, prompt.length)
    }, 50)
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Label */}
      <div className="flex items-center gap-1.5">
        <Sparkles size={12} style={{ color: '#0EA5E9' }} aria-hidden="true" />
        <label className="text-xs font-medium" style={{ color: '#64748B' }}>
          旅行诉求 <span style={{ color: '#CBD5E1' }}>可选</span>
        </label>
      </div>

      {/* 预设卡片 — 紧凑横向排列 */}
      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map((p) => {
          const isActive = value === p.prompt
          return (
            <motion.button
              key={p.title}
              type="button"
              onClick={() => handlePreset(p.prompt)}
              whileTap={{ scale: 0.97 }}
              aria-pressed={isActive}
              aria-label={`预设：${p.title}`}
              className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-center cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              style={{
                background: isActive ? '#EFF9FF' : '#F8FAFC',
                border:     `1px solid ${isActive ? '#7DD3FC' : '#E2E8F0'}`,
              }}
            >
              <span className="text-base leading-none" aria-hidden="true">{p.icon}</span>
              <span className="text-xs font-medium leading-tight" style={{ color: isActive ? '#0284C7' : '#475569' }}>
                {p.title}
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="描述你的旅行诉求，例如：带孩子的亲子游，多安排适合小朋友的景点..."
          className="w-full resize-none px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2"
          style={{
            background:     '#FFFFFF',
            border:         '1px solid #E2E8F0',
            borderRadius:   8,
            color:          '#0F172A',
            fontFamily:     'Inter, system-ui, sans-serif',
            caretColor:     '#0EA5E9',
            // @ts-expect-error css var
            '--tw-ring-color': 'rgba(125,211,252,0.5)',
            '--tw-ring-offset-shadow': '0 0 #0000',
          }}
          aria-label="旅行诉求"
        />
        {value.length > 0 && (
          <span className="absolute bottom-2 right-2.5 text-xs" style={{ color: '#CBD5E1' }}>
            {value.length}
          </span>
        )}
      </div>
    </div>
  )
}
