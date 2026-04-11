import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { TechBackground as LightBackground } from '@/components/portal/AuroraBackground'
import { PlanDetailClient } from './PlanDetailClient'
import { supabase } from '@/lib/supabase'
import type { FullItinerary } from '@/lib/agents/types'

/* ============================================================
   /plans/[id] — Server Component
   - generateMetadata: 输出 OG 信息供链接预览
   - 服务端直接查 Supabase，避免 HTTP 自调用 URL 拼接问题
   ============================================================ */

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchPlan(id: string) {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const plan = await fetchPlan(id)

  if (!plan?.itinerary) {
    return { title: '行程不存在 · 任意门' }
  }

  const it = plan.itinerary as FullItinerary
  const title    = it.title    ?? '旅行行程'
  const summary  = it.summary  ?? '由任意门 AI 生成的旅行行程'
  const dest     = it.destination ?? ''
  const days     = it.days?.length ?? 0
  const budgetLow  = it.budget?.low
  const budgetHigh = it.budget?.high
  const budgetText = budgetLow && budgetHigh ? ` · 预算 ¥${budgetLow}–${budgetHigh}` : ''

  const description = `${dest}${days ? ` · ${days}天` : ''}${budgetText} — ${summary}`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://anywhere-door.vercel.app'

  return {
    title:       `${title} · 任意门`,
    description,
    openGraph: {
      type:        'website',
      title:       `${title} · 任意门 AI 旅行规划`,
      description,
      url:         `${appUrl}/plans/${id}`,
      siteName:    '任意门 Anywhere Door',
      locale:      'zh_CN',
    },
    twitter: {
      card:        'summary',
      title:       `${title} · 任意门`,
      description,
    },
  }
}

export default async function PlanDetailPage({ params }: PageProps) {
  const { id } = await params
  const plan = await fetchPlan(id)

  if (!plan) {
    return (
      <main className="relative min-h-screen flex items-center justify-center" style={{ background: '#F8FAFF' }}>
        <LightBackground />
        <div className="relative text-center" style={{ zIndex: 1 }}>
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: '#EF4444' }} />
          <p className="font-medium mb-1" style={{ color: '#475569' }}>计划不存在或已删除</p>
          <Link href="/plans" className="text-sm" style={{ color: '#2563EB' }}>← 返回计划列表</Link>
        </div>
      </main>
    )
  }

  if (!plan.itinerary) notFound()

  return (
    <PlanDetailClient
      id={id}
      it={plan.itinerary as FullItinerary}
      savedAt={plan.saved_at ?? ''}
      ownerDeviceId={plan.device_id ?? ''}
    />
  )
}
