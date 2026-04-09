'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Route, Lightbulb, BookOpen, Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { useAgentStore, type AgentId, type AgentState } from '@/lib/stores/agentStore'
import { useEffect, useState } from 'react'

/* ============================================================
   AgentStatusPanel — Agent 状态卡片，Claude 风格加载提示
   ============================================================ */

const AGENT_META: Record<AgentId, { icon: React.ReactNode; color: string; bg: string }> = {
  poi:       { icon: <MapPin size={14} />,    color: '#2563EB', bg: '#EFF6FF' },
  route:     { icon: <Route size={14} />,     color: '#059669', bg: '#ECFDF5' },
  tips:      { icon: <Lightbulb size={14} />, color: '#D97706', bg: '#FFFBEB' },
  xhs:       { icon: <BookOpen size={14} />,  color: '#7C3AED', bg: '#F5F3FF' },
  synthesis: { icon: <Sparkles size={14} />,  color: '#0EA5E9', bg: '#F0F9FF' },
}

/* 每个 agent 对应的轮换提示词 */
const AGENT_HINTS: Record<AgentId, string[]> = {
  poi: [
    '正在搜索目的地热门景点...',
    '挖掘小众打卡地...',
    '评估各景点开放时间与评分...',
    '筛选最值得去的地点...',
  ],
  route: [
    '分析各景点地理位置...',
    '规划最优游览动线...',
    '计算景点间交通时间...',
    '组合成合理的每日路线...',
  ],
  tips: [
    '整理实用旅行贴士...',
    '收集当地注意事项...',
    '准备行前必备清单...',
    '汇总天气与着装建议...',
  ],
  xhs: [
    '检索小红书热门攻略...',
    '提取真实旅行经验...',
    '筛选高质量种草内容...',
    '整合达人踩坑建议...',
  ],
  synthesis: [
    '汇总所有 Agent 结果...',
    '生成完整行程方案...',
    '编排每日详细计划...',
    '优化行程节奏与衔接...',
    '最终检验行程合理性...',
  ],
}

function useRotatingHint(hints: string[], isRunning: boolean, interval = 2200) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!isRunning) return
    const t = setInterval(() => setIdx((i) => (i + 1) % hints.length), interval)
    return () => clearInterval(t)
  }, [isRunning, hints.length, interval])
  return hints[idx]
}

function AgentRow({ agent, isLast }: { agent: AgentState; isLast: boolean }) {
  const meta    = AGENT_META[agent.id]
  const isDone  = agent.status === 'done'
  const isError = agent.status === 'error'
  const isRun   = agent.status === 'running'
  const isIdle  = agent.status === 'idle'

  const hint = useRotatingHint(AGENT_HINTS[agent.id], isRun)

  return (
    <>
      <div className="px-5 py-3.5 flex items-center gap-3">
        {/* 图标 */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
          style={{
            background: isDone ? meta.color : isError ? '#FEE2E2' : isRun ? meta.bg : '#F9FAFB',
            color:      isDone ? '#FFFFFF'  : isError ? '#EF4444' : isRun ? meta.color : '#D1D5DB',
          }}
        >
          {isError ? <AlertCircle size={13} /> : meta.icon}
        </div>

        {/* 名称 + 状态文字 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: isIdle ? '#9CA3AF' : '#111827' }}
            >
              {agent.label}
            </span>
            <span className="text-[10px]" style={{ color: '#CBD5E1' }}>
              {agent.labelEn}
            </span>
          </div>

          {/* 轮换提示文字 */}
          <AnimatePresence mode="wait">
            {isRun && (
              <motion.p
                key={agent.id === 'synthesis' ? agent.message : hint}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.25 }}
                className="text-xs mt-0.5 truncate"
                style={{ color: meta.color }}
              >
                {agent.id === 'synthesis' ? (agent.message || '整合行程数据...') : hint}
              </motion.p>
            )}
            {isDone && agent.preview && (
              <motion.p
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs mt-0.5 truncate"
                style={{ color: '#64748B' }}
              >
                {agent.preview}
              </motion.p>
            )}
            {isIdle && (
              <motion.p
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs mt-0.5"
                style={{ color: '#D1D5DB' }}
              >
                等待中...
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* 右侧状态 */}
        <div className="shrink-0 flex items-center">
          {isDone  && <CheckCircle size={15} style={{ color: meta.color }} />}
          {isError && <AlertCircle size={15} style={{ color: '#EF4444' }} />}
          {isRun && (
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: meta.color }}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          )}
          {isIdle && (
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#E5E7EB' }} />
          )}
        </div>
      </div>
      {!isLast && <div style={{ height: 1, background: '#F3F4F6' }} />}
    </>
  )
}

export function AgentStatusPanel() {
  const { agents } = useAgentStore()

  return (
    <div
      className="overflow-hidden"
      style={{
        background:   '#FFFFFF',
        border:       '1px solid #E5E7EB',
        borderRadius: 8,
        boxShadow:    '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {agents.map((agent, i) => (
        <AgentRow key={agent.id} agent={agent} isLast={i === agents.length - 1} />
      ))}
    </div>
  )
}
