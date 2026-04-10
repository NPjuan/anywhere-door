
import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { tipsSystemPrompt } from '@/lib/agents/prompts'
import { ContentAgentOutputSchema } from '@/lib/agents/types'

export const maxDuration = 300

/* Agent 4 — 旅行贴士生成（重命名 content → tips）/ Travel tips generation */
export async function POST(req: NextRequest) {
  const { destination, travelStyle, highlights, days } = await req.json()

  try {
    const { object } = await generateObject({
      model:  getAIProvider(),
      system: tipsSystemPrompt(destination, travelStyle ?? highlights?.join('、') ?? ''),
      prompt: `为 ${destination} ${days} 天旅行生成打包建议和注意事项`,
      schema: ContentAgentOutputSchema,
    })

    return NextResponse.json(object)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
