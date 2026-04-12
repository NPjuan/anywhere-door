'use client'

import { useState } from 'react'
import { X, Code2 } from 'lucide-react'

const CONFIG_EXAMPLE = `{
  "mcpServers": {
    "anywhere-door": {
      "url": "https://anywhere-door-bice.vercel.app/api/mcp"
    }
  }
}`

const TOOLS = [
  { name: 'plan_quick',   desc: '快速模式：城市名+日期，自动匹配机场立即规划' },
  { name: 'plan_guided',  desc: '提问模式：仅需目的地，引导补充信息后规划' },
  { name: 'get_plan',     desc: '查询规划状态，建议等待 1-3 分钟后调用' },
  { name: 'search_city',  desc: '搜索城市代码（城市名无法匹配时使用）' },
]

export function MCPBadge() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(CONFIG_EXAMPLE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium transition-all"
        style={{
          padding:      '6px 10px',
          borderRadius: 8,
          border:       '1px solid #E2E8F0',
          background:   '#FFFFFF',
          color:        '#374151',
          boxShadow:    '0 2px 8px rgba(0,0,0,0.08)',
          cursor:       'pointer',
          whiteSpace:   'nowrap',
        }}
      >
        <Code2 size={13} style={{ color: '#2563EB' }} />
        MCP 接入
      </button>

      {/* 弹窗遮罩 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex flex-col"
            style={{
              width:        480,
              maxWidth:     'calc(100vw - 32px)',
              background:   '#FFFFFF',
              borderRadius: 14,
              boxShadow:    '0 20px 60px rgba(0,0,0,0.18)',
              overflow:     'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 头部 */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid #F1F5F9' }}
            >
              <div className="flex items-center gap-2">
                <Code2 size={18} style={{ color: '#2563EB' }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>MCP 接入说明</span>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: '2px 7px',
                  borderRadius: 20, background: '#EFF6FF', color: '#2563EB',
                }}>HTTP/SSE</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 内容 */}
            <div className="flex flex-col gap-4 px-5 py-4" style={{ overflowY: 'auto', maxHeight: '70vh' }}>

              {/* 端点 */}
              <div>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>MCP Endpoint</p>
                <div style={{
                  fontFamily: 'monospace', fontSize: 13, padding: '10px 14px',
                  background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', color: '#0F172A',
                }}>
                  https://anywhere-door-bice.vercel.app/api/mcp
                </div>
              </div>

              {/* 可用工具 */}
              <div>
                <p style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>可用工具</p>
                <div className="flex flex-col gap-2">
                  {TOOLS.map(t => (
                    <div key={t.name} className="flex items-center gap-3" style={{
                      padding: '8px 12px', background: '#F8FAFC',
                      borderRadius: 8, border: '1px solid #E2E8F0',
                    }}>
                      <code style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, minWidth: 120 }}>{t.name}</code>
                      <span style={{ fontSize: 12, color: '#64748B' }}>{t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 配置示例 */}
              <div>
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 12, color: '#64748B' }}>Claude Desktop 配置示例</p>
                  <button
                    onClick={handleCopy}
                    style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 6,
                      border: '1px solid #E2E8F0', background: copied ? '#F0FDF4' : '#F8FAFC',
                      color: copied ? '#16A34A' : '#64748B', cursor: 'pointer',
                    }}
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <pre style={{
                  fontFamily: 'monospace', fontSize: 12, padding: '12px 14px',
                  background: '#0F172A', borderRadius: 8, color: '#E2E8F0',
                  margin: 0, overflowX: 'auto', lineHeight: 1.6,
                }}>
                  {CONFIG_EXAMPLE}
                </pre>
              </div>

              {/* 使用说明 */}
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: '#EFF6FF', border: '1px solid #BFDBFE',
              }}>
                <p style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.7, margin: 0 }}>
                  支持 Cursor、Claude Desktop 等任意兼容 MCP 的客户端。<br />
                  推荐使用 <code style={{ fontWeight: 600 }}>plan_guided</code> 提问模式，只需告诉 AI 目的地即可开始。<br />
                  规划启动后请等待 <strong>1-3 分钟</strong>，再用 <code style={{ fontWeight: 600 }}>get_plan</code> 查询结果。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
