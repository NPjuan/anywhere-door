'use client'

import { useCallback, useReducer, useRef, useEffect } from 'react'
import { useAgentStore, type AgentId } from '@/lib/stores/agentStore'
import { useItineraryStore } from '@/lib/stores/itineraryStore'
import { getDeviceId } from '@/lib/deviceId'

/* ============================================================
   useHomeFlow — 首页状态机 Hook
   所有持久化通过 Supabase DB，不使用 localStorage

   Steps:
   form           → 表单填写
   generating     → 正在生成 Prompt 预览（流式）
   prompt-preview → Prompt 预览，用户可编辑
   planning       → Agent 运行中（SSE 实时进度）
   done           → 行程完成，展示结果
   ============================================================ */

export type HomeStep = 'form' | 'generating' | 'prompt-preview' | 'planning' | 'done'

export type WarningType = 'slow-processing' | 'taking-longer' | null

interface HomeFlowState {
  step:          HomeStep
  previewPrompt: string
  finalPrompt:   string
  error:         string | null
  warning:       WarningType
}

type HomeAction =
  | { type: 'START_GENERATING' }
  | { type: 'APPEND_PROMPT'; chunk: string }
  | { type: 'PROMPT_READY' }
  | { type: 'SET_FINAL_PROMPT'; prompt: string }
  | { type: 'START_PLANNING' }
  | { type: 'PLANNING_DONE' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SET_WARNING'; warning: WarningType }
  | { type: 'RESET' }

const initialState: HomeFlowState = {
  step:          'form',
  previewPrompt: '',
  finalPrompt:   '',
  error:         null,
  warning:       null,
}

function reducer(state: HomeFlowState, action: HomeAction): HomeFlowState {
  switch (action.type) {
    case 'START_GENERATING':   return { ...state, step: 'generating', previewPrompt: '', error: null, warning: null }
    case 'APPEND_PROMPT':      return { ...state, previewPrompt: state.previewPrompt + action.chunk }
    case 'PROMPT_READY':       return { ...state, step: 'prompt-preview', finalPrompt: state.previewPrompt }
    case 'SET_FINAL_PROMPT':   return { ...state, finalPrompt: action.prompt }
    case 'START_PLANNING':     return { ...state, step: 'planning', warning: null }
    case 'PLANNING_DONE':      return { ...state, step: 'done', warning: null }
    case 'SET_WARNING':        return { ...state, warning: action.warning }
    case 'SET_ERROR':          return { ...state, error: action.error, step: 'form', warning: null }
    case 'RESET':              return { ...initialState }
    default:                   return state
  }
}

/* 当前进行中的 plan ID — 模块级，避免闭包捕获问题 */
let activePlanId: string | null = null

/* ===== 轮询状态跟踪接口 ===== */
interface PollingState {
  retries: number
  maxRetries: number
  timeout: number
  startTime: number
  lastUpdateTime: number
  staleWarningShown: boolean
  slowWarningShown: boolean
  longerWarningShown: boolean
}

export function useHomeFlow() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef<AbortController | null>(null)

  const { updateAgent, appendAgentStream, appendStream, setComplete, reset: resetAgents } = useAgentStore()
  const { setItinerary, clear: clearItinerary, setPlanId, hydrate: hydrateItinerary } = useItineraryStore()

  /* ─────────────────────────────────────────────────────────
     核心规划流程 — 用 ref 包裹，useEffect 可安全调用
  ───────────────────────────────────────────────────────── */
  const runPlanningRef = useRef<(
    params: {
      originCode:      string
      destinationCode: string
      startDate:       string
      endDate:         string
      finalPrompt:     string
    },
    planId: string,
  ) => Promise<void> | null>(null)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const synthProgressRef = useRef(0)
  const pollStateRef = useRef<PollingState>({
    retries: 0,
    maxRetries: 30,
    timeout: 8000,
    startTime: Date.now(),
    lastUpdateTime: Date.now(),
    staleWarningShown: false,
    slowWarningShown: false,
    longerWarningShown: false,
  })

  /* 停止轮询 */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  /* 启动轮询 — 可被 runPlanning 和刷新恢复共用 */
  const startPollingForPlan = useCallback((planId: string) => {
    stopPolling()
    synthProgressRef.current = 0
    
    // 重置轮询状态
    pollStateRef.current = {
      retries: 0,
      maxRetries: 30, // 30 × 2.5s = 75 seconds
      timeout: 8000,  // 8 second timeout per request
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      staleWarningShown: false,
      slowWarningShown: false,
      longerWarningShown: false,
    }

    pollIntervalRef.current = setInterval(async () => {
      const pollState = pollStateRef.current
      const now = Date.now()
      const elapsedSinceStart = now - pollState.startTime
      
      // ===== 检查 1: 总超时 (3 分钟) =====
      if (elapsedSinceStart > 180000) {
        stopPolling()
        dispatch({ 
          type: 'SET_ERROR', 
          error: '行程生成超时（3分钟），请检查网络连接后重试' 
        })
        return
      }
      
      // ===== 检查 2: 重试次数超限 (75 秒) =====
      if (pollState.retries >= pollState.maxRetries) {
        stopPolling()
        dispatch({ 
          type: 'SET_ERROR', 
          error: '网络连接不稳定，请检查网络后重试' 
        })
        return
      }

      // ===== 检查 3: 30 秒警告 =====
      if (elapsedSinceStart > 30000 && !pollState.slowWarningShown) {
        pollState.slowWarningShown = true
        dispatch({ type: 'SET_WARNING', warning: 'slow-processing' })
        console.warn(`[useHomeFlow] Plan ${planId} processing slowly (30s+)`)
      }

      // ===== 检查 4: 90 秒警告 =====
      if (elapsedSinceStart > 90000 && !pollState.longerWarningShown) {
        pollState.longerWarningShown = true
        dispatch({ type: 'SET_WARNING', warning: 'taking-longer' })
        console.warn(`[useHomeFlow] Plan ${planId} taking longer than expected (90s+)`)
      }

      // ===== 检查 5: 30 秒无更新警告 (用于调试) =====
      if (now - pollState.lastUpdateTime > 30000 && !pollState.staleWarningShown) {
        pollState.staleWarningShown = true
        console.warn(`[useHomeFlow] Plan ${planId} has no update for 30s`)
      }

      try {
        // ===== 使用 AbortController 设置请求超时 =====
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), pollState.timeout)
        
        const detail = await fetch(`/api/plans/${planId}`, {
          signal: controller.signal,
        }).then(r => r.ok ? r.json() : null)
        
        clearTimeout(timeoutId)
        
        if (!detail?.plan) {
          // 没有有效数据，递增重试计数
          pollState.retries++
          return
        }
        
        // ===== 成功获取有效数据，重置重试计数 =====
        pollState.retries = 0
        pollState.lastUpdateTime = now
        pollState.staleWarningShown = false
        
        const plan     = detail.plan
        const progress = plan.agent_progress as Record<string, { status: string; preview: string }> | null

        if (progress) {
          Object.entries(progress).forEach(([agentId, state]) => {
            if (agentId === 'synthesis') return
            if (state.status === 'done') {
              updateAgent(agentId as AgentId, { status: 'done', progress: 100, message: '✓ 完成', preview: state.preview ?? '' })
            } else if (state.status === 'error') {
              updateAgent(agentId as AgentId, { status: 'error', progress: 100, message: '执行失败' })
            }
          })
          const synth = progress.synthesis
          if (synth?.status === 'running') {
            synthProgressRef.current = Math.min(synthProgressRef.current + 3, 95)
            updateAgent('synthesis', { status: 'running', progress: synthProgressRef.current, message: '整合行程中...' })
          } else if (synth?.status === 'done') {
            updateAgent('synthesis', { status: 'done', progress: 100, message: '✓ 行程生成完成' })
          } else if (!synth || synth.status === 'idle') {
            // 并行 agent 都完成了，synthesis 即将开始
            const parallelDone = ['poi','route','tips','xhs'].every(id => progress[id]?.status === 'done' || progress[id]?.status === 'error')
            if (parallelDone) updateAgent('synthesis', { status: 'running', progress: 0, message: '整合行程中...' })
          }
        }

        if (plan.status === 'done' && plan.itinerary) {
          stopPolling()
          setItinerary(JSON.stringify(plan.itinerary))
          setPlanId(planId)
          updateAgent('synthesis', { status: 'done', progress: 100, message: '✓ 行程生成完成' })
          setComplete(`plan-${planId}`)
          dispatch({ type: 'PLANNING_DONE' })
        } else if (plan.status === 'error' || plan.status === 'interrupted') {
          stopPolling()
          dispatch({ type: 'SET_ERROR', error: '行程生成失败，请重试' })
        }
      } catch (err) {
        // ===== 错误处理 =====
        if (err instanceof Error && err.name === 'AbortError') {
          pollState.retries++
          console.warn(`[useHomeFlow] Request timeout for plan ${planId}, retry ${pollState.retries}/${pollState.maxRetries}`)
        } else {
          pollState.retries++
          console.warn(`[useHomeFlow] Polling error for plan ${planId}:`, err)
        }
      }
    }, 2500)
  }, [updateAgent, setItinerary, setPlanId, setComplete, stopPolling])

  const runPlanning = useCallback(async (
    params: {
      originCode:      string
      destinationCode: string
      startDate:       string
      endDate:         string
      finalPrompt:     string
    },
    planId: string,
  ) => {
    abortRef.current = new AbortController()

    try {
      // 发起后台任务（立即返回 202）
      const res = await fetch('/api/agents/orchestrate-bg', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abortRef.current.signal,
        body:    JSON.stringify({
          planId,
          originCode:      params.originCode,
          destinationCode: params.destinationCode,
          startDate:       params.startDate,
          endDate:         params.endDate,
          prompt:          params.finalPrompt,
        }),
      })
      if (!res.ok) throw new Error(`规划失败 (${res.status})`)

      // 初始化 UI 状态
      const agentIds: AgentId[] = ['poi', 'route', 'tips', 'xhs']
      agentIds.forEach((id) => updateAgent(id, { status: 'running', progress: 0, message: 'AI 处理中...' }))

      // 启动轮询
      startPollingForPlan(planId)

    } catch (err) {
      stopPolling()
      if ((err as Error).name === 'AbortError') return
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) })
      fetch(`/api/plans/${planId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'error' }),
      }).catch(() => {})
    }
  }, [updateAgent, startPollingForPlan, stopPolling])

  // 始终保持 ref 指向最新的 runPlanning
  runPlanningRef.current = runPlanning

  /* ─────────────────────────────────────────────────────────
     页面加载：从 DB 恢复状态
     - pending → 从 DB 取完整 plan（含 planning_params）重跑
     - done    → 使用 hydrate() 恢复 itinerary
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const deviceId = getDeviceId()
    if (!deviceId) return

    fetch(`/api/plans?deviceId=${encodeURIComponent(deviceId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then(async (data) => {
        if (!data?.plans?.length) return
        const latest = data.plans[0]

        if (latest.status === 'pending') {
          const detail = await fetch(`/api/plans/${latest.id}`).then((r) => r.ok ? r.json() : null)
          const pp = detail?.plan?.planning_params
          if (pp) {
            // 恢复已完成的 agent 进度到 UI
            const progress = detail?.plan?.agent_progress as Record<string, { status: string; preview: string }> | null
            if (progress) {
              Object.entries(progress).forEach(([agentId, state]) => {
                if (state.status === 'done') {
                  updateAgent(agentId as AgentId, { status: 'done', progress: 100, message: '✓ 完成', preview: state.preview ?? '' })
                } else if (state.status === 'running') {
                  updateAgent(agentId as AgentId, { status: 'running', progress: 0, message: 'AI 处理中...' })
                }
              })
            } else {
              // 无进度记录，所有 agent 标记为 running
              const agentIds: AgentId[] = ['poi', 'route', 'tips', 'xhs']
              agentIds.forEach((id) => updateAgent(id, { status: 'running', progress: 0, message: 'AI 处理中...' }))
            }
            activePlanId = latest.id
            dispatch({ type: 'START_PLANNING' })
            // 只轮询，不重新发起后台任务（后台已经在跑）
            startPollingForPlan(latest.id)
          } else {
            fetch(`/api/plans/${latest.id}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'error' }),
            }).catch(() => {})
          }
        } else if (latest.status === 'interrupted') {
          // 用户主动中断，不恢复，直接回到表单
          return
        } else if (latest.status === 'done') {
          // 使用 hydrate() 恢复已完成的行程
          await hydrateItinerary(latest.id)
          dispatch({ type: 'PLANNING_DONE' })
        }
      })
      .catch(() => { /* 静默失败 */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── 步骤 1：生成 Prompt 预览 ── */
  const generatePromptPreview = useCallback(async (params: {
    originCode:       string
    destinationCode:  string
    startDate:        string
    endDate:          string
    userPrompt:       string
    hotelName?:       string
    hotelAddress?:    string
    mustVisitNames?:  string[]
    mustAvoidNames?:  string[]
  }) => {
    dispatch({ type: 'START_GENERATING' })
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/agents/preview-prompt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error(`生成失败 (${res.status})`)

      const reader  = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        dispatch({ type: 'APPEND_PROMPT', chunk: decoder.decode(value, { stream: true }) })
      }
      dispatch({ type: 'PROMPT_READY' })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  /* ── 步骤 2：用户编辑 Prompt ── */
  const setFinalPrompt = useCallback((prompt: string) => {
    dispatch({ type: 'SET_FINAL_PROMPT', prompt })
  }, [])

  /* ── 步骤 3：用户确认开始规划 ── */
  const startPlanning = useCallback(async (params: {
    originCode:      string
    destinationCode: string
    startDate:       string
    endDate:         string
    finalPrompt:     string
  }) => {
    clearItinerary()
    resetAgents()

    // 立即在 DB 创建 pending 记录（含规划参数，用于刷新恢复）
    const deviceId = getDeviceId()
    let planId = `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    if (deviceId) {
      try {
        const res = await fetch('/api/plans', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId, status: 'pending', planningParams: params }),
        })
        if (res.ok) {
          const { id } = await res.json()
          planId = id
        }
      } catch { /* 静默失败 */ }
    }

    activePlanId = planId
    dispatch({ type: 'START_PLANNING' })
    await runPlanning(params, planId)
  }, [clearItinerary, resetAgents, runPlanning])

  /* ── 中断生成（planning 步骤中）── */
  const interrupt = useCallback(() => {
    abortRef.current?.abort()
    stopPolling()
    dispatch({ type: 'RESET' })
    clearItinerary()
    resetAgents()
    if (activePlanId) {
      fetch(`/api/plans/${activePlanId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'interrupted' }),
      }).catch(() => {})
      activePlanId = null
    }
  }, [clearItinerary, resetAgents, stopPolling])

  /* ── 返回重新规划（done/form 步骤）── */
  const goBack = useCallback(() => {
    abortRef.current?.abort()
    stopPolling()
    dispatch({ type: 'RESET' })
    clearItinerary()
    resetAgents()
    if (activePlanId) {
      fetch(`/api/plans/${activePlanId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'error' }),
      }).catch(() => {})
      activePlanId = null
    }
  }, [clearItinerary, resetAgents, stopPolling])

  /* ── 生成失败后重试（保留表单数据，只重置步骤）── */
  const retryAfterFailure = useCallback(() => {
    stopPolling()
    resetAgents()
    clearItinerary()
    dispatch({ type: 'RESET' })
    // 不清空 searchStore，保留用户填写的表单
  }, [stopPolling, resetAgents, clearItinerary])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    stopPolling()
    dispatch({ type: 'RESET' })
    resetAgents()
    clearItinerary()
  }, [resetAgents, clearItinerary, stopPolling])

  return {
    ...state,
    generatePromptPreview,
    setFinalPrompt,
    startPlanning,
    interrupt,
    retryAfterFailure,
    reset,
    goBack,
  }
}
