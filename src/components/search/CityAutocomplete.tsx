'use client'

import { AutoComplete, ConfigProvider } from 'antd'
import React from 'react'
import { searchCities } from '@/lib/cities'
import type { CityOption } from '@/lib/stores/searchStore'

/* ============================================================
   CityAutocomplete — 亮色精致版（适配天蓝主页）
   Light refined version for sky-blue home page
   ============================================================ */

interface CityAutocompleteProps {
  label:       string
  placeholder: string
  value:       CityOption | null
  onChange:    (city: CityOption | null) => void
  icon?:       'plane' | 'pin'
  error?:      string
  id?:         string
}

export function CityAutocomplete({
  label, placeholder, value, onChange, error, id,
}: CityAutocompleteProps) {
  const autoId = React.useId()
  const inputId = id ?? autoId
  const [inputValue, setInputValue] = React.useState('')

  const query = value ? '' : inputValue
  const results = searchCities(query)

  const options = results.map((r) => ({
    value: r.city.code,
    label: (
      <div className="flex items-center gap-2.5 py-0.5">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
          style={{ background: r.type === 'city' ? '#0EA5E9' : '#64748B', fontSize: 10 }}
        >
          {r.type === 'city' ? r.city.name.slice(0, 1) : r.city.code}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-medium" style={{ color: '#0C4A6E' }}>{r.label}</span>
            {r.type === 'city' && (
              <span className="text-[10px] px-1 rounded" style={{ background: '#E0F2FE', color: '#0284C7' }}>城市</span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: '#94A3B8', marginTop: 1 }}>
            {r.type === 'city' ? `${r.city.nameEn} · ${r.city.airport}` : r.city.airport}
          </p>
        </div>
      </div>
    ),
  }))

  const handleSelect = (code: string) => {
    // 直接从当前 query 重新搜索，避免 stale closure
    const fresh = searchCities(value ? '' : inputValue)
    const found = fresh.find((r) => r.city.code === code)
    if (found) {
      onChange(found.city)
      setInputValue('')
    }
  }

  const handleChange = (val: string) => {
    setInputValue(val)
    if (!val) onChange(null)
  }

  const displayValue = value ? value.name : inputValue

  return (
    <ConfigProvider theme={{
      token: {
        colorPrimary:         '#0EA5E9',
        colorBorder:          '#D0E8F5',
        colorBgContainer:     '#FFFFFF',
        colorText:            '#0C4A6E',
        colorTextPlaceholder: '#94A3B8',
        fontFamily:           'Inter, system-ui, sans-serif',
        borderRadius:         8,
      },
    }}>
      <div className="flex flex-col gap-1.5 w-full">
        <label
          htmlFor={inputId}
          className="text-xs font-medium"
          style={{ color: '#475569' }}
        >
          {label}
        </label>

        <AutoComplete
          id={inputId}
          value={displayValue}
          options={options}
          onSelect={handleSelect}
          onChange={handleChange}
          popupMatchSelectWidth
          allowClear
          placeholder={placeholder}
          style={{ width: '100%' }}
          styles={{
            popup: {
              root: {
                borderRadius: 10,
                border: '1px solid #D0E8F5',
                background: '#FFFFFF',
                boxShadow: '0 8px 24px rgba(14,165,233,0.12)',
                overflow: 'hidden',
              },
            },
          }}
        >
          <input
            className="w-full h-10 px-3 text-sm border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-300/50"
            style={{
              background:   '#FFFFFF',
              borderColor:  error ? '#EF4444' : '#D0E8F5',
              borderRadius: 8,
              color:        '#0C4A6E',
              fontFamily:   'Inter, system-ui, sans-serif',
            }}
            placeholder={placeholder}
          />
        </AutoComplete>

        {error && (
          <p className="text-xs" style={{ color: '#EF4444' }} role="alert">{error}</p>
        )}
      </div>
    </ConfigProvider>
  )
}
