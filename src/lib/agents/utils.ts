/* ============================================================
   AI Provider 工厂函数
   AI Provider factory — DeepSeek default, Zhipu / Claude optional
   ============================================================ */

import { createDeepSeek } from '@ai-sdk/deepseek'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { streamObject, streamText, type LanguageModel } from 'ai'
import type { ZodType, ZodTypeAny } from 'zod'
import type { DeepPartial } from 'ai'

export type AIProvider = 'deepseek' | 'deepseek-flash' | 'claude' | 'glm-4-flash' | 'glm-5-turbo' | 'glm-5' | 'glm-5.1'

/* ── 每个模型的专属配置 ────────────────────────────────────── */
interface ModelConfig {
  /** GLM 不支持 json_schema response_format，需走 streamText + 手动解析 */
  useTextFallback:  boolean
  /** temperature */
  temperature?:     number
  /** max output tokens */
  maxOutputTokens?: number
}

const MODEL_CONFIGS: Record<AIProvider, ModelConfig> = {
  'deepseek':       { useTextFallback: false, temperature: 0.7 },
  'deepseek-flash': { useTextFallback: false, temperature: 0.7 },
  'claude':         { useTextFallback: false, temperature: 0.7 },
  'glm-4-flash': { useTextFallback: true,  temperature: 0.8, maxOutputTokens: 4096  },
  'glm-5-turbo': { useTextFallback: true,  temperature: 0.7, maxOutputTokens: 8192  },
  'glm-5':       { useTextFallback: true,  temperature: 0.6, maxOutputTokens: 8192  },
  'glm-5.1':     { useTextFallback: true,  temperature: 0.6, maxOutputTokens: 16384 },
}

function resolveProvider(override?: AIProvider): AIProvider {
  return override ?? (process.env.AI_PROVIDER ?? 'deepseek') as AIProvider
}

export function getModelConfig(override?: AIProvider): ModelConfig {
  return MODEL_CONFIGS[resolveProvider(override)] ?? MODEL_CONFIGS['deepseek']
}

export function getAIProvider(override?: AIProvider): LanguageModel {
  const provider = resolveProvider(override)

  if (provider === 'claude') {
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })('claude-haiku-4-5')
  }

  if (provider.startsWith('glm')) {
    return createOpenAI({
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey:  process.env.ZHIPU_API_KEY,
    }).chat(provider)
  }

  // deepseek-flash — V4 Flash 轻量快速模型
  if (provider === 'deepseek-flash') {
    return createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY })('deepseek-v4-flash')
  }

  // deepseek（默认）— V4 Pro 旗舰模型
  return createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY })('deepseek-v4-pro')
}

/* ── 从 Zod schema 生成示例结构（注入 GLM system prompt 用）── */
export function zodToExample(schema: ZodTypeAny): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def = (schema as any)._def as Record<string, unknown>
  const type = (def.type ?? def.typeName) as string | undefined

  if (type === 'string')   return '示例文本'
  if (type === 'number')   return 0
  if (type === 'boolean')  return false
  if (type === 'optional' || type === 'nullable') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inner = (schema as any).unwrap?.() ?? (def.innerType as ZodTypeAny)
    return inner ? zodToExample(inner) : null
  }
  if (type === 'array') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = (def.element ?? (schema as any).element) as ZodTypeAny | undefined
    return element ? [zodToExample(element)] : []
  }
  if (type === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (def.shape ?? (schema as any).shape) as Record<string, ZodTypeAny> | undefined
    if (!shape) return {}
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(shape)) result[k] = zodToExample(v)
    return result
  }
  return null
}

/* GLM system prompt 注入示例结构 */
export function patchSystemForGLM(system: string, schema: ZodTypeAny): string {
  const example = zodToExample(schema)
  return system
    + '\n\n只输出纯JSON对象，不能有任何markdown或代码块（禁止```）。必须严格按照以下示例的字段名和结构输出：\n'
    + JSON.stringify(example, null, 2)
}

/* ── 统一入口：自动选择 streamObject 或 GLM 兼容方案 ─────── */
export interface StreamObjectResult<T> {
  object:              Promise<T>
  partialObjectStream: AsyncIterable<DeepPartial<T>>
}

export async function unifiedStreamObject<T>(params: {
  schema:  ZodType<T>
  system:  string
  prompt:  string
  model?:  AIProvider
}): Promise<StreamObjectResult<T>> {
  const { schema, system, prompt, model: modelOverride } = params
  const cfg     = getModelConfig(modelOverride)
  const aiModel = getAIProvider(modelOverride)

  if (cfg.useTextFallback) {
    // GLM：streamText + 手动解析
    let resolveObj!: (v: T) => void
    let rejectObj!:  (e: unknown) => void
    const objectPromise = new Promise<T>((res, rej) => { resolveObj = res; rejectObj = rej })

    const fullSystem = patchSystemForGLM(system, schema as ZodTypeAny)

    const { textStream, text: textPromise } = streamText({
      model:           aiModel,
      system:          fullSystem,
      prompt,
      temperature:     cfg.temperature,
      maxOutputTokens: cfg.maxOutputTokens,
    })

    const t0 = Date.now()
    console.log(JSON.stringify({ path: 'glm-fallback', event: 'start', provider: resolveProvider(modelOverride) }))

    async function* makeStream(): AsyncIterable<DeepPartial<T>> {
      let buf = ''
      for await (const chunk of textStream) {
        buf += chunk
        try {
          const cleaned = buf.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
          yield JSON.parse(cleaned) as DeepPartial<T>
        } catch { /* 不完整，继续等 */ }
      }
      try {
        const fullText = await textPromise
        const ms = Date.now() - t0
        const cleaned  = fullText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
        const result = schema.parse(JSON.parse(cleaned))
        console.log(JSON.stringify({ path: 'glm-fallback', event: 'done', ms, chars: fullText.length }))
        resolveObj(result)
      } catch (e) {
        const ms = Date.now() - t0
        const errMsg = e instanceof Error ? e.message : String(e)
        console.error(JSON.stringify({ path: 'glm-fallback', event: 'error', ms, error: errMsg }))
        rejectObj(e)
      }
    }

    return { object: objectPromise, partialObjectStream: makeStream() }
  }

  // DeepSeek / Claude：原生 streamObject
  const result = streamObject({
    model:           aiModel,
    schema,
    system,
    prompt,
    temperature:     cfg.temperature,
    maxOutputTokens: cfg.maxOutputTokens,
  })
  return { object: result.object as Promise<T>, partialObjectStream: result.partialObjectStream as AsyncIterable<DeepPartial<T>> }
}
