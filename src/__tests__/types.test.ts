import { describe, it, expect } from 'vitest'
import {
  FullItinerarySchema,
  DayPlanSchema,
  ActivitySchema,
  POISchema,
  StyleAgentOutputSchema,
  RoutePlanOutputSchema,
  ContentAgentOutputSchema,
  XHSAgentOutputSchema,
} from '@/lib/agents/types'

// ── 测试用 fixture ────────────────────────────────────────────

const validActivity = {
  time:        '09:00',
  name:        '故宫参观',
  description: '参观世界最大的宫殿建筑群',
  duration:    '3小时',
  cost:        '60元',
  transport:   '地铁',
}

const validPOI = {
  id:       'gugong',
  name:     '故宫',
  address:  '北京市东城区景山前街4号',
  category: '历史遗迹',
}

const validDayPlan = {
  day:       1,
  date:      '2026-04-12',
  title:     '皇城探秘',
  morning:   [validActivity],
  afternoon: [],
  evening:   [],
}

// ─────────────────────────────────────────────────────────────

describe('ActivitySchema', () => {
  it('通过合法活动', () => {
    const result = ActivitySchema.safeParse(validActivity)
    expect(result.success).toBe(true)
  })

  it('包含 POI 的活动', () => {
    const result = ActivitySchema.safeParse({ ...validActivity, poi: validPOI })
    expect(result.success).toBe(true)
  })

  it('缺少必要字段时失败', () => {
    expect(ActivitySchema.safeParse({ time: '09:00' }).success).toBe(false)
    expect(ActivitySchema.safeParse({ ...validActivity, name: undefined }).success).toBe(false)
  })
})

describe('POISchema', () => {
  it('通过合法 POI', () => {
    expect(POISchema.safeParse(validPOI).success).toBe(true)
  })

  it('包含坐标的 POI', () => {
    const result = POISchema.safeParse({ ...validPOI, latLng: { lat: 39.916, lng: 116.397 } })
    expect(result.success).toBe(true)
  })

  it('缺少 id 时失败', () => {
    const { id: _, ...noid } = validPOI
    expect(POISchema.safeParse(noid).success).toBe(false)
  })
})

describe('DayPlanSchema', () => {
  it('通过合法日程', () => {
    expect(DayPlanSchema.safeParse(validDayPlan).success).toBe(true)
  })

  it('日期格式必须是 YYYY-MM-DD', () => {
    expect(DayPlanSchema.safeParse({ ...validDayPlan, date: '2026/04/12' }).success).toBe(false)
    expect(DayPlanSchema.safeParse({ ...validDayPlan, date: '12-04-2026' }).success).toBe(false)
    expect(DayPlanSchema.safeParse({ ...validDayPlan, date: '2026-04-12' }).success).toBe(true)
  })

  it('morning/afternoon/evening 可以是空数组', () => {
    const empty = { ...validDayPlan, morning: [], afternoon: [], evening: [] }
    expect(DayPlanSchema.safeParse(empty).success).toBe(true)
  })
})

describe('StyleAgentOutputSchema', () => {
  it('通过合法 POI 推荐输出', () => {
    const data = {
      styleTheme:     '历史文化探索',
      pois:           [validPOI],
      styleRationale: '北京历史底蕴深厚',
      highlights:     ['故宫', '长城', '天坛'],
    }
    expect(StyleAgentOutputSchema.safeParse(data).success).toBe(true)
  })

  it('pois 为空数组也合法', () => {
    const data = { styleTheme: '轻松游', pois: [], styleRationale: '...', highlights: [] }
    expect(StyleAgentOutputSchema.safeParse(data).success).toBe(true)
  })
})

describe('RoutePlanOutputSchema', () => {
  it('通过合法路线规划输出', () => {
    const data = {
      days:          [validDayPlan],
      totalDistance: '50公里',
      budgetEstimate: { low: 2000, high: 5000, currency: 'CNY' },
    }
    expect(RoutePlanOutputSchema.safeParse(data).success).toBe(true)
  })

  it('budgetEstimate 字段必须完整', () => {
    const data = {
      days: [validDayPlan],
      totalDistance: '50公里',
      budgetEstimate: { low: 2000 }, // 缺 high 和 currency
    }
    expect(RoutePlanOutputSchema.safeParse(data).success).toBe(false)
  })
})

describe('ContentAgentOutputSchema', () => {
  it('通过合法贴士输出', () => {
    const data = {
      notes:       [{ title: '注意事项', body: '注意防晒', tags: ['夏季'] }],
      packingTips: ['防晒霜', '雨伞'],
      warnings:    ['注意扒手'],
    }
    expect(ContentAgentOutputSchema.safeParse(data).success).toBe(true)
  })
})

describe('XHSAgentOutputSchema', () => {
  it('通过合法小红书笔记', () => {
    const data = {
      notes: [{
        title:    '🗺️ 北京3天攻略',
        body:     '快来看看这个超详细的北京攻略！',
        tags:     ['北京', '旅游', '攻略'],
        noteType: 'guide' as const,
      }],
    }
    expect(XHSAgentOutputSchema.safeParse(data).success).toBe(true)
  })

  it('noteType 只接受合法枚举值', () => {
    const invalid = {
      notes: [{ title: 'test', body: 'test', tags: [], noteType: 'invalid' }],
    }
    expect(XHSAgentOutputSchema.safeParse(invalid).success).toBe(false)
  })
})

describe('FullItinerarySchema', () => {
  const validFullItinerary = {
    id:          'plan-001',
    title:       '北京3日游',
    summary:     '探索千年古都',
    destination: '北京',
    origin:      '上海',
    startDate:   '2026-04-12',
    endDate:     '2026-04-14',
    userPrompt:  '想体验历史文化',
    days:        [validDayPlan, { ...validDayPlan, day: 2, date: '2026-04-13', title: '长城徒步' }],
    xhsNotes:    [],
    packingTips: ['防晒霜', '舒适鞋'],
    warnings:    ['注意扒手'],
    budget:      { low: 2000, high: 5000, currency: 'CNY' },
    generatedAt: '2026-04-12T10:00:00Z',
  }

  it('通过完整合法的行程数据', () => {
    expect(FullItinerarySchema.safeParse(validFullItinerary).success).toBe(true)
  })

  it('缺少必要字段时失败', () => {
    const { title: _, ...noTitle } = validFullItinerary
    expect(FullItinerarySchema.safeParse(noTitle).success).toBe(false)
  })

  it('days 可以为空数组', () => {
    const empty = { ...validFullItinerary, days: [] }
    expect(FullItinerarySchema.safeParse(empty).success).toBe(true)
  })
})
