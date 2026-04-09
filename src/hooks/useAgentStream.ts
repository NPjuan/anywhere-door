'use client'

import { useCallback, useRef } from 'react'
import { useAgentStore, type AgentId } from '@/lib/stores/agentStore'
import { useSearchStore } from '@/lib/stores/searchStore'

/* ============================================================
   useAgentStream — 触发多 Agent 流式执行（重构版，无机票）
   Multi-agent streaming execution (redesigned, no flight)
   ============================================================ */

export function useAgentStream() {
  const { params } = useSearchStore()
  const { updateAgent, appendStream, setComplete, reset } = useAgentStore()
  const abortRef = useRef<AbortController | null>(null)

  const startPlanning = useCallback(async () => {
    reset()
    abortRef.current = new AbortController()

    const parallelAgents: AgentId[] = ['poi', 'route', 'tips', 'xhs']

    // 错开进入动画 / Staggered entrance animation
    parallelAgents.forEach((id, i) => {
      setTimeout(() => {
        updateAgent(id, { status: 'running', progress: 10, message: '正在处理...' })
      }, i * 200)
    })

    // 模拟进度动画 / Simulate progress
    const progressTimers = parallelAgents.map((id, i) => {
      let p = 10
      return setInterval(() => {
        p = Math.min(p + Math.random() * 12, 85)
        updateAgent(id, { progress: Math.round(p) })
      }, 700 + i * 150)
    })

    try {
      const res = await fetch('/api/agents/orchestrate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abortRef.current.signal,
        body: JSON.stringify({
          originCode:      params.origin?.code,
          destinationCode: params.destination?.code,
          startDate:       params.startDate,
          endDate:         params.endDate,
          prompt:          params.prompt,
        }),
      })

      if (!res.ok) throw new Error(`Orchestrate error: ${res.status}`)

      progressTimers.forEach(clearInterval)
      parallelAgents.forEach((id) =>
        updateAgent(id, { status: 'done', progress: 100, message: '✓ 完成' }),
      )

      updateAgent('synthesis', { status: 'running', progress: 5, message: '正在整合行程...' })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')

      let synthProgress = 5
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        appendStream(chunk)
        synthProgress = Math.min(synthProgress + 1.5, 95)
        updateAgent('synthesis', { progress: synthProgress })
      }

      updateAgent('synthesis', { status: 'done', progress: 100, message: '✓ 行程已生成' })
      setComplete(`plan-${Date.now()}`)

    } catch (err) {
      progressTimers.forEach(clearInterval)
      if ((err as Error).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : String(err)
      parallelAgents.forEach((id) => {
        const store = useAgentStore.getState()
        const agent = store.agents.find((a) => a.id === id)
        if (agent?.status === 'running') updateAgent(id, { status: 'error', message: msg })
      })
      updateAgent('synthesis', { status: 'error', message: msg })
    }
  }, [params, updateAgent, appendStream, setComplete, reset])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { startPlanning, cancel }
}
