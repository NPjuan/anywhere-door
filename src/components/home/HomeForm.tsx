'use client';

import { useState, useCallback, memo } from 'react';
import { ArrowLeftRight, Sparkles, ChevronRight } from 'lucide-react';
import { useSearchStore, type PlacePOI } from '@/lib/stores/searchStore';
import {
  ConfigProvider,
  DatePicker,
  TimePicker,
  AutoComplete,
  Select,
  InputNumber,
} from 'antd';
import { searchCities, getAirportsByCity } from '@/lib/cities';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/locale/zh_CN';
import type { CityOption } from '@/lib/stores/searchStore';
import { PlaceSelect } from '../form/PlaceSelect';

dayjs.locale('zh-cn');

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
] as const;

interface HomeFormProps {
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
  isPlanning?: boolean;
  isDisabled?: boolean;
}

export const HomeForm = memo(
  ({ onSubmit, error, isPlanning = false, isDisabled = false }: HomeFormProps) => {
    const {
      params,
      setOrigin,
      setDestination,
      swapCities,
      setDateRange,
      setPrompt,
      setTravelers,
      setHotelPOI,
      setMustVisit,
      setMustAvoid,
      setArrivalTime,
      setDepartureTime,
    } = useSearchStore();

    const valid = useSearchStore((s) => s.isValid());
    const { hotelPOI, mustVisit, mustAvoid } = params;

    const handleOriginChange = useCallback(
      (c: CityOption | null) => setOrigin(c),
      [setOrigin]
    );
    const handleDestinationChange = useCallback(
      (c: CityOption | null) => setDestination(c),
      [setDestination]
    );
    const handleSwapCities = useCallback(() => swapCities(), [swapCities]);
    const handleDateRangeChange = useCallback(
      (s: string, e: string) => setDateRange(s, e),
      [setDateRange]
    );
    const handlePromptChange = useCallback(
      (p: string) => setPrompt(p),
      [setPrompt]
    );
    const handlePresetClick = useCallback(
      (prompt: string) => setPrompt(prompt),
      [setPrompt]
    );
    const handleSetHotelPOI = useCallback(
      (p: PlacePOI | PlacePOI[] | null) => {
        setHotelPOI(Array.isArray(p) ? p[0] ?? null : p);
      },
      [setHotelPOI]
    );
    const handleAddMustVisit = useCallback(
      (p: PlacePOI | PlacePOI[] | null) => {
        const poi = Array.isArray(p) ? p[0] ?? null : p;
        if (poi && !mustVisit.some((v) => v.name === poi.name)) {
          setMustVisit([...mustVisit, poi]);
        }
      },
      [mustVisit, setMustVisit]
    );
    const handleRemoveMustVisit = useCallback(
      (i: number) => {
        setMustVisit(mustVisit.filter((_, j) => j !== i));
      },
      [mustVisit, setMustVisit]
    );
    const handleAddMustAvoid = useCallback(
      (p: PlacePOI | PlacePOI[] | null) => {
        const poi = Array.isArray(p) ? p[0] ?? null : p;
        if (poi && !mustAvoid.some((v) => v.name === poi.name)) {
          setMustAvoid([...mustAvoid, poi]);
        }
      },
      [mustAvoid, setMustAvoid]
    );
    const handleRemoveMustAvoid = useCallback(
      (i: number) => {
        setMustAvoid(mustAvoid.filter((_, j) => j !== i));
      },
      [mustAvoid, setMustAvoid]
    );

    return (
      <div>
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
              borderRadius: 8,
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
              className="p-5 mb-4"
              style={{
                opacity: isDisabled ? 0.45 : 1,
                pointerEvents: isDisabled ? 'none' : undefined,
                transition: 'opacity 0.2s',
                background: '#FFFFFF',
                borderRadius: 8,
                boxShadow:
                  '0 2px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08)',
              }}
            >
              {/* ── 第一行：城市 + 日期 ── */}
              <div
                className="flex items-stretch"
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {/* 出发城市 */}
                <CityField
                  label="出发城市"
                  placeholder="搜索城市..."
                  value={params.origin}
                  onChange={handleOriginChange}
                  id="origin"
                />

                {/* 互换按钮 */}
                <button
                  type="button"
                  onClick={handleSwapCities}
                  className="px-3 flex items-center justify-center transition-all hover:bg-gray-50 shrink-0 self-center"
                  style={{ color: '#9CA3AF' }}
                >
                  <ArrowLeftRight size={14} />
                </button>

                {/* 目的城市 */}
                <CityField
                  label="目的城市"
                  placeholder="搜索城市..."
                  value={params.destination}
                  onChange={handleDestinationChange}
                  id="destination"
                />

                {/* 分隔线 */}
                <div
                  style={{ width: 1, background: '#E5E7EB', margin: '10px 0' }}
                />

                {/* 日期 + 航班时间 */}
                <DateField
                  startDate={params.startDate}
                  endDate={params.endDate}
                  onChange={handleDateRangeChange}
                  arrivalTime={params.arrivalTime}
                  departureTime={params.departureTime}
                  onArrivalTimeChange={setArrivalTime}
                  onDepartureTimeChange={setDepartureTime}
                />
              </div>

              {/* ── 旅行主题 ── */}
              <div className="mt-4">
                {/* 快速预设在上 */}
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <span
                    className="text-xs shrink-0"
                    style={{ color: '#6B7280' }}
                  >
                    旅行风格
                  </span>
                  {PRESETS.map((p) => {
                    const isActive = params.prompt === p.prompt;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handlePresetClick(p.prompt)}
                        className="text-xs px-2.5 py-1 cursor-pointer transition-all"
                        style={{
                          borderRadius: 6,
                          background: isActive ? '#EFF6FF' : '#F3F4F6',
                          border: isActive
                            ? '1px solid #BFDBFE'
                            : '1px solid #E5E7EB',
                          color: isActive ? '#2563EB' : '#6B7280',
                        }}
                      >
                        <span className="mr-1">{p.icon}</span>
                        {p.label}
                      </button>
                    );
                  })}
                  {/* 人数 — 靠右 */}
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      共
                    </span>
                    <InputNumber
                      min={1}
                      max={20}
                      value={params.travelers ?? 1}
                      onChange={(v) => setTravelers(v ?? 1)}
                      controls={false}
                      size="small"
                      style={{
                        width: 28,
                        fontSize: 12,
                        color: '#9CA3AF',
                        border: '1px solid #E5E7EB',
                        borderRadius: 4,
                      }}
                    />
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      人出行
                    </span>
                  </div>
                </div>
                <textarea
                  value={params.prompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="细节描述越多，任意门开的越准，向任意门许愿吧！"
                  rows={2}
                  className="w-full p-3 border focus:outline-none"
                  style={{
                    borderRadius: 8,
                    borderColor: '#E5E7EB',
                    color: '#111827',
                    fontSize: 13,
                    backgroundColor: '#FAFBFC',
                    outline: 'none',
                    boxShadow: 'none',
                    resize: 'vertical',
                    minHeight: '3.5rem',
                    maxHeight: '7rem',
                  }}
                />
              </div>

              {/* ── 位置约束条件 ── */}
              <div
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid #F3F4F6' }}
              >
                <div className="flex flex-col gap-3">
                  {/* 酒店地址 — 单独一行 */}
                  <div>
                    <label
                      className="block text-xs mb-1.5"
                      style={{ color: '#6B7280' }}
                    >
                      住宿地址 <span>(选填)</span>
                    </label>
                    <div
                      style={{
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: 6,
                      }}
                    >
                      <PlaceSelect
                        value={hotelPOI}
                        onChange={handleSetHotelPOI}
                        placeholder="搜索住宿地址，AI 将以此为出发基点"
                        city={params.destination?.name ?? ''}
                      />
                    </div>
                  </div>

                  {/* 必去 / 不去 — 同一行并排 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className="block text-xs mb-1.5"
                        style={{ color: '#6B7280' }}
                      >
                        必去地点 <span>(选填)</span>
                      </label>
                      <div
                        style={{
                          background: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: 6,
                        }}
                      >
                        <PlaceSelect
                          value={null}
                          onChange={handleAddMustVisit}
                          placeholder="搜索并添加"
                          city={params.destination?.name ?? ''}
                        />
                      </div>
                      {mustVisit.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {mustVisit.map((p, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs"
                              style={{
                                borderRadius: 4,
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
                    <div>
                      <label
                        className="block text-xs mb-1.5"
                        style={{ color: '#6B7280' }}
                      >
                        不去地点 <span>(选填)</span>
                      </label>
                      <div
                        style={{
                          background: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: 6,
                        }}
                      >
                        <PlaceSelect
                          value={null}
                          onChange={handleAddMustAvoid}
                          placeholder="搜索并添加"
                          city={params.destination?.name ?? ''}
                        />
                      </div>
                      {mustAvoid.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {mustAvoid.map((p, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs"
                              style={{
                                borderRadius: 4,
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
              </div>

              {/* Error */}
              {error && (
                <div
                  className="mt-4 p-3 text-xs"
                  style={{
                    borderRadius: 8,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit — planning 时隐藏，交互移至 PromptPreviewCard */}
              {!isPlanning && (
                <button
                  type="submit"
                  disabled={!valid}
                  className="w-full mt-5 py-3 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  style={{
                    borderRadius: 8,
                    background: valid
                      ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                      : '#F3F4F6',
                    color: valid ? '#FFFFFF' : '#9CA3AF',
                    boxShadow: valid ? '0 4px 14px rgba(37,99,235,0.30)' : 'none',
                    cursor: valid ? 'pointer' : 'not-allowed',
                    border: 'none',
                  }}
                >
                  <Sparkles size={14} />
                  规划行程
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </form>
        </ConfigProvider>
      </div>
    );
  }
);

HomeForm.displayName = 'HomeForm';

const CityField = memo(
  ({
    label,
    placeholder,
    value,
    onChange,
    id,
  }: {
    label: string;
    placeholder: string;
    value: CityOption | null;
    onChange: (c: CityOption | null) => void;
    id: string;
  }) => {
    const [inputVal, setInputVal] = useState('');
    const uid = `city-${id}`;

    const query = value ? '' : inputVal;
    const candidates = searchCities(query);

    const airportOptions = value
      ? getAirportsByCity(value.name).map((a) => ({
          value: a.code,
          label: `${a.airport}（${a.code}）`,
        }))
      : [];
    const multiAirport = airportOptions.length > 1;

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
    }));

    return (
      <div className="flex-1 min-w-0 px-4 py-2.5">
        <label
          htmlFor={uid}
          className="block text-xs mb-1"
          style={{ color: '#6B7280' }}
        >
          {label}
        </label>
        <AutoComplete
          id={uid}
          value={value ? value.name : inputVal}
          options={cityOptions}
          onSelect={(code: string) => {
            const results = searchCities(inputVal);
            const found = results.find((r) => r.city.code === code);
            if (found) {
              onChange({
                ...found.city,
                selectedAirportCode: undefined,
                selectedAirportName: undefined,
              });
              setInputVal('');
            }
          }}
          onChange={(v: string) => {
            setInputVal(v);
            if (!v) onChange(null);
          }}
          onClear={() => {
            setInputVal('');
            onChange(null);
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
                borderRadius: 8,
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
                  });
                } else {
                  const airport = getAirportsByCity(value.name).find(
                    (a) => a.code === code
                  );
                  onChange({
                    ...value,
                    selectedAirportCode: code,
                    selectedAirportName: airport?.airport,
                  });
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
              style={{ color: '#9CA3AF', paddingLeft: 2 }}
            >
              <span style={{ color: '#CBD5E1' }}>✈</span>
              {airportOptions[0].label}
            </div>
          ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.label === nextProps.label &&
      prevProps.placeholder === nextProps.placeholder &&
      prevProps.value?.code === nextProps.value?.code &&
      prevProps.value?.selectedAirportCode ===
        nextProps.value?.selectedAirportCode &&
      prevProps.onChange === nextProps.onChange
    );
  }
);

CityField.displayName = 'CityField';

const DateField = memo(
  ({
    startDate,
    endDate,
    onChange,
    arrivalTime,
    departureTime,
    onArrivalTimeChange,
    onDepartureTimeChange,
  }: {
    startDate: string;
    endDate: string;
    onChange: (s: string, e: string) => void;
    arrivalTime: string;
    departureTime: string;
    onArrivalTimeChange: (t: string) => void;
    onDepartureTimeChange: (t: string) => void;
  }) => {
    const timePickerShared = {
      format: 'HH:mm',
      size: 'small' as const,
      variant: 'borderless' as const,
      minuteStep: 5 as const,
      needConfirm: true,
      suffixIcon: null,
      showNow: false,
      styles: { input: { fontSize: 13, color: '#9CA3AF' } },
      popupStyle: { fontSize: 13 },
    };

    return (
      <div className="px-4 py-2.5">
        <label className="block text-xs mb-1" style={{ color: '#6B7280' }}>
          旅行时间
        </label>        <DatePicker.RangePicker
          value={[
            startDate ? dayjs(startDate) : null,
            endDate ? dayjs(endDate) : null,
          ]}
          onChange={(dates) => {
            const s = dates?.[0]?.format('YYYY-MM-DD') ?? '';
            let e = dates?.[1]?.format('YYYY-MM-DD') ?? '';
            if (s && e && dayjs(e).diff(dayjs(s), 'day') > 6) {
              e = dayjs(s).add(6, 'day').format('YYYY-MM-DD');
            }
            onChange(s, e);
          }}
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
        {/* 落地时间 + 返程时间 — 同一行，高度与机场选项对齐 */}
        <div
          className="mt-1 flex items-center gap-1"
          style={{ paddingLeft: 2, height: 24 }}
        >
          <span style={{ color: '#CBD5E1', fontSize: 11 }}>✈</span>          <TimePicker
            {...timePickerShared}
            value={arrivalTime ? dayjs(arrivalTime, 'HH:mm') : null}
            onChange={(t) => onArrivalTimeChange(t ? t.format('HH:mm') : '')}
            placeholder="落地时间"
            style={{ width: '50%', height: 24 }}
          />
          <span
            style={{
              color: '#CBD5E1',
              fontSize: 11,
              transform: 'scaleX(-1)',
              display: 'inline-block',
            }}
          >
            ✈
          </span>
          <TimePicker
            {...timePickerShared}
            value={departureTime ? dayjs(departureTime, 'HH:mm') : null}
            onChange={(t) => onDepartureTimeChange(t ? t.format('HH:mm') : '')}
            placeholder="起飞时间"
            style={{ width: '50%', height: 24 }}
          />
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.startDate === nextProps.startDate &&
      prevProps.endDate === nextProps.endDate &&
      prevProps.arrivalTime === nextProps.arrivalTime &&
      prevProps.departureTime === nextProps.departureTime &&
      prevProps.onChange === nextProps.onChange &&
      prevProps.onArrivalTimeChange === nextProps.onArrivalTimeChange &&
      prevProps.onDepartureTimeChange === nextProps.onDepartureTimeChange
    );
  }
);

DateField.displayName = 'DateField';
