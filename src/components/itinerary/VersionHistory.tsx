'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, RotateCcw, Clock } from 'lucide-react'
import { Spin } from 'antd'

interface PlanVersion {
  id: number
  plan_id: string
  version_number: number
  itinerary: Record<string, unknown>
  change_type: 'initial' | 'refine' | 'manual_edit'
  change_description?: string
  created_at: string
}

interface VersionHistoryProps {
  planId: string
  onRevert?: (versionNumber: number) => Promise<void>
  onVersionSelect?: (version: PlanVersion) => void
}

export function VersionHistory({
  planId,
  onRevert,
  onVersionSelect,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<PlanVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [reverting, setReverting] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchVersions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/plans/${planId}/versions`)
      if (!res.ok) throw new Error('Failed to fetch versions')
      const data = await res.json()
      setVersions(data.versions ?? [])
    } catch (err) {
      console.error('Error fetching versions:', err)
      setError('加载版本历史失败')
    } finally {
      setLoading(false)
    }
  }, [planId])

  useEffect(() => {
    if (expanded) {
      fetchVersions()
    }
  }, [expanded, fetchVersions])

  const handleRevert = async (versionNumber: number) => {
    if (!onRevert) return
    setReverting(versionNumber)
    try {
      await onRevert(versionNumber)
      await fetchVersions()
    } catch (err) {
      console.error('Error reverting version:', err)
      setError('回滚失败')
    } finally {
      setReverting(null)
    }
  }

  const changeTypeLabel: Record<string, string> = {
    initial: '初始版本',
    refine: '精细微调',
    manual_edit: '手动编辑',
  }

  const changeTypeColor: Record<string, string> = {
    initial: '#3B82F6',
    refine: '#8B5CF6',
    manual_edit: '#EC4899',
  }

  const latestVersion = versions[0]

  return (
    <div className="rounded-lg border" style={{ borderColor: '#E5E7EB' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:bg-gray-50"
        style={{ background: '#FAFAFA' }}
      >
        <div className="flex items-center gap-2">
          <Clock size={16} style={{ color: '#64748B' }} />
          <span className="font-medium text-sm" style={{ color: '#0F172A' }}>
            版本历史
          </span>
          {latestVersion && (
            <span className="text-xs" style={{ color: '#94A3B8' }}>
              版本 {latestVersion.version_number}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          style={{
            color: '#64748B',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t overflow-hidden"
            style={{ borderColor: '#E5E7EB' }}
          >
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {error && (
                <div
                  className="p-3 rounded-lg text-xs"
                  style={{
                    background: '#FEE2E2',
                    color: '#991B1B',
                    border: '1px solid #FECACA',
                  }}
                >
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-4">
                  <Spin size="small" />
                </div>
              ) : versions.length === 0 ? (
                <p className="text-xs text-center" style={{ color: '#94A3B8' }}>
                  暂无版本历史
                </p>
              ) : (
                versions.map((version, index) => {
                  const isLatest = index === 0
                  const isCurrent = !isLatest && index === versions.length - 1
                  const createdDate = new Date(version.created_at).toLocaleString(
                    'zh-CN',
                    {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    },
                  )

                  return (
                    <motion.div
                      key={version.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-lg border transition-all cursor-pointer"
                      style={{
                        borderColor: isLatest ? '#BFDBFE' : '#E5E7EB',
                        background: isLatest ? '#EFF6FF' : '#FFFFFF',
                      }}
                      onClick={() => onVersionSelect?.(version)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                            style={{
                              background: changeTypeColor[version.change_type] + '20',
                              color: changeTypeColor[version.change_type],
                            }}
                          >
                            {changeTypeLabel[version.change_type]}
                          </span>
                          <span
                            className="text-xs font-mono"
                            style={{ color: '#64748B' }}
                          >
                            v{version.version_number}
                          </span>
                        </div>
                        {isLatest && (
                          <span
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{
                              background: '#D1FAE5',
                              color: '#065F46',
                            }}
                          >
                            最新
                          </span>
                        )}
                      </div>

                      <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>
                        {createdDate}
                      </p>

                      {version.change_description && (
                        <p className="text-xs mb-2" style={{ color: '#475569' }}>
                          {version.change_description}
                        </p>
                      )}

                      {!isLatest && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRevert(version.version_number)
                          }}
                          disabled={reverting === version.version_number}
                          className="text-xs font-medium flex items-center gap-1 transition-all"
                          style={{
                            color:
                              reverting === version.version_number
                                ? '#94A3B8'
                                : '#2563EB',
                            cursor:
                              reverting === version.version_number
                                ? 'not-allowed'
                                : 'pointer',
                            opacity: reverting === version.version_number ? 0.6 : 1,
                          }}
                        >
                          <RotateCcw size={12} />
                          {reverting === version.version_number ? '回滚中...' : '回滚到此版本'}
                        </button>
                      )}
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
