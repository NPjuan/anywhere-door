'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { RefreshCw } from 'lucide-react'

/* ============================================================
   ErrorBoundary — 全局错误边界
   Global error boundary

   捕获子树中的 React 渲染错误，显示友好错误页
   Catches React render errors in subtree, shows friendly error UI
   ============================================================ */

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?:   Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          className="min-h-[300px] flex flex-col items-center justify-center gap-4 p-8 rounded-[var(--radius-xl)] text-center"
          style={{
            background:     'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(16px)',
            border:         '1px solid rgba(255,255,255,0.65)',
          }}
          role="alert"
          aria-live="assertive"
        >
          {/* 传送门故障图示 / Portal malfunction illustration */}
          <div
            className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: 'var(--color-error)', borderStyle: 'dashed' }}
            aria-hidden="true"
          >
            <span className="text-2xl font-bold" style={{ color: 'var(--color-error)' }}>!</span>
          </div>

          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
              传送门出现了故障
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Portal Malfunction — Something went wrong
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre
                className="mt-2 text-xs text-left p-3 rounded-[var(--radius-md)] overflow-auto max-h-32"
                style={{ background: 'rgba(239,68,68,0.06)', color: 'var(--color-error)' }}
              >
                {this.state.error.message}
              </pre>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            重试 Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
