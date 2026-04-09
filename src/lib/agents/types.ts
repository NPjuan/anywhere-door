import { z } from 'zod'

/* ============================================================
   Agent I/O Zod Schemas（重构版 — 移除机票，新增 XHS Agent）
   Redesigned: removed flight, added XHS Agent
   ============================================================ */

/* ── 共用基础类型 / Shared base types ── */

export const LatLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
})

export const POISchema = z.object({
  id:       z.string(),
  name:     z.string(),
  address:  z.string(),
  category: z.string(),
  latLng:   LatLngSchema,
  rating:   z.number().optional(),
  hours:    z.string().optional(),
  tips:     z.string().optional(),
})

export const ActivitySchema = z.object({
  time:        z.string(),            // "09:00"
  name:        z.string(),
  description: z.string(),
  poi:         POISchema.optional(),
  duration:    z.string(),            // "1.5小时"
  cost:        z.string().optional(),
  transport:   z.string().optional(),
})

export const DayPlanSchema = z.object({
  day:       z.number(),
  date:      z.string(),
  title:     z.string(),
  morning:   z.array(ActivitySchema),
  afternoon: z.array(ActivitySchema),
  evening:   z.array(ActivitySchema),
})

/* ── Agent 2（重命名）：POI 推荐 / POI Recommendation Agent ── */
export const StyleAgentOutputSchema = z.object({
  styleTheme:     z.string(),
  pois:           z.array(POISchema),
  styleRationale: z.string(),
  highlights:     z.array(z.string()),
})

/* ── Agent 3：路线规划 / Route Planning Agent ── */
export const RoutePlanOutputSchema = z.object({
  days:          z.array(DayPlanSchema),
  totalDistance: z.string(),
  budgetEstimate: z.object({
    low:      z.number(),
    high:     z.number(),
    currency: z.string(),
  }),
})

/* ── Agent 4：旅行贴士 / Travel Tips Agent ── */
export const ContentAgentOutputSchema = z.object({
  notes: z.array(z.object({
    title: z.string(),
    body:  z.string(),
    tags:  z.array(z.string()),
  })),
  packingTips: z.array(z.string()),
  warnings:    z.array(z.string()),
})

/* ── XHS Agent：小红书风格笔记 / XHS-style Notes Agent ── */
export const XHSAgentOutputSchema = z.object({
  notes: z.array(z.object({
    /** 小红书标题（含 emoji）/ XHS title with emoji */
    title:    z.string(),
    /** 正文（口语化，分段，emoji）/ Body (conversational, paragraphs, emoji) */
    body:     z.string(),
    /** 标签 5 个以内 / Up to 5 tags */
    tags:     z.array(z.string()),
    /** 笔记类型 / Note type */
    noteType: z.enum(['guide', 'toplist', 'tips', 'diary', 'review']),
  })),
})

/* ── FullItinerary：最终输出（无机票字段）/ Final output (no flight) ── */
export const FullItinerarySchema = z.object({
  id:          z.string(),
  title:       z.string(),
  summary:     z.string(),
  destination: z.string(),
  origin:      z.string(),
  startDate:   z.string(),
  endDate:     z.string(),
  userPrompt:  z.string(),
  days:        z.array(DayPlanSchema),
  xhsNotes:    XHSAgentOutputSchema.shape.notes,
  packingTips: ContentAgentOutputSchema.shape.packingTips,
  warnings:    ContentAgentOutputSchema.shape.warnings,
  budget:      RoutePlanOutputSchema.shape.budgetEstimate,
  generatedAt: z.string(),
})

export type FullItinerary = z.infer<typeof FullItinerarySchema>
export type DayPlan       = z.infer<typeof DayPlanSchema>
export type POI           = z.infer<typeof POISchema>
export type Activity      = z.infer<typeof ActivitySchema>
export type XHSNote       = z.infer<typeof XHSAgentOutputSchema>['notes'][number]
