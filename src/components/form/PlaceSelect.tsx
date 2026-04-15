'use client'

import { useState, useRef, useCallback } from 'react'
import { Select, Spin } from 'antd'
import { MapPin } from 'lucide-react'
import type { PlacePOI } from '@/lib/stores/searchStore'

/* ============================================================
   PlaceSelect — 高德地点搜索选择器
   单选（hotel）或多选（mustVisit / mustAvoid）
   ============================================================ */

export type { PlacePOI }

interface PlaceSelectProps {
  mode?:        'single' | 'multiple'
  value?:       PlacePOI | PlacePOI[] | null
  onChange?:    (v: PlacePOI | PlacePOI[] | null) => void
  placeholder?: string
  city?:        string    // 限定搜索城市（传目的地城市名）
  country?:     string    // 目的地国家（用于判断海外搜索策略）
}

export function PlaceSelect({
  mode = 'single',
  value,
  onChange,
  placeholder = '搜索地点...',
  city = '',
  country = '中国',
}: PlaceSelectProps) {
  const [options, setOptions]   = useState<{ value: string; label: React.ReactNode; poi: PlacePOI }[]>([])
  const [loading, setLoading]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* 把已选中的 POI 转为 option 格式（用于初始回显） */
  const makeOption = (p: PlacePOI) => ({
    value: p.id,
    poi:   p,
    label: (
      <div className="flex flex-col py-0.5">
        <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{p.name}</span>
        <span className="text-xs truncate" style={{ color: '#94A3B8' }}>
          {p.cityname}{p.address ? ` · ${p.address}` : ''}
        </span>
      </div>
    ),
  })

  /* 合并已选中的 POI 和搜索结果，确保已选项始终可渲染 */
  const selectedPOIs: PlacePOI[] = mode === 'multiple'
    ? (value as PlacePOI[] | null) ?? []
    : (value as PlacePOI | null) ? [(value as PlacePOI)] : []
  const selectedIds = new Set(selectedPOIs.map((p) => p.id))
  const mergedOptions = [
    ...selectedPOIs.map(makeOption),
    ...options.filter((o) => !selectedIds.has(o.poi.id)),
  ]

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setOptions([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ q, city, country })
        const res  = await fetch(`/api/amap/search?${params}`)
        const data = await res.json() as { pois: PlacePOI[] }

        setOptions((data.pois ?? []).map(makeOption))
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }, [city, country])

  /* 把 antd value（id string）映射回 PlacePOI */
  const antdValue = (() => {
    if (mode === 'multiple') {
      return (value as PlacePOI[] | null)?.map((p) => p.id) ?? []
    }
    return (value as PlacePOI | null)?.id ?? null
  })()

  const handleChange = (ids: string | string[]) => {
    if (mode === 'multiple') {
      const selected = (ids as string[])
        .map((id) => mergedOptions.find((o) => o.poi.id === id)?.poi)
        .filter(Boolean) as PlacePOI[]
      onChange?.(selected)
    } else {
      const found = mergedOptions.find((o) => o.poi.id === ids)?.poi ?? null
      onChange?.(found)
    }
  }

  return (
    <Select
      mode={mode === 'multiple' ? 'multiple' : undefined}
      value={antdValue as never}
      options={mergedOptions}
      filterOption={false}
      showSearch
      allowClear
      onSearch={search}
      onChange={handleChange}
      onClear={() => onChange?.(mode === 'multiple' ? [] : null)}
      placeholder={placeholder}
      notFoundContent={loading
        ? <div className="flex items-center justify-center py-3"><Spin size="small" /></div>
        : <div className="flex items-center gap-2 py-3 px-2 text-xs" style={{ color: '#94A3B8' }}>
            <MapPin size={12} />输入关键词搜索地点
          </div>
      }
      style={{ width: '100%', fontSize: 13 }}
      variant="borderless"
      popupMatchSelectWidth={false}
      styles={{
        popup: {
          root: {
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            border: '1px solid #E5E7EB',
            minWidth: 280,
          },
        },
      }}
    />
  )
}
