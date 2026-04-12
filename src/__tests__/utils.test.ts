import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getModelConfig, getAIProvider, zodToExample, patchSystemForGLM } from '@/lib/agents/utils'
import { z } from 'zod'

// mock 外部依赖，不实际发请求
vi.mock('@ai-sdk/deepseek', () => ({
  createDeepSeek: vi.fn(() => vi.fn(() => 'deepseek-model')),
}))
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => vi.fn(() => 'claude-model')),
}))
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({ chat: vi.fn(() => 'glm-model') })),
}))

describe('getModelConfig', () => {
  it('deepseek 不使用 text fallback', () => {
    const cfg = getModelConfig('deepseek')
    expect(cfg.useTextFallback).toBe(false)
    expect(cfg.temperature).toBe(0.7)
  })

  it('glm-4-flash 使用 text fallback', () => {
    const cfg = getModelConfig('glm-4-flash')
    expect(cfg.useTextFallback).toBe(true)
    expect(cfg.maxOutputTokens).toBe(4096)
  })

  it('glm-5.1 有最大 token 限制', () => {
    const cfg = getModelConfig('glm-5.1')
    expect(cfg.useTextFallback).toBe(true)
    expect(cfg.maxOutputTokens).toBe(16384)
  })

  it('未知模型降级到 deepseek 配置', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfg = getModelConfig('unknown-model' as any)
    expect(cfg.useTextFallback).toBe(false)
  })
})

describe('getAIProvider', () => {
  beforeEach(() => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-key')
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubEnv('ZHIPU_API_KEY', 'test-key')
  })

  it('deepseek 返回 deepseek 模型', () => {
    const model = getAIProvider('deepseek')
    expect(model).toBe('deepseek-model')
  })

  it('claude 返回 claude 模型', () => {
    const model = getAIProvider('claude')
    expect(model).toBe('claude-model')
  })

  it('glm-4-flash 返回 glm 模型', () => {
    const model = getAIProvider('glm-4-flash')
    expect(model).toBe('glm-model')
  })

  it('默认使用 deepseek', () => {
    vi.stubEnv('AI_PROVIDER', 'deepseek')
    const model = getAIProvider()
    expect(model).toBe('deepseek-model')
  })
})

describe('zodToExample', () => {
  it('string 类型生成示例文本', () => {
    expect(zodToExample(z.string())).toBe('示例文本')
  })

  it('number 类型生成 0', () => {
    expect(zodToExample(z.number())).toBe(0)
  })

  it('boolean 类型生成 false', () => {
    expect(zodToExample(z.boolean())).toBe(false)
  })

  it('array 类型生成单元素数组', () => {
    const result = zodToExample(z.array(z.string()))
    expect(Array.isArray(result)).toBe(true)
    expect((result as string[]).length).toBe(1)
    expect((result as string[])[0]).toBe('示例文本')
  })

  it('object 类型生成对应结构', () => {
    const schema = z.object({ name: z.string(), age: z.number() })
    const result = zodToExample(schema) as { name: string; age: number }
    expect(result.name).toBe('示例文本')
    expect(result.age).toBe(0)
  })

  it('嵌套 object + array', () => {
    const schema = z.object({
      pois: z.array(z.object({ name: z.string(), lat: z.number() }))
    })
    const result = zodToExample(schema) as { pois: Array<{ name: string; lat: number }> }
    expect(result.pois).toHaveLength(1)
    expect(result.pois[0].name).toBe('示例文本')
    expect(result.pois[0].lat).toBe(0)
  })

  it('optional 字段正确展开', () => {
    const result = zodToExample(z.string().optional())
    expect(result).toBe('示例文本')
  })
})

describe('patchSystemForGLM', () => {
  it('注入示例结构到 system prompt', () => {
    const schema = z.object({ title: z.string() })
    const result = patchSystemForGLM('你是旅行助手', schema)
    expect(result).toContain('你是旅行助手')
    expect(result).toContain('禁止```')
    expect(result).toContain('"title"')
    expect(result).toContain('示例文本')
  })

  it('注入内容包含完整 JSON 示例', () => {
    const schema = z.object({ days: z.array(z.string()) })
    const result = patchSystemForGLM('system', schema)
    // 确保示例是有效 JSON
    const jsonPart = result.split('输出：\n')[1]
    expect(() => JSON.parse(jsonPart)).not.toThrow()
  })
})
