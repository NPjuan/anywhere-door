'use client';

import { useCallback, useReducer, useRef, useEffect, useState } from 'react';
import { useAgentStore, type AgentId } from '@/lib/stores/agentStore';
import { useItineraryStore } from '@/lib/stores/itineraryStore';
import { useSearchStore, type SearchParams } from '@/lib/stores/searchStore';
import { getDeviceId } from '@/lib/deviceId';
import { findCityByCode } from '@/lib/cities';

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

export type HomeStep =
  | 'form'
  | 'generating'
  | 'prompt-preview'
  | 'planning'
  | 'done';

export type WarningType = 'slow-processing' | 'taking-longer' | null;

interface HomeFlowState {
  step: HomeStep;
  previewPrompt: string;
  finalPrompt: string;
  error: string | null;
  warning: WarningType;
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
  | { type: 'INTERRUPT_TO_PREVIEW' }
  | { type: 'RESET' };

const initialState: HomeFlowState = {
  step: 'form',
  previewPrompt: '',
  finalPrompt: '',
  error: null,
  warning: null,
};

function reducer(state: HomeFlowState, action: HomeAction): HomeFlowState {
  switch (action.type) {
    case 'START_GENERATING':
      return {
        ...state,
        step: 'generating',
        previewPrompt: '',
        finalPrompt:   '',   // 清空旧 finalPrompt，避免流式输出被遮盖
        error: null,
        warning: null,
      };
    case 'APPEND_PROMPT':
      return { ...state, previewPrompt: state.previewPrompt + action.chunk };
    case 'PROMPT_READY':
      return {
        ...state,
        step: 'prompt-preview',
        finalPrompt: state.previewPrompt,
      };
    case 'SET_FINAL_PROMPT':
      return { ...state, finalPrompt: action.prompt };
    case 'START_PLANNING':
      return { ...state, step: 'planning', warning: null, error: null };
    case 'PLANNING_DONE':
      return { ...state, step: 'done', warning: null };
    case 'SET_WARNING':
      return { ...state, warning: action.warning };
    case 'SET_ERROR':
      return { ...state, error: action.error, step: 'form', warning: null, previewPrompt: '', finalPrompt: '' };
    case 'INTERRUPT_TO_PREVIEW':
      return { ...state, step: 'prompt-preview', warning: null, error: null };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

/* 当前进行中的 plan ID — 模块级，避免闭包捕获问题 */
let activePlanId: string | null = null;

/* ─────────────────────────────────────────────────────────
   从流式 JSON 片段中提取友好进度文字（哆啦A梦风格）
   策略：正则提取已完成的 "name" / "title" 字段值，转成人话
───────────────────────────────────────────────────────── */
const VERBS = [
  '漫步至',
  '探访',
  '前往',
  '游览',
  '抵达',
  '戴上竹蜻蜓',
  '打开任意门',
];

function getSynthesisProgressMessage(text: string): string {
  // 阶段检测
  const hasDays = text.includes('"days"');
  const hasXhs = text.includes('"xhsNotes"') || text.includes('"notes"');

  // 提取所有已完整写出的 "name" 值（2–25 字，典型景点名长度）
  const nameHits = [...text.matchAll(/"name"\s*:\s*"([^"\\]{2,25})"/g)];
  const lastPOI = nameHits.length > 0 ? nameHits[nameHits.length - 1][1] : null;

  // 提取所有已完整写出的 "title" 值
  const titleHits = [...text.matchAll(/"title"\s*:\s*"([^"\\]{2,40})"/g)];

  if (hasXhs) {
    return lastPOI ? `整理 ${lastPOI} 相关攻略...` : '整理旅行攻略...';
  }

  if (lastPOI && hasDays) {
    const verb = VERBS[nameHits.length % VERBS.length];
    return `${verb} ${lastPOI}`;
  }

  if (hasDays && titleHits.length > 1) {
    const dayTitle = titleHits[titleHits.length - 1][1];
    return `正在规划 ${dayTitle}...`;
  }

  if (titleHits.length > 0) {
    return `生成行程：${titleHits[0][1]}`;
  }

  return '整合行程数据...';
}

/* ===== 轮询状态跟踪接口 ===== */
interface PollingState {
  retries: number;
  maxRetries: number;
  timeout: number;
  startTime: number;
  lastUpdateTime: number;
  staleWarningShown: boolean;
  slowWarningShown: boolean;
  longerWarningShown: boolean;
}

export function useHomeFlow() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  // 待恢复的表单数据（非 pending 状态，让用户主动确认恢复）
  const [pendingRestore, setPendingRestore] = useState<Partial<SearchParams> | null>(null);

  const {
    updateAgent,
    appendAgentStream,
    appendStream,
    setComplete,
    reset: resetAgents,
  } = useAgentStore();
  const synthStreamActiveRef = useRef(false);

  // 从详情页返回时：itineraryStore 已有数据但 step 是 form，直接恢复到 done
  useEffect(() => {
    const existing = useItineraryStore.getState().itinerary;
    if (existing) {
      resetAgents();  // 清掉残留的 streamText / streamChunk
      dispatch({ type: 'PLANNING_DONE' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const {
    setItinerary,
    clear: clearItinerary,
    setPlanId,
    hydrate: hydrateItinerary,
  } = useItineraryStore();
  const { restore: restoreSearchParams } = useSearchStore();

  /* ─────────────────────────────────────────────────────────
     核心规划流程 — 用 ref 包裹，useEffect 可安全调用
  ───────────────────────────────────────────────────────── */
  const runPlanningRef = useRef<
    (
      params: {
        originCode: string;
        destinationCode: string;
        startDate: string;
        endDate: string;
        finalPrompt: string;
      },
      planId: string
    ) => Promise<void> | null
  >(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const synthProgressRef = useRef(0);
  // ref 指向最新的 startPollingForPlan，供 runSynthesisStream 降级使用
  const startPollingRef = useRef<((planId: string) => void) | null>(null);
  const pollStateRef = useRef<PollingState>({
    retries: 0,
    maxRetries: 30,
    timeout: 8000,
    startTime: Date.now(),
    lastUpdateTime: Date.now(),
    staleWarningShown: false,
    slowWarningShown: false,
    longerWarningShown: false,
  });

  /* 停止轮询 */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  /* 前端主动流式消费 synthesis，带自动重试 */
  const runSynthesisStream = useCallback(
    async (planId: string) => {
      const MAX_RETRIES = 3;
      let attempt = 0;

      const tryStream = async (): Promise<void> => {
        try {
          const res = await fetch('/api/agents/synthesis-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId }),
            signal: abortRef.current?.signal,
          });

          // 400 = synthesis input not ready yet，降级轮询
          if (res.status === 400) {
            synthStreamActiveRef.current = true;
            console.warn('[useHomeFlow] synthesis input not ready, falling back to polling');
            updateAgent('synthesis', { status: 'running', progress: 0, message: '整合行程中...' });
            startPollingRef.current?.(planId);
            return;
          }

          if (!res.ok) throw new Error(`synthesis-stream failed (${res.status})`);

          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) throw new Error('No response body');

          let accumulated = '';
          let lastMessage = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (chunk.includes('__SYNTHESIS_ERROR__')) {
              throw new Error('Synthesis failed on server');
            }
            accumulated += chunk;
            appendStream(chunk);

            const msg = getSynthesisProgressMessage(accumulated);
            if (msg !== lastMessage) {
              lastMessage = msg;
              updateAgent('synthesis', {
                status: 'running',
                progress: Math.min(synthProgressRef.current, 95),
                message: msg,
              });
            }
            synthProgressRef.current = Math.min(synthProgressRef.current + 0.3, 95);
          }

          // 流正常结束，从 DB 取最终 itinerary
          const detail = await fetch(`/api/plans/${planId}`, {
            headers: { 'x-device-id': getDeviceId() },
          }).then((r) => r.ok ? r.json() : null);

          if (detail?.plan?.status === 'done' && detail.plan.itinerary) {
            setItinerary(JSON.stringify(detail.plan.itinerary));
            setPlanId(planId);
            updateAgent('synthesis', { status: 'done', progress: 100, message: '✓ 行程生成完成', streamChunk: '' });
            setComplete(`plan-${planId}`);
            dispatch({ type: 'PLANNING_DONE' });
          } else {
            throw new Error('Itinerary not found after synthesis');
          }

        } catch (err) {
          if ((err as Error).name === 'AbortError') return;

          const msg = (err as Error).message ?? '';
          const isRetryable =
            msg.includes('network error') ||
            msg.includes('ERR_NETWORK_IO_SUSPENDED') ||
            msg.includes('Failed to fetch') ||
            msg.includes('Load failed') ||
            msg.includes('timeout') ||
            msg.includes('timed out');

          if (isRetryable && attempt < MAX_RETRIES) {
            attempt++;
            const delayMs = attempt * 2000; // 2s, 4s, 6s
            console.warn(`[useHomeFlow] synthesis stream error (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delayMs}ms:`, msg);
            updateAgent('synthesis', {
              status: 'running',
              progress: Math.min(synthProgressRef.current, 90),
              message: `网络波动，${attempt <= 1 ? '重新连接中' : `第 ${attempt} 次重试`}...`,
            });
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            if (abortRef.current?.signal.aborted) return;
            return tryStream();
          }

          // 网络中断但重试耗尽，或切 Tab/锁屏，降级轮询
          if (isRetryable) {
            synthStreamActiveRef.current = false;
            console.warn('[useHomeFlow] synthesis stream retries exhausted, falling back to polling');
            updateAgent('synthesis', {
              status: 'running',
              progress: Math.min(synthProgressRef.current, 90),
              message: '网络波动，等待结果中...',
            });
            startPollingRef.current?.(planId);
            return;
          }

          synthStreamActiveRef.current = false;
          console.error('[useHomeFlow] synthesis stream error:', err);
          dispatch({ type: 'SET_ERROR', error: '行程汇总失败，请重试' });
        }
      };

      await tryStream();
    },
    [updateAgent, appendStream, setItinerary, setPlanId, setComplete]
  );

  /* 启动轮询 — 可被 runPlanning 和刷新恢复共用 */
  const startPollingForPlan = useCallback(
    (planId: string) => {
      stopPolling();
      synthProgressRef.current = 0;

      // 重置轮询状态
      pollStateRef.current = {
        retries: 0,
        maxRetries: 30, // 30 × 2.5s = 75 seconds
        timeout: 8000, // 8 second timeout per request
        startTime: Date.now(),
        lastUpdateTime: Date.now(),
        staleWarningShown: false,
        slowWarningShown: false,
        longerWarningShown: false,
      };

      pollIntervalRef.current = setInterval(async () => {
        const pollState = pollStateRef.current;
        const now = Date.now();
        const elapsedSinceStart = now - pollState.startTime;

        // ===== 检查 1: 总超时 (3 分钟) =====
        if (elapsedSinceStart > 180000) {
          stopPolling();
          dispatch({
            type: 'SET_ERROR',
            error: '行程生成超时（3分钟），请检查网络连接后重试',
          });
          return;
        }

        // ===== 检查 2: 重试次数超限 (75 秒) =====
        if (pollState.retries >= pollState.maxRetries) {
          stopPolling();
          dispatch({
            type: 'SET_ERROR',
            error: '网络连接不稳定，请检查网络后重试',
          });
          return;
        }

        // ===== 检查 3: 30 秒警告 =====
        if (elapsedSinceStart > 30000 && !pollState.slowWarningShown) {
          pollState.slowWarningShown = true;
          dispatch({ type: 'SET_WARNING', warning: 'slow-processing' });
          console.warn(`[useHomeFlow] Plan ${planId} processing slowly (30s+)`);
        }

        // ===== 检查 4: 90 秒警告 =====
        if (elapsedSinceStart > 90000 && !pollState.longerWarningShown) {
          pollState.longerWarningShown = true;
          dispatch({ type: 'SET_WARNING', warning: 'taking-longer' });
          console.warn(
            `[useHomeFlow] Plan ${planId} taking longer than expected (90s+)`
          );
        }

        // ===== 检查 5: 30 秒无更新警告 (用于调试) =====
        if (
          now - pollState.lastUpdateTime > 30000 &&
          !pollState.staleWarningShown
        ) {
          pollState.staleWarningShown = true;
          console.warn(`[useHomeFlow] Plan ${planId} has no update for 30s`);
        }

        try {
          // ===== 使用 AbortController 设置请求超时 =====
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            pollState.timeout
          );

          const detail = await fetch(`/api/plans/${planId}`, {
            signal: controller.signal,
            headers: { 'x-device-id': getDeviceId() },
          }).then((r) => (r.ok ? r.json() : null));

          clearTimeout(timeoutId);

          if (!detail?.plan) {
            // 没有有效数据，递增重试计数
            pollState.retries++;
            return;
          }

          // ===== 成功获取有效数据，重置重试计数 =====
          pollState.retries = 0;
          pollState.lastUpdateTime = now;
          pollState.staleWarningShown = false;

          const plan = detail.plan;
          const progress = plan.agent_progress as Record<
            string,
            { status: string; preview: string }
          > | null;

          if (progress) {
            Object.entries(progress).forEach(([agentId, state]) => {
              if (agentId === 'synthesis') return;
              if (state.status === 'done') {
                updateAgent(agentId as AgentId, {
                  status: 'done',
                  progress: 100,
                  message: '✓ 完成',
                  preview: state.preview ?? '',
                });
              } else if (state.status === 'running' && state.preview) {
                // 把 DB 里的流式进度文字同步到 UI
                updateAgent(agentId as AgentId, {
                  status: 'running',
                  preview: state.preview,
                });
              } else if (state.status === 'error') {
                updateAgent(agentId as AgentId, {
                  status: 'error',
                  progress: 100,
                  message: '执行失败',
                });
              }
            });
            const synth = progress.synthesis;
            if (synth?.status === 'waiting' && !synthStreamActiveRef.current) {
              // 4 个并行 agent 全部完成，前端主动发起 synthesis 流式请求
              synthStreamActiveRef.current = true;
              stopPolling();
              updateAgent('synthesis', {
                status: 'running',
                progress: 0,
                message: '整合行程中...',
                streamChunk: '',
              });
              // 异步启动流式 synthesis，不阻塞轮询
              void runSynthesisStream(planId);
            } else if (synth?.status === 'running') {
              synthProgressRef.current = Math.min(
                synthProgressRef.current + 3,
                95
              );
              updateAgent('synthesis', {
                status: 'running',
                progress: synthProgressRef.current,
                message: '整合行程中...',
              });
            } else if (synth?.status === 'done') {
              updateAgent('synthesis', {
                status: 'done',
                progress: 100,
                message: '✓ 行程生成完成',
              });
            } else if (!synth || synth.status === 'idle') {
              const parallelDone = ['poi', 'route', 'tips', 'xhs'].every(
                (id) =>
                  progress[id]?.status === 'done' ||
                  progress[id]?.status === 'error'
              );
              if (parallelDone)
                updateAgent('synthesis', {
                  status: 'running',
                  progress: 0,
                  message: '整合行程中...',
                });
            }
          }

          if (plan.status === 'done' && plan.itinerary) {
            stopPolling();
            setItinerary(JSON.stringify(plan.itinerary));
            setPlanId(planId);
            updateAgent('synthesis', {
              status: 'done',
              progress: 100,
              message: '✓ 行程生成完成',
            });
            setComplete(`plan-${planId}`);
            dispatch({ type: 'PLANNING_DONE' });
          } else if (plan.status === 'error' || plan.status === 'interrupted') {
            stopPolling();
            dispatch({ type: 'SET_ERROR', error: '行程生成失败，请重试' });
          }
        } catch (err) {
          // ===== 错误处理 =====
          if (err instanceof Error && err.name === 'AbortError') {
            pollState.retries++;
            console.warn(
              `[useHomeFlow] Request timeout for plan ${planId}, retry ${pollState.retries}/${pollState.maxRetries}`
            );
          } else {
            pollState.retries++;
            console.warn(
              `[useHomeFlow] Polling error for plan ${planId}:`,
              err
            );
          }
        }
      }, 2500);
    },
    [
      updateAgent,
      setItinerary,
      setPlanId,
      setComplete,
      stopPolling,
      runSynthesisStream,
    ]
  );

  const runPlanning = useCallback(
    async (
      params: {
        originCode: string;
        destinationCode: string;
        startDate: string;
        endDate: string;
        finalPrompt: string;
      },
      planId: string
    ) => {
      abortRef.current = new AbortController();

      try {
        // 先初始化 UI 状态 + 启动轮询，让用户立即看到进度
        const agentIds: AgentId[] = ['poi', 'route', 'tips', 'xhs'];
        agentIds.forEach((id) =>
          updateAgent(id, {
            status: 'running',
            progress: 0,
            message: 'AI 处理中...',
          })
        );
        startPollingForPlan(planId);

        // 发起规划请求（Vercel 上同步等待所有 Agent 完成，本地也兼容）
        const res = await fetch('/api/agents/orchestrate-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            planId,
            originCode: params.originCode,
            destinationCode: params.destinationCode,
            startDate: params.startDate,
            endDate: params.endDate,
            prompt: params.finalPrompt,
          }),
        });
        if (!res.ok) throw new Error(`规划失败 (${res.status})`);
      } catch (err) {
        stopPolling();
        if ((err as Error).name === 'AbortError') return;
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
        fetch(`/api/plans/${planId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'error' }),
        }).catch((e) => console.warn('[useHomeFlow] Failed to mark plan as error:', e));
      }
    },
    [updateAgent, startPollingForPlan, stopPolling]
  );

  // 始终保持 ref 指向最新的 runPlanning / startPollingForPlan
  runPlanningRef.current = runPlanning;
  startPollingRef.current = startPollingForPlan;

  /* ─────────────────────────────────────────────────────────
     页面加载：从 DB 恢复状态
     - pending → 恢复表单 + 继续轮询规划进度
     - 其他状态 → 仅恢复表单填写内容（不进入规划流程）
  ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const deviceId = getDeviceId();
    if (!deviceId) return;

    fetch(`/api/plans?deviceId=${encodeURIComponent(deviceId)}&page=1&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (!data?.plans?.length) return;
        const latest = data.plans[0];

        // 取完整 plan 拿 planning_params
        const detail = await fetch(`/api/plans/${latest.id}`, {
          headers: { 'x-device-id': deviceId },
        }).then((r) =>
          r.ok ? r.json() : null
        );
        const pp = detail?.plan?.planning_params as
          | Record<string, unknown>
          | null
          | undefined;

        // ── 恢复表单填写内容 ──
        if (pp) {
          // 城市：优先用存储的完整对象，fallback 用 code 反查
          const originCity =
            (pp.origin as import('@/lib/stores/searchStore').CityOption | null) ??
            findCityByCode((pp.originCode as string) ?? '') ?? null;
          const destinationCity =
            (pp.destination as import('@/lib/stores/searchStore').CityOption | null) ??
            findCityByCode((pp.destinationCode as string) ?? '') ?? null;

          const restorable: Partial<SearchParams> = {
            origin:        originCity,
            destination:   destinationCity,
            startDate:     (pp.startDate     as string) || '',
            endDate:       (pp.endDate       as string) || '',
            prompt:        (pp.prompt        as string) || '',
            travelers:     (pp.travelers     as number) ?? 1,
            hotelPOI:      (pp.hotelPOI      as import('@/lib/stores/searchStore').PlacePOI | null) ?? null,
            mustVisit:     (pp.mustVisit     as import('@/lib/stores/searchStore').PlacePOI[]) ?? [],
            mustAvoid:     (pp.mustAvoid     as import('@/lib/stores/searchStore').PlacePOI[]) ?? [],
            arrivalTime:   (pp.arrivalTime   as string) || '',
            departureTime: (pp.departureTime as string) || '',
          };

          if (latest.status === 'pending') {
            // pending 状态：自动恢复（用户本来就在规划中，需要无感继续）
            restoreSearchParams(restorable);
          } else {
            // done/error/interrupted：不自动填，把数据暂存，等用户主动点击恢复
            setPendingRestore(restorable);
          }
        }

        // ── pending：继续规划 ──
        if (latest.status === 'pending' && pp) {
          // 恢复 finalPrompt 到 state，让 PromptPreviewCard 有内容显示
          const savedFinalPrompt = (pp.finalPrompt as string) || ''
          if (savedFinalPrompt) {
            dispatch({ type: 'SET_FINAL_PROMPT', prompt: savedFinalPrompt })
          }
          const progress = detail?.plan?.agent_progress as Record<
            string,
            { status: string; preview: string }
          > | null

          // 判断是否需要重启：
          // orchestrate-bg 正常完成必然写 synthesis.status = 'waiting'
          // 两种需要重启的情况：
          // 1. synthesis 没到 waiting，且没有 agent 在 running → 明显卡死
          // 2. synthesis 没到 waiting，有 agent 还在 running，但 plan 已保存超过 5 分钟 → 僵尸状态
          const synthStatus = progress?.synthesis?.status
          const parallelAgents = ['poi', 'route', 'tips', 'xhs'] as const
          const hasRunningAgent = parallelAgents.some(id => progress?.[id]?.status === 'running')
          const synthTerminal = synthStatus === 'waiting' || synthStatus === 'running' || synthStatus === 'done'
          const savedAt = detail?.plan?.saved_at ? new Date(detail.plan.saved_at as string).getTime() : 0
          const isStale = Date.now() - savedAt > 5 * 60 * 1000  // 超过 5 分钟
          const needsRestart = !synthTerminal && (!hasRunningAgent || isStale)

          // 恢复 UI 进度展示
          if (progress) {
            Object.entries(progress).forEach(([agentId, state]) => {
              if (state.status === 'done') {
                updateAgent(agentId as AgentId, {
                  status: 'done',
                  progress: 100,
                  message: '✓ 完成',
                  preview: state.preview ?? '',
                });
              } else {
                // running / error / idle 都标为 running，因为我们会重新触发或继续轮询
                updateAgent(agentId as AgentId, {
                  status: 'running',
                  progress: 0,
                  message: 'AI 处理中...',
                });
              }
            })
          } else {
            const agentIds: AgentId[] = ['poi', 'route', 'tips', 'xhs']
            agentIds.forEach((id) =>
              updateAgent(id, { status: 'running', progress: 0, message: 'AI 处理中...' })
            )
          }

          activePlanId = latest.id
          dispatch({ type: 'START_PLANNING' })

          if (needsRestart) {
            // 进程异常中断，重新发起后台规划
            console.warn('[useHomeFlow] Plan stuck, restarting orchestrate-bg:', latest.id)
            fetch('/api/agents/orchestrate-bg', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                planId:          latest.id,
                originCode:      pp.originCode      as string,
                destinationCode: pp.destinationCode as string,
                startDate:       pp.startDate       as string,
                endDate:         pp.endDate         as string,
                prompt:          savedFinalPrompt || (pp.prompt as string) || '',
              }),
            }).catch((e) => console.warn('[useHomeFlow] Failed to restart orchestrate-bg:', e))
          }

          // 不管是否重启，都开始轮询（等待 synthesis waiting 信号）
          startPollingForPlan(latest.id)
        } else if (!pp) {
          // 无 planning_params 且 pending → 标记 error
          if (latest.status === 'pending') {
            fetch(`/api/plans/${latest.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'error' }),
            }).catch((e) => console.warn('[useHomeFlow] Failed to mark plan as error:', e));
          }
        }
        // done / interrupted / error → 只恢复表单，不进入规划流程
      })
      .catch((e) => {
        console.warn('[useHomeFlow] Failed to restore plan on mount:', e);
        /* 静默失败 */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 步骤 1：生成 Prompt 预览 ── */
  const generatePromptPreview = useCallback(
    async (params: {
      originCode: string;
      destinationCode: string;
      startDate: string;
      endDate: string;
      userPrompt: string;
      hotelName?: string;
      hotelAddress?: string;
      mustVisitNames?: string[];
      mustAvoidNames?: string[];
      originAirportName?: string;
      originAirportCode?: string;
      destAirportName?: string;
      destAirportCode?: string;
      arrivalTime?: string;
      departureTime?: string;
      travelers?: number;
    }) => {
      dispatch({ type: 'START_GENERATING' });
      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/agents/preview-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortRef.current.signal,
          body: JSON.stringify(params),
        });
        if (!res.ok) throw new Error(`生成失败 (${res.status})`);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response body');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          dispatch({
            type: 'APPEND_PROMPT',
            chunk: decoder.decode(value, { stream: true }),
          });
        }
        dispatch({ type: 'PROMPT_READY' });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    []
  );

  /* ── 步骤 2：用户编辑 Prompt ── */
  const setFinalPrompt = useCallback((prompt: string) => {
    dispatch({ type: 'SET_FINAL_PROMPT', prompt });
  }, []);

  /* ── 步骤 3：用户确认开始规划 ── */
  const startPlanning = useCallback(
    async (params: {
      originCode: string;
      destinationCode: string;
      startDate: string;
      endDate: string;
      finalPrompt: string;
      travelers?: number;
    }) => {
      // 先切换到 planning step，再清数据——避免「done + itinerary=null」短暂触发失败 UI
      dispatch({ type: 'START_PLANNING' });
      clearItinerary();
      resetAgents();
      synthStreamActiveRef.current = false;

      // 立即在 DB 创建 pending 记录（含完整表单参数，用于刷新恢复）
      const deviceId = getDeviceId();
      let planId = `plan-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      // 读取完整 searchStore params，一并存入 planningParams
      const searchParams = useSearchStore.getState().params;

      if (deviceId) {
        try {
          const res = await fetch('/api/plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceId,
              status: 'pending',
              planningParams: {
                ...params,
                // 完整表单字段（城市对象、机场、航班时间、酒店、必经地点等）
                origin: searchParams.origin,
                destination: searchParams.destination,
                prompt: searchParams.prompt,
                hotelPOI: searchParams.hotelPOI,
                mustVisit: searchParams.mustVisit,
                mustAvoid: searchParams.mustAvoid,
                arrivalTime: searchParams.arrivalTime,
                departureTime: searchParams.departureTime,
              },
            }),
          });
          if (res.ok) {
            const { id } = await res.json();
            planId = id;
          }
        } catch {
          /* 静默失败 */
        }
      }

      activePlanId = planId;
      await runPlanning(params, planId);
    },
    [clearItinerary, resetAgents, runPlanning]
  );

  /* ── 中断生成（planning 步骤中）→ 回到 prompt-preview ── */
  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    synthStreamActiveRef.current = false;
    stopPolling();
    resetAgents();
    // 不清 itinerary / finalPrompt，回到预览让用户重新确认或修改
    dispatch({ type: 'INTERRUPT_TO_PREVIEW' });
    if (activePlanId) {
      fetch(`/api/plans/${activePlanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'interrupted' }),
      }).catch((e) => console.warn('[useHomeFlow] Failed to mark plan as interrupted:', e));
      activePlanId = null;
    }
  }, [resetAgents, stopPolling]);

  /* ── 返回重新规划（done/form 步骤）── */
  const goBack = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    synthStreamActiveRef.current = false;
    stopPolling();
    dispatch({ type: 'RESET' });
    clearItinerary();
    resetAgents();
    if (activePlanId) {
      fetch(`/api/plans/${activePlanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'error' }),
      }).catch((e) => console.warn('[useHomeFlow] Failed to mark plan as error on goBack:', e));
      activePlanId = null;
    }
  }, [clearItinerary, resetAgents, stopPolling]);

  /* ── 生成失败后重试（保留表单数据，只重置步骤）── */
  const retryAfterFailure = useCallback(() => {
    synthStreamActiveRef.current = false;
    stopPolling();
    resetAgents();
    clearItinerary();
    dispatch({ type: 'RESET' });
    // 不清空 searchStore，保留用户填写的表单
  }, [stopPolling, resetAgents, clearItinerary]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    stopPolling();
    dispatch({ type: 'RESET' });
    resetAgents();
    clearItinerary();
  }, [resetAgents, clearItinerary, stopPolling]);

  const confirmRestore = useCallback(() => {
    if (pendingRestore) {
      restoreSearchParams(pendingRestore);
      setPendingRestore(null);
    }
  }, [pendingRestore, restoreSearchParams]);

  return {
    ...state,
    generatePromptPreview,
    setFinalPrompt,
    startPlanning,
    interrupt,
    retryAfterFailure,
    reset,
    goBack,
    pendingRestore,
    confirmRestore,
    dismissRestore: () => setPendingRestore(null),
  };
}
