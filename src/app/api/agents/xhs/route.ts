import { NextRequest, NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { getAIProvider } from '@/lib/agents/utils'
import { xhsSystemPrompt } from '@/lib/agents/prompts'
import { XHSAgentOutputSchema } from '@/lib/agents/types'

/* ============================================================
   XHS Agent — 小红书风格笔记生成
   XHS-style travel notes generation

   通过 AI 模拟小红书博主创作旅行攻略笔记
   Simulates XHS blogger creating travel guide notes via AI
   无需真实 API，合规稳定
   No real API needed — AI simulation, fully compliant
   ============================================================ */

export async function POST(req: NextRequest) {
  const { destination, prompt, days } = await req.json()

  try {
    const { object } = await generateObject({
      model:  getAIProvider(),
      system: xhsSystemPrompt(destination, prompt, days),
      prompt: `为 ${destination} ${days} 天旅行生成 3-4 篇小红书风格攻略笔记，完全贴合用户诉求：${prompt}`,
      schema: XHSAgentOutputSchema,
    })

    return NextResponse.json(object)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[XHS Agent]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
