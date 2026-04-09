'use client'

import { Mentions } from 'antd'
import { useRef, useEffect, useCallback } from 'react'
import type { DayPlan, Activity } from '@/lib/agents/types'

interface RefineInputProps {
  dayPlans:     DayPlan[]
  value:        string
  onChange:     (text: string) => void
  insertRef?:   React.MutableRefObject<((activity: Activity, dayIndex: number) => void) | null>
  placeholder?: string
  rows?:        number
}

function makeMentionLabel(activity: Activity, dayIndex: number) {
  return `Day${dayIndex + 1}·${activity.time}·${activity.name}`
}

function getAllActivities(dayPlans: DayPlan[]) {
  return dayPlans.flatMap((day, dayIndex) =>
    [...(day.morning ?? []), ...(day.afternoon ?? []), ...(day.evening ?? [])]
      .map((activity) => ({
        activity,
        dayIndex,
        label: makeMentionLabel(activity, dayIndex),
      }))
  )
}

export function RefineInput({
  dayPlans,
  value,
  onChange,
  insertRef,
  placeholder = '描述调整需求，输入 @ 搜索并引用行程地点...',
  rows = 3,
}: RefineInputProps) {
  const mentionsRef = useRef<any>(null)
  const allActivities = getAllActivities(dayPlans)

  const insertMention = useCallback((activity: Activity, dayIndex: number) => {
    const label = makeMentionLabel(activity, dayIndex)
    const textarea = mentionsRef.current?.textarea
    if (textarea) {
      const start = textarea.selectionStart ?? value.length
      const insert = `@${label} `
      onChange(value.slice(0, start) + insert + value.slice(start))
      setTimeout(() => {
        textarea.focus()
        const pos = start + insert.length
        textarea.setSelectionRange(pos, pos)
      }, 0)
    } else {
      onChange(value + ` @${label} `)
    }
  }, [value, onChange])

  useEffect(() => {
    if (insertRef) insertRef.current = insertMention
  }, [insertRef, insertMention])

  return (
    <Mentions
      ref={mentionsRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      autoSize={{ minRows: rows, maxRows: 8 }}
      prefix="@"
      variant="outlined"
      options={allActivities.map(({ label }) => ({
        value: label,
        label: (
          <div className="flex items-center gap-2 py-0.5">
            <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{ background: '#EFF6FF', color: '#2563EB' }}>
              {label.split('·')[0]}
            </span>
            <span className="text-xs font-mono shrink-0" style={{ color: '#2563EB' }}>
              {label.split('·')[1]}
            </span>
            <span className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>
              {label.split('·').slice(2).join('·')}
            </span>
          </div>
        ),
      }))}
      filterOption={(input, option) =>
        typeof option?.value === 'string' &&
        option.value.toLowerCase().includes(input.toLowerCase())
      }
      style={{ width: '100%', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}
    />
  )
}
