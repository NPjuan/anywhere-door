'use client'

import { useState, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight, Sparkles, ChevronRight } from 'lucide-react'
import { useSearchStore, type PlacePOI } from '@/lib/stores/searchStore'
import { ConfigProvider, DatePicker, AutoComplete, Select } from 'antd'
import { searchCities, getAirportsByCity } from '@/lib/cities'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import locale from 'antd/locale/zh_CN'
import type { CityOption } from '@/lib/stores/searchStore'
import { PlaceSelect } from '../form/PlaceSelect'

dayjs.locale('zh-cn')

const PRESETS = [
  {
    icon: '📸',
    label: '摄影打卡',
    prompt:
      '帮我规划一次以摄影为主题的旅行，寻找最佳拍摄地点、黄金光线时间段和绝美构图场景，推荐网红地标和小众秘境。',
  },
  {
    icon: '🍜',
    label: '深度美食',
    prompt:
      '我想来一次深度美食之旅，探索当地最地道的街边小吃、老字号餐厅和隐藏美食，吃货视角规划每日行程。',
  },
  {
    icon: '☕',
    label: '轻松漫游',
    prompt:
      '帮我规划一次悠闲自在的慢节奏旅行，不赶时间、随性漫步，多一些咖啡馆、书店、安静公园和老街巷。',
  },
  {
    icon: '🏛️',
    label: '文化探索',
    prompt:
      '我希望深度了解当地历史文化，参观博物馆、古迹遗址和传统市集，体验当地民俗活动和非遗文化。',
  },
] as const

interface HomeFormProps {
  onSubmit: (e: React.FormEvent) => void
  error: string | null
}

/**
 * ===== HomeForm 组件 =====
 * 主表单组件，用 memo 包裹以避免不必要的全量重渲染
 * onSubmit 和 error 基本不变，可提升性能
 */
export const HomeForm = memo(({ onSubmit, error }: HomeFormProps) => {
  const {
    params,
    setOrigin,
    setDestination,
    swapCities,
    setDateRange,
    setPrompt,
    setHotelPOI,
    setMustVisit,
    setMustAvoid,
  } = useSearchStore()

  const isValid = useSearchStore((s) => s.isValid())
  const { hotelPOI, mustVisit, mustAvoid } = params

  // ===== 使用 useCallback 避免子组件不必要的重新渲染 =====
  const handleOriginChange = useCallback((c: CityOption | null) => setOrigin(c), [setOrigin])
  const handleDestinationChange = useCallback((c: CityOption | null) => setDestination(c), [setDestination])
  const handleSwapCities = useCallback(() => swapCities(), [swapCities])
  const handleDateRangeChange = useCallback((s: string, e: string) => setDateRange(s, e), [setDateRange])
  const handlePromptChange = useCallback((p: string) => setPrompt(p), [setPrompt])
  const handlePresetClick = useCallback((prompt: string) => setPrompt(prompt), [setPrompt])
  
  const handleSetHotelPOI = useCallback((p: PlacePOI | PlacePOI[] | null) => {
    if (Array.isArray(p)) {
      setHotelPOI(p[0] ?? null)
    } else {
      setHotelPOI(p)
    }
  }, [setHotelPOI])
  
  const handleAddMustVisit = useCallback((pois: PlacePOI | PlacePOI[] | null) => {
    const poiArray = Array.isArray(pois) ? pois : pois ? [pois] : []
    poiArray.forEach(p => {
      if (!mustVisit.some((v) => v.name === p.name)) {
        setMustVisit([...mustVisit, p])
      }
    })
  }, [mustVisit, setMustVisit])
  
  const handleRemoveMustVisit = useCallback((i: number) => {
    setMustVisit(mustVisit.filter((_, j) => j !== i))
  }, [mustVisit, setMustVisit])
  
  const handleAddMustAvoid = useCallback((pois: PlacePOI | PlacePOI[] | null) => {
    const poiArray = Array.isArray(pois) ? pois : pois ? [pois] : []
    poiArray.forEach(p => {
      if (!mustAvoid.some((v) => v.name === p.name)) {
        setMustAvoid([...mustAvoid, p])
      }
    })
  }, [mustAvoid, setMustAvoid])
  
  const handleRemoveMustAvoid = useCallback((i: number) => {
    setMustAvoid(mustAvoid.filter((_, j) => j !== i))
  }, [mustAvoid, setMustAvoid])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <ConfigProvider
        locale={locale}
        theme={{
          token: {
            colorPrimary: '#2563EB',
            colorBorder: '#E5E7EB',
            colorBgContainer: '#FFFFFF',
            colorBgElevated: '#FFFFFF',
            colorText: '#111827',
            colorTextPlaceholder: '#9CA3AF',
            borderRadius: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 14,
          },
          components: {
            DatePicker: {
              activeBorderColor: '#2563EB',
              hoverBorderColor: '#93C5FD',
              colorBgContainer: '#FFFFFF',
              colorText: '#111827',
              colorTextPlaceholder: '#9CA3AF',
              colorBgElevated: '#FFFFFF',
              cellActiveWithRangeBg: 'rgba(37,99,235,0.07)',
            },
          },
        }}
      >
        <form onSubmit={onSubmit}>
          <div
            className="rounded-lg p-6 md:p-8 mb-4"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08)',
            }}
          >
            {/* ── 城市选择区 ── */}
            <div
              className="flex gap-0 rounded-lg overflow-hidden"
              style={{ border: '1px solid #E5E7EB' }}
            >
              <CityField
                label="出发城市"
                placeholder="搜索城市..."
                value={params.origin}
                onChange={handleOriginChange}
                id="origin"
              />

              <button
                type="button"
                onClick={handleSwapCities}
                className="px-2 md:px-4 py-3 flex items-center justify-center transition-all hover:bg-gray-50"
                style={{ borderLeft: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}
              >
                <ArrowLeftRight size={16} style={{ color: '#6B7280' }} />
              </button>

              <CityField
                label="目的地"
                placeholder="搜索城市..."
                value={params.destination}
                onChange={handleDestinationChange}
                id="destination"
              />
            </div>

            {/* ── 日期选择区 ── */}
            <div
              className="mt-4 flex items-start gap-0 rounded-lg overflow-hidden"
              style={{ border: '1px solid #E5E7EB' }}
            >
              <DateField
                startDate={params.startDate}
                endDate={params.endDate}
                onChange={handleDateRangeChange}
              />
            </div>

            {/* ── Prompt 输入区 ── */}
            <div className="mt-4">
              <label
                className="block text-xs font-medium mb-2"
                style={{ color: '#6B7280' }}
              >
                旅行主题 <span style={{ color: '#9CA3AF' }}>(选填)</span>
              </label>
              <textarea
                value={params.prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="描述你理想的旅行风格，AI 会根据你的需求规划..."
                rows={2}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#E5E7EB',
                  color: '#111827',
                  fontSize: 13,
                  backgroundColor: '#FAFBFC',
                }}
              />

              {/* ── 快速预设 ── */}
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESETS.map((p) => {
                  const isActive = params.prompt === p.prompt
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handlePresetClick(p.prompt)}
                      className="text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: isActive ? '#EFF6FF' : '#F3F4F6',
                        border: isActive ? '1px solid #BFDBFE' : '1px solid #E5E7EB',
                        color: isActive ? '#2563EB' : '#6B7280',
                      }}
                    >
                      <span className="mr-1">{p.icon}</span>
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── 位置约束条件 ── */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
              <div className="flex flex-col gap-3">
                {/* Hotel POI */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: '#6B7280' }}
                  >
                    住宿地址 <span style={{ color: '#9CA3AF' }}>(选填)</span>
                  </label>
                  <PlaceSelect
                    value={hotelPOI}
                    onChange={handleSetHotelPOI}
                    placeholder="搜索住宿地点..."
                  />
                </div>

                {/* Must Visit */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: '#6B7280' }}
                  >
                    必去地点 <span style={{ color: '#9CA3AF' }}>(选填)</span>
                  </label>
                  <PlaceSelect
                    value={null}
                    onChange={handleAddMustVisit}
                    placeholder="添加必去地点..."
                  />
                  {mustVisit.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {mustVisit.map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#2563EB',
                          }}
                        >
                          {p.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveMustVisit(i)}
                            className="ml-1 hover:opacity-60"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Must Avoid */}
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: '#6B7280' }}
                  >
                    避开地点 <span style={{ color: '#9CA3AF' }}>(选填)</span>
                  </label>
                  <PlaceSelect
                    value={null}
                    onChange={handleAddMustAvoid}
                    placeholder="添加避开地点..."
                  />
                  {mustAvoid.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {mustAvoid.map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                          style={{
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                          }}
                        >
                          {p.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveMustAvoid(i)}
                            className="ml-1 hover:opacity-60"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div
                className="mt-4 p-3 rounded-lg text-xs"
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid}
              className="w-full mt-6 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={{
                background: isValid
                  ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                  : '#F3F4F6',
                color: isValid ? '#FFFFFF' : '#9CA3AF',
                boxShadow: isValid ? '0 4px 14px rgba(37,99,235,0.30)' : 'none',
                cursor: isValid ? 'pointer' : 'not-allowed',
                border: 'none',
              }}
            >
              <Sparkles size={14} />
              AI 为我规划行程
              <ChevronRight size={14} />
            </button>
          </div>
        </form>
      </ConfigProvider>
    </motion.div>
  )
})

HomeForm.displayName = 'HomeForm'

/**
 * ===== CityField 组件 =====
 * 城市选择字段，支持搜索和机场选择
 * 使用 React.memo 优化：仅当 value 或回调变化时重新渲染
 * 深比较规则：value (CityOption) 是引用类型，onChange 用 useCallback 保持稳定
 */
const CityField = memo(({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  id 
}: {
  label: string
  placeholder: string
  value: CityOption | null
  onChange: (c: CityOption | null) => void
  id: string
}) => {
  const [inputVal, setInputVal] = useState('')
  const uid = `city-${id}`

  const query = value ? '' : inputVal
  const candidates = searchCities(query)

  const airportOptions = value
    ? getAirportsByCity(value.name).map((a) => ({
        value: a.code,
        label: `${a.airport}（${a.code}）`,
      }))
    : []
  const multiAirport = airportOptions.length > 1

  const cityOptions = candidates.map((r) => ({
    value: r.city.code,
    label: (
      <div className="flex items-center gap-2.5 py-0.5">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 font-bold"
          style={{ background: '#2563EB', fontSize: 11 }}
        >
          {r.city.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <span className="text-sm font-medium" style={{ color: '#0F172A' }}>
            {r.label}
          </span>
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            {r.city.nameEn}
          </p>
        </div>
      </div>
    ),
  }))

  return (
    <div className="flex-1 min-w-0 px-5 py-3">
      <label
        htmlFor={uid}
        className="block text-xs font-medium mb-1.5"
        style={{ color: '#6B7280' }}
      >
        {label}
      </label>

      <AutoComplete
        id={uid}
        value={value ? value.name : inputVal}
        options={cityOptions}
        onSelect={(code: string) => {
          const results = searchCities(inputVal)
          const found = results.find((r) => r.city.code === code)
          if (found) {
            onChange({
              ...found.city,
              selectedAirportCode: undefined,
              selectedAirportName: undefined,
            })
            setInputVal('')
          }
        }}
        onChange={(v: string) => {
          setInputVal(v)
          if (!v) onChange(null)
        }}
        onClear={() => {
          setInputVal('')
          onChange(null)
        }}
        allowClear
        popupMatchSelectWidth
        listHeight={320}
        virtual
        placeholder={placeholder}
        style={{ width: '100%' }}
        styles={{
          popup: {
            root: {
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              overflow: 'hidden',
            },
          },
        }}
      />

      {value &&
        airportOptions.length > 0 &&
        (multiAirport ? (
          <Select
            value={value.selectedAirportCode ?? null}
            options={airportOptions}
            onChange={(code: string | null) => {
              if (!code) {
                onChange({
                  ...value,
                  selectedAirportCode: undefined,
                  selectedAirportName: undefined,
                })
              } else {
                const airport = getAirportsByCity(value.name).find(
                  (a) => a.code === code
                )
                onChange({
                  ...value,
                  selectedAirportCode: code,
                  selectedAirportName: airport?.airport,
                })
              }
            }}
            placeholder="选择机场（选填）"
            allowClear
            size="small"
            variant="borderless"
            style={{ width: '100%', marginTop: 4, fontSize: 12 }}
            popupMatchSelectWidth={false}
            styles={{
              popup: {
                root: {
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                },
              },
            }}
          />
        ) : (
          <div
            className="mt-1 flex items-center gap-1.5 text-xs"
            style={{ color: '#94A3B8', paddingLeft: 2 }}
          >
            <span style={{ color: '#CBD5E1' }}>✈</span>
            {airportOptions[0].label}
          </div>
        ))}
    </div>
  )
}, (prevProps, nextProps) => {
  // 自定义比较：仅比较 id、label、placeholder 和 value.code（忽略引用地址）
  return (
    prevProps.id === nextProps.id &&
    prevProps.label === nextProps.label &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.value?.code === nextProps.value?.code &&
    prevProps.onChange === nextProps.onChange
  )
})

CityField.displayName = 'CityField'

/**
 * ===== DateField 组件 =====
 * 日期范围选择字段
 * 使用 React.memo 优化：仅当日期值变化时重新渲染
 */
const DateField = memo(({ 
  startDate, 
  endDate, 
  onChange 
}: {
  startDate: string
  endDate: string
  onChange: (s: string, e: string) => void
}) => {
  return (
    <div className="flex-1 min-w-0 px-5 py-4">
      <label
        className="block text-xs font-medium mb-1.5"
        style={{ color: '#6B7280' }}
      >
        旅行时间
      </label>
      <DatePicker.RangePicker
        value={[
          startDate ? dayjs(startDate) : null,
          endDate ? dayjs(endDate) : null,
        ]}
        onChange={(dates) =>
          onChange(
            dates?.[0]?.format('YYYY-MM-DD') ?? '',
            dates?.[1]?.format('YYYY-MM-DD') ?? ''
          )
        }
        disabledDate={(c) => c && c < dayjs().startOf('day')}
        placeholder={['出发日', '返回日']}
        format="M月D日"
        separator="→"
        variant="borderless"
        style={{
          background: 'transparent',
          width: '100%',
          color: '#111827',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 14,
          height: 32,
        }}
      />
    </div>
  )
}, (prevProps, nextProps) => {
  // 仅比较日期字符串，忽略回调引用
  return (
    prevProps.startDate === nextProps.startDate &&
    prevProps.endDate === nextProps.endDate &&
    prevProps.onChange === nextProps.onChange
  )
})

DateField.displayName = 'DateField'
