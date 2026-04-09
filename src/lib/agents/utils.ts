/* ============================================================
   AI Provider 工厂函数
   AI Provider factory — DeepSeek default, Claude fallback
   ============================================================ */

export type AIProvider = 'deepseek' | 'claude'

export function getAIProvider() {
  const provider = (process.env.AI_PROVIDER ?? 'deepseek') as AIProvider

  if (provider === 'claude') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createAnthropic } = require('@ai-sdk/anthropic')
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })('claude-haiku-4-5')
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createDeepSeek } = require('@ai-sdk/deepseek')
  return createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY })('deepseek-chat')
}
