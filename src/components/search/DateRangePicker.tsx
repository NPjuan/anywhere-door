'use client'

import { DatePicker, Radio } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'
import locale from 'antd/locale/zh_CN'
import { ConfigProvider } from 'antd'

dayjs.locale('zh-cn')

/* ============================================================
   DateRangePicker — 使用 antd DatePicker
   Uses antd DatePicker / RangePicker

   往返：RangePicker（两个日期同时选）
   单程：DatePicker（单个日期）
   ============================================================ */

interface DateRangePickerProps {
  departureDate: string
  returnDate: string
  onDepartureChange: (date: string) => void
  onReturnChange: (date: string) => void
  tripType: 'roundtrip' | 'oneway'
  onTripTypeChange: (type: 'roundtrip' | 'oneway') => void
}

const pickerStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  background: 'rgba(255,255,255,0.6)',
  borderColor: 'rgba(255,255,255,0.6)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
}

const disabledDate = (current: Dayjs) =>
  current && current < dayjs().startOf('day')

export function DateRangePicker({
  departureDate,
  returnDate,
  onDepartureChange,
  onReturnChange,
  tripType,
  onTripTypeChange,
}: DateRangePickerProps) {
  return (
    <ConfigProvider
      locale={locale}
      theme={{
        token: {
          colorPrimary:       '#0EA5E9',
          colorBorder:        'rgba(255,255,255,0.6)',
          colorBgContainer:   'rgba(255,255,255,0.6)',
          borderRadius:       12,
          fontFamily:         'Inter, system-ui, sans-serif',
          colorText:          '#0C4A6E',
          colorTextPlaceholder: '#94A3B8',
        },
        components: {
          DatePicker: {
            activeBorderColor:  '#0EA5E9',
            hoverBorderColor:   '#38BDF8',
            cellActiveWithRangeBg: 'rgba(14,165,233,0.12)',
          },
        },
      }}
    >
      <div className="flex flex-col gap-3 w-full">
        {/* 行程类型 / Trip type */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            行程类型
          </span>
          <Radio.Group
            value={tripType}
            onChange={(e) => onTripTypeChange(e.target.value)}
            size="small"
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: '往返', value: 'roundtrip' },
              { label: '单程', value: 'oneway' },
            ]}
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* 日期选择 / Date picker */}
        {tripType === 'roundtrip' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              出发 / 返回日期
            </label>
            <DatePicker.RangePicker
              value={[
                departureDate ? dayjs(departureDate) : null,
                returnDate    ? dayjs(returnDate)    : null,
              ]}
              onChange={(dates) => {
                onDepartureChange(dates?.[0]?.format('YYYY-MM-DD') ?? '')
                onReturnChange(dates?.[1]?.format('YYYY-MM-DD') ?? '')
              }}
              disabledDate={disabledDate}
              placeholder={['出发日期', '返回日期']}
              format="M月D日"
              style={pickerStyle}
              variant="outlined"
              separator="→"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              出发日期
            </label>
            <DatePicker
              value={departureDate ? dayjs(departureDate) : null}
              onChange={(date) => onDepartureChange(date?.format('YYYY-MM-DD') ?? '')}
              disabledDate={disabledDate}
              placeholder="选择出发日期"
              format="M月D日 (ddd)"
              style={pickerStyle}
              variant="outlined"
            />
          </div>
        )}
      </div>
    </ConfigProvider>
  )
}
