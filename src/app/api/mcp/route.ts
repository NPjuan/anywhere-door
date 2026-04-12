/* ============================================================
   MCP HTTP Endpoint
   GET/POST/DELETE /api/mcp
   使用 WebStandardStreamableHTTPServerTransport（原生 Web API）
   ============================================================ */

import { NextRequest } from 'next/server'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'crypto'
import { createMcpServer } from '@/lib/mcp/server'

export const maxDuration = 300

// 全局会话 Map（Vercel 单实例内有效）
const transports = new Map<string, WebStandardStreamableHTTPServerTransport>()

async function getOrCreateTransport(req: NextRequest): Promise<{
  transport: WebStandardStreamableHTTPServerTransport
  isNew: boolean
}> {
  const sessionId = req.headers.get('mcp-session-id')

  if (sessionId && transports.has(sessionId)) {
    return { transport: transports.get(sessionId)!, isNew: false }
  }

  // 新会话：只允许 initialize 请求
  if (sessionId) {
    throw new Error('INVALID_SESSION')
  }

  const body = await req.clone().json().catch(() => null)
  if (!body || !isInitializeRequest(body)) {
    throw new Error('NOT_INITIALIZE')
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sid) => {
      console.log(JSON.stringify({ event: 'mcp-session-init', sessionId: sid }))
      transports.set(sid, transport)
    },
    onsessionclosed: (sid) => {
      console.log(JSON.stringify({ event: 'mcp-session-close', sessionId: sid }))
      transports.delete(sid)
    },
  })

  const server = createMcpServer()
  await server.connect(transport)

  return { transport, isNew: true }
}

export async function POST(req: NextRequest) {
  try {
    const { transport } = await getOrCreateTransport(req)
    return transport.handleRequest(req)
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_SESSION') {
      return new Response(
        JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: '无效的 session ID' }, id: null }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    if (err instanceof Error && err.message === 'NOT_INITIALIZE') {
      return new Response(
        JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: '请先发送 initialize 请求' }, id: null }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    console.error('[mcp] POST error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.headers.get('mcp-session-id')
  if (!sessionId || !transports.has(sessionId)) {
    return new Response(
      JSON.stringify({ error: '无效的 session ID' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return transports.get(sessionId)!.handleRequest(req)
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.headers.get('mcp-session-id')
  if (!sessionId || !transports.has(sessionId)) {
    return new Response(
      JSON.stringify({ error: '无效的 session ID' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return transports.get(sessionId)!.handleRequest(req)
}
