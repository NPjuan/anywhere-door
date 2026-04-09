'use client'

import { ArrowLeftRight } from 'lucide-react'
import { DatePicker, ConfigProvider } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import locale from 'antd/locale/zh_CN'
import { useRouter } from 'next/navigation'
import { useSearchStore } from '@/lib/stores/searchStore'
import { CityAutocomplete } from './CityAutocomplete'
import { PromptInput } from './PromptInput'
import { cn } from '@/lib/utils/cn'

dayjs.locale('zh-cn')

/* ============================================================
   SearchForm — 精致化亮色版（纯回调模式，不跳转路由）
   Refined light form (callback mode, no router push)
   ============================================================ */

interface SearchFormProps {
  onSubmit?: () => void   // 可选；compact 模式时仍走 router.push
  compact?:  boolean
}

const antdTheme = {
  token: {
    colorPrimary:         '#0EA5E9',
    colorBorder:          '#E2E8F0',
    colorBgContainer:     '#FFFFFF',
    colorBgElevated:      '#FFFFFF',
    colorText:            '#0F172A',
    colorTextPlaceholder: '#94A3B8',
    borderRadius:         8,
    fontFamily:           'Inter, system-ui, sans-serif',
    fontSize:             14,
  },
  components: {
    DatePicker: {
      activeBorderColor:     '#0EA5E9',
      hoverBorderColor:      '#7DD3FC',
      cellActiveWithRangeBg: 'rgba(14,165,233,0.07)',
    },
  },
}

const pickerStyle: React.CSSProperties = {
  width:        '100%',
  height:       40,
  background:   '#FFFFFF',
  borderColor:  '#E2E8F0',
  borderRadius: 8,
  fontFamily:   'Inter, system-ui, sans-serif',
  fontSize:     14,
}

const disabledDate = (current: dayjs.Dayjs) =>
  current && current < dayjs().startOf('day')

export function SearchForm({ onSubmit, compact = false }: SearchFormProps) {
  const router = useRouter()
  const { params, setOrigin, setDestination, swapCities, setDateRange, setPrompt, isValid } = useSearchStore()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid()) return
    if (onSubmit) {
      onSubmit()
    } else {
      // compact 模式或无回调时跳转搜索页
      const p = params
      const q = new URLSearchParams({ from: p.origin!.code, to: p.destination!.code, start: p.startDate, end: p.endDate, prompt: p.prompt })
      router.push(`/plan?${q}`)
    }
  }

  return (
    <ConfigProvider locale={locale} theme={antdTheme}>
      <form
        onSubmit={handleSubmit}
        className={cn('w-full', compact ? 'p-4' : 'p-5')}
        style={{
          background:   '#FFFFFF',
          borderRadius: 16,
          border:       '1px solid rgba(0,0,0,0.06)',
          boxShadow:    '0 1px 3px rgba(0,0,0,0.06), 0 6px 20px rgba(14,165,233,0.07)',
        }}
        noValidate
      >
        <div className={cn('flex flex-col', compact ? 'gap-3' : 'gap-4')}>

          {/* 城市 + 日期行 */}
          <div className="flex flex-col sm:flex-row items-end gap-2">
            <div className="flex-1 min-w-0">
              <CityAutocomplete
                label="出发城市"
                placeholder="从哪里出发"
                value={params.origin}
                onChange={setOrigin}
                id="origin-city"
              />
            </div>

            <button
              type="button"
              aria-label="互换城市"
              onClick={swapCities}
              className="mb-[1px] w-8 h-10 rounded-lg shrink-0 flex items-center justify-center transition-all duration-150 cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              style={{ border: '1px solid #E2E8F0', color: '#94A3B8' }}
            >
              <ArrowLeftRight size={13} />
            </button>

            <div className="flex-1 min-w-0">
              <CityAutocomplete
                label="目的地"
                placeholder="去哪里旅行"
                value={params.destination}
                onChange={setDestination}
                id="destination-city"
              />
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#64748B' }}>
                旅行时间
              </label>
              <DatePicker.RangePicker
                value={[
                  params.startDate ? dayjs(params.startDate) : null,
                  params.endDate   ? dayjs(params.endDate)   : null,
                ]}
                onChange={(dates) => setDateRange(
                  dates?.[0]?.format('YYYY-MM-DD') ?? '',
                  dates?.[1]?.format('YYYY-MM-DD') ?? '',
                )}
                disabledDate={disabledDate}
                placeholder={['出发日', '返回日']}
                format="M月D日"
                style={pickerStyle}
                separator="→"
                variant="outlined"
              />
            </div>
          </div>

          {/* 分隔线 */}
          {!compact && (
            <div style={{ height: 1, background: '#F1F5F9' }} />
          )}

          {/* Prompt 输入 */}
          {!compact && (
            <PromptInput value={params.prompt} onChange={setPrompt} />
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={!isValid()}
            className={cn(
              'w-full h-11 rounded-lg text-sm font-semibold',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2',
              isValid()
                ? 'cursor-pointer text-white'
                : 'cursor-not-allowed opacity-50 text-white',
            )}
            style={{
              background: isValid()
                ? 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)'
                : '#CBD5E1',
              boxShadow: isValid() ? '0 2px 8px rgba(14,165,233,0.35)' : 'none',
            }}
          >
            生成行程计划
          </button>

          {/* 填写提示 */}
          {!isValid() && (params.origin || params.destination) && (
            <p className="text-center text-xs" style={{ color: '#94A3B8' }}>
              {!params.origin ? '请选择出发城市' : !params.destination ? '请选择目的地' : '请选择旅行时间'}
            </p>
          )}
        </div>
      </form>
    </ConfigProvider>
  )
}
