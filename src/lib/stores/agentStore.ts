import { create } from 'zustand'

/* ============================================================
   agentStore — 5 个 Agent 实时状态 + 流式思考文字
   Real-time status + per-agent streaming thought text
   ============================================================ */

export type AgentId = 'poi' | 'route' | 'tips' | 'xhs' | 'synthesis'
export type AgentStatus = 'idle' | 'running' | 'done' | 'error'

export interface AgentState {
  id:          AgentId
  label:       string
  labelEn:     string
  status:      AgentStatus
  progress:    number
  message:     string
  preview:     string   // 完成后的输出摘要
  streamChunk: string   // 运行中的流式思考文字
  error?:      string
}

const INITIAL_AGENTS: AgentState[] = [
  { id: 'poi',       label: '地点推荐',   labelEn: 'POI Discovery',   status: 'idle', progress: 0, message: '等待中...', preview: '', streamChunk: '' },
  { id: 'route',     label: '路线规划',   labelEn: 'Route Planning',  status: 'idle', progress: 0, message: '等待中...', preview: '', streamChunk: '' },
  { id: 'tips',      label: '旅行贴士',   labelEn: 'Travel Tips',     status: 'idle', progress: 0, message: '等待中...', preview: '', streamChunk: '' },
  { id: 'xhs',       label: '攻略参考',   labelEn: 'XHS Research',    status: 'idle', progress: 0, message: '等待中...', preview: '', streamChunk: '' },
  { id: 'synthesis', label: '汇总编排',   labelEn: 'Synthesis',       status: 'idle', progress: 0, message: '等待中...', preview: '', streamChunk: '' },
]

interface AgentStore {
  agents:       AgentState[]
  streamText:   string
  isComplete:   boolean
  sessionId:    string | null

  updateAgent:        (id: AgentId, patch: Partial<AgentState>) => void
  appendAgentStream:  (id: AgentId, chunk: string) => void
  appendStream:       (chunk: string) => void
  setComplete:        (sessionId: string) => void
  reset:              () => void
  allParallelDone:    () => boolean
}

export const useAgentStore = create<AgentStore>()((set, get) => ({
  agents:     INITIAL_AGENTS.map((a) => ({ ...a })),
  streamText: '',
  isComplete: false,
  sessionId:  null,

  updateAgent: (id, patch) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),

  // 追加某个 agent 的流式思考文字
  appendAgentStream: (id, chunk) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, streamChunk: a.streamChunk + chunk } : a,
      ),
    })),

  appendStream: (chunk) =>
    set((s) => ({
      streamText: s.streamText + chunk,
      agents: s.agents.map((a) =>
        a.id === 'synthesis'
          ? { ...a, streamChunk: (s.streamText + chunk).slice(-300) }
          : a,
      ),
    })),

  setComplete: (sessionId) =>
    set({ isComplete: true, sessionId }),

  reset: () =>
    set({
      agents:     INITIAL_AGENTS.map((a) => ({ ...a })),
      streamText: '',
      isComplete: false,
      sessionId:  null,
    }),

  allParallelDone: () => {
    const { agents } = get()
    return agents
      .filter((a) => a.id !== 'synthesis')
      .every((a) => a.status === 'done' || a.status === 'error')
  },
}))
