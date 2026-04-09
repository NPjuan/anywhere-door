'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { DeepBackground }     from '@/components/portal/AuroraBackground'
import { PortalDoor }          from '@/components/portal/PortalDoor'
import { AgentStatusPanel }   from '@/components/agents/AgentStatusPanel'
import { useAgentStream }      from '@/hooks/useAgentStream'
import { useAgentStore }       from '@/lib/stores/agentStore'
import { useSearchStore }      from '@/lib/stores/searchStore'
import { Button }              from '@/components/ui/Button'
import { ArrowLeft }           from 'lucide-react'

export default function PlanContent() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const { params }    = useSearchStore()
  const { isComplete, sessionId, agents } = useAgentStore()
  const { startPlanning } = useAgentStream()

  useEffect(() => { startPlanning() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isComplete && sessionId) {
      const q = new URLSearchParams(searchParams.toString())
      q.set('session', sessionId)
      setTimeout(() => router.push(`/itinerary?${q}`), 800)
    }
  }, [isComplete, sessionId, router, searchParams])

  const synthAgent  = agents.find((a) => a.id === 'synthesis')
  const portalState = isComplete ? 'OPEN' : synthAgent?.status === 'running' ? 'SEARCHING' : 'IDLE'
  const destName    = params.destination?.name ?? searchParams.get('to') ?? '目的地'
  const origin      = params.origin?.name ?? searchParams.get('from') ?? '出发地'

  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: '#020B18' }}
    >
      <DeepBackground />

      <div className="relative w-full max-w-lg flex flex-col items-center gap-6" style={{ zIndex: 1 }}>
        <div className="w-full">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}
            onClick={() => router.back()}
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            返回
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }} className="text-center"
        >
          <h1 className="text-2xl font-bold" style={{ color: 'white' }}>
            {origin} → {destName}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            AI 正在为你规划专属行程
          </p>
        </motion.div>

        <PortalDoor state={portalState} ringColor="#38BDF8" size={200} />

        <div className="w-full"><AgentStatusPanel /></div>

        {isComplete && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-sm text-center" style={{ color: '#10B981' }}>
            行程规划完成，正在跳转...
          </motion.p>
        )}
      </div>
    </main>
  )
}
