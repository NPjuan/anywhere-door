# Anywhere Door 项目深度分析报告

## 📋 目录
1. [Plans 表现有字段](#plans-表现有字段)
2. [Activity 数据结构](#activity-数据结构)
3. [DayTimeline 活动渲染机制](#daytimeline-活动渲染机制)
4. [PATCH 接口支持字段](#patch-接口支持字段)
5. [分享和微调功能的实现难点](#分享和微调功能的实现难点)

---

## Plans 表现有字段

### 数据库表结构 (supabase/schema.sql)

```sql
create table if not exists plans (
  id               text        primary key,           -- 生成格式: plan-{Date.now()}-{random}
  device_id        text        not null,              -- 设备唯一 ID，用于数据隔离
  status           text        not null default 'done',  -- 'pending' | 'done' | 'error' | 'interrupted'
  title            text        not null default '规划中...',
  summary          text,
  destination      text,
  start_date       text,                              -- YYYY-MM-DD
  end_date         text,                              -- YYYY-MM-DD
  days_count       int         default 0,
  budget_low       numeric     default 0,
  budget_high      numeric     default 0,
  itinerary        jsonb,                             -- 完整 FullItinerary JSON，pending 时为 null
  planning_params  jsonb,                             -- 用于刷新恢复规划，完成后清空
  agent_progress   jsonb,      -- 各 Agent 完成状态快照: {poi: '...', route: '...', tips: '...', xhs: '...', synthesis: '...'}
  saved_at         timestamptz not null default now()
);

-- 索引
create index if not exists plans_device_id_idx on plans (device_id);
create index if not exists plans_saved_at_idx  on plans (saved_at desc);
create index if not exists plans_status_idx    on plans (status);
```

### 字段详解

| 字段 | 类型 | 说明 | 示例 |
|-----|------|------|------|
| `id` | TEXT | 主键，计划唯一标识 | `plan-1704067200000-ab3c2` |
| `device_id` | TEXT | 设备唯一 ID，查询时用于数据隔离 | `device-uuid-xxx` |
| `status` | TEXT | 规划状态 | `pending` \| `done` \| `error` \| `interrupted` |
| `title` | TEXT | 行程标题 | `"7天东京漫步之旅"` |
| `summary` | TEXT | 行程摘要 | `"体验传统文化与现代科技..."` |
| `destination` | TEXT | 目的地城市 | `"东京"` |
| `start_date` | TEXT | 出发日期 | `"2024-12-20"` |
| `end_date` | TEXT | 返回日期 | `"2024-12-27"` |
| `days_count` | INT | 天数 | `7` |
| `budget_low` | NUMERIC | 最低预算 | `5000` |
| `budget_high` | NUMERIC | 最高预算 | `8000` |
| `itinerary` | JSONB | 完整行程 JSON（FullItinerary 类型） | 见下节 |
| `planning_params` | JSONB | 规划参数快照（用于刷新） | 见 POST 请求体 |
| `agent_progress` | JSONB | Agent 执行状态 | `{"poi":"completed","route":"completed",...}` |
| `saved_at` | TIMESTAMPTZ | 创建/更新时间 | `2024-12-15T10:30:00Z` |

### ⚠️ 当前局限

**没有以下字段：**
- ❌ `share_token` — 无专门的分享令牌
- ❌ `visibility` — 无可见性控制（public/private/link-only）
- ❌ `share_url` — 无短链接
- ❌ `share_expires_at` — 无分享过期时间
- ❌ `share_count` — 无分享次数统计
- ❌ `owner_email` — 无所有者邮箱
- ❌ `parent_plan_id` — 无计划版本追溯

---

## Activity 数据结构

### 完整 Schema (src/lib/agents/types.ts)

```typescript
export const ActivitySchema = z.object({
  time:        z.string(),            // "09:00" — HH:mm 格式
  name:        z.string(),            // "早餐后前往浅草寺"
  description: z.string(),            // "参观东京最古老的寺庙，体验传统文化"
  poi:         POISchema.optional(),   // 目的地 POI 信息（含坐标）
  duration:    z.string(),            // "1.5小时" 或 "2小时30分"
  cost:        z.string().optional(),  // "¥100-200" 或 "免费"
  transport:   z.string().optional(),  // "地铁银座线，约15分钟"
})

export const POISchema = z.object({
  id:       z.string(),              // POI 唯一标识
  name:     z.string(),              // "浅草寺"
  address:  z.string(),              // "东京都台东区浅草 2-3-1"
  category: z.string(),              // "景点" | "餐厅" | "购物" | "酒店"
  latLng:   LatLngSchema.optional(),  // 可选坐标 {lat: 35.71..., lng: 139.77...}
  rating:   z.number().optional(),    // 4.5 (0-5 分)
  hours:    z.string().optional(),    // "06:30-17:00"
  tips:     z.string().optional(),    // "早起排队人少，推荐7点抵达"
})
```

### Activity 完整字段表

| 字段 | 类型 | 必填 | 说明 | 示例 |
|-----|------|------|------|------|
| **time** | string | ✅ | 活动时间 | `"09:00"` |
| **name** | string | ✅ | 活动名称 | `"浅草寺参观"` |
| **description** | string | ✅ | 活动描述 | `"参观东京最古老的寺庙"` |
| **duration** | string | ✅ | 活动时长 | `"1.5小时"` |
| **poi** | POI | ❌ | 目的地信息 | 见下表 |
| **cost** | string | ❌ | 消费估算 | `"¥100-200"` / `"免费"` |
| **transport** | string | ❌ | 交通方式 | `"地铁银座线，约15分钟"` |

### POI (Point of Interest) 字段表

| 字段 | 类型 | 必填 | 说明 | 示例 |
|-----|------|------|------|------|
| **id** | string | ✅ | POI 标识 | `"poi_123456"` |
| **name** | string | ✅ | 地点名称 | `"浅草寺"` |
| **address** | string | ✅ | 地址 | `"东京都台东区浅草2-3-1"` |
| **category** | string | ✅ | 分类 | `"景点"` / `"餐厅"` / `"购物"` / `"酒店"` |
| **latLng** | {lat, lng} | ❌ | 坐标 | `{lat: 35.7145, lng: 139.7670}` |
| **rating** | number | ❌ | 评分 | `4.5` |
| **hours** | string | ❌ | 营业时间 | `"06:30-17:00"` |
| **tips** | string | ❌ | 游客贴士 | `"早起人少，推荐7点到"` |

### Activity 数据示例

```json
{
  "time": "09:00",
  "name": "浅草寺参观 + 仲见世通购物",
  "description": "参观东京最古老的寺庙，体验传统祭祀文化，在仲见世通购买伴手礼",
  "duration": "2小时",
  "cost": "¥50-150",
  "transport": "地铁银座线到浅草站，约15分钟",
  "poi": {
    "id": "poi_sensoji",
    "name": "浅草寺",
    "address": "东京都台东区浅草 2-3-1",
    "category": "景点",
    "latLng": {
      "lat": 35.7145,
      "lng": 139.7670
    },
    "rating": 4.5,
    "hours": "06:30-17:00",
    "tips": "早起排队人少，推荐7点抵达"
  }
}
```

### FullItinerary 完整结构

```typescript
export const FullItinerarySchema = z.object({
  id:          z.string(),            // 行程 ID (与 plans.id 对应)
  title:       z.string(),            // "7天东京漫步之旅"
  summary:     z.string(),            // 行程摘要
  destination: z.string(),            // 目的地
  origin:      z.string(),            // 出发地
  startDate:   z.string(),            // "2024-12-20"
  endDate:     z.string(),            // "2024-12-27"
  userPrompt:  z.string(),            // 用户原始输入
  days:        z.array(DayPlanSchema),// 7 个 DayPlan 对象
  xhsNotes:    XHSAgentOutputSchema.shape.notes,  // 小红书笔记数组
  packingTips: ContentAgentOutputSchema.shape.packingTips,  // 打包清单
  warnings:    ContentAgentOutputSchema.shape.warnings,     // 注意事项
  budget:      RoutePlanOutputSchema.shape.budgetEstimate,  // 预算对象 {low, high, currency}
  generatedAt: z.string(),            // "2024-12-15T10:30:00Z"
})
```

---

## DayTimeline 活动渲染机制

### 文件位置
- **文件**: `src/components/itinerary/DayTimeline.tsx` (221 行)

### 核心渲染流程

```typescript
export function DayTimeline({ 
  dayPlans,        // DayPlan[] — 所有天的行程
  activeDay,       // number — 当前选中的天数索引
  onDayChange,     // (day: number) => void
  refineMode,      // boolean — 是否启用微调模式
  onActivityClick  // (activity: Activity) => void — 微调模式回调
}) {
  // 1️⃣ 获取当前天的行程
  const safeActiveDay = Math.max(0, Math.min(activeDay, dayPlans.length - 1));
  const plan = dayPlans[safeActiveDay];

  // 2️⃣ 按时段分组：上午、下午、晚上
  const sections = [
    { label: '上午', activities: plan.morning ?? [] },
    { label: '下午', activities: plan.afternoon ?? [] },
    { label: '晚上', activities: plan.evening ?? [] },
  ].filter(s => s.activities.length > 0);  // 过滤空时段

  // 3️⃣ 转换为 antd Timeline 的 items 数组
  const timelineItems = sections.flatMap(section => [
    // 时段标签
    { icon: <span />, content: <SectionLabel /> },
    // 该时段内的所有活动
    ...section.activities.map(activity => ({
      icon: <BlueDot />,
      content: <ActivityCard activity={activity} />
    }))
  ]);

  return (
    <div>
      {/* Day 选择标签页 */}
      <div className="flex gap-1 overflow-x-auto">
        {dayPlans.map((dp, i) => (
          <button
            onClick={() => onDayChange(i)}
            aria-pressed={i === safeActiveDay}
            style={{
              background: i === safeActiveDay ? '#2563EB' : 'transparent',
              color: i === safeActiveDay ? '#FFFFFF' : '#94A3B8',
            }}
          >
            Day {i + 1}
          </button>
        ))}
      </div>

      {/* 当天行程时间线 */}
      <motion.div
        key={safeActiveDay}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {/* 当天标题 */}
        <div style={{ borderLeft: '3px solid #2563EB' }}>
          <p>第 {safeActiveDay + 1} 天 · {plan.date}</p>
          <h3>{plan.title}</h3>
        </div>

        {/* antd Timeline 组件 */}
        <Timeline items={timelineItems} />
      </motion.div>
    </div>
  );
}
```

### 活动卡片渲染 (ActivityCard)

```typescript
export function ActivityCard({ 
  activity,     // Activity 对象
  refineMode,   // boolean — 是否启用编辑模式
  onClick       // () => void — 编辑回调
}) {
  return (
    <motion.div
      className={`py-3 px-3.5${refineMode ? ' breathe-card' : ''}`}
      whileHover={refineMode ? { backgroundColor: '#EFF6FF', scale: 1.005 } : {}}
      whileTap={refineMode ? { scale: 0.99 } : {}}
      onClick={() => { onClick?.(); }}
    >
      {/* 第1行：时间 + 名称 + (编辑模式) @ 引用标签 */}
      <div className="flex items-baseline gap-2.5 mb-1.5">
        <span className="text-xs font-mono" style={{ color: '#2563EB' }}>
          {activity.time}  {/* "09:00" */}
        </span>
        <h4 className="text-sm font-semibold">
          {activity.name}  {/* "浅草寺参观" */}
        </h4>
        {refineMode && (
          <span className="ml-auto text-xs">@ 引用</span>
        )}
      </div>

      {/* 第2行：描述 */}
      <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
        {activity.description}
      </p>

      {/* 第3行：元信息（时长、费用、地址、交通） */}
      <div className="flex flex-wrap gap-3 mt-2">
        {activity.duration && (
          <span className="flex items-center gap-1 text-xs">
            <Clock size={10} /> {activity.duration}
          </span>
        )}
        {activity.cost && (
          <span className="flex items-center gap-1 text-xs">
            <DollarSign size={10} /> {activity.cost}
          </span>
        )}
        {activity.poi?.address && (
          <span className="flex items-center gap-1 text-xs truncate">
            <MapPin size={10} /> {activity.poi.address}
          </span>
        )}
      </div>

      {/* 第4行：交通提示 */}
      {activity.transport && (
        <div className="flex items-start gap-1.5 mt-2 text-xs">
          <Navigation size={10} />
          <span>{activity.transport}</span>
        </div>
      )}
    </motion.div>
  );
}
```

### 关键渲染行号

| 行号 | 功能 | 代码 |
|------|------|------|
| **27-38** | 验证数据 + 获取当前天 | `Math.max(0, Math.min(activeDay, dayPlans.length - 1))` |
| **40-44** | 按时段分组 | `sections.flatMap()` with `filter(s => s.activities.length > 0)` |
| **46-71** | 转换为 Timeline items | `.flatMap(section => [...])` with label + activities |
| **79-97** | Day 标签页按钮 | `dayPlans.map((dp, i) => ...)` |
| **101-118** | 动画切换天数 | `<motion.div key={safeActiveDay}>` |
| **174-181** | 活动时间渲染 | `{activity.time}` + 蓝色文本 |
| **188-189** | 活动描述 | `{activity.description}` |
| **193-209** | 元信息 flexbox 布局 | 4 个 optional fields |
| **212-217** | 交通提示 | `{activity.transport}` with 蓝色导航图标 |

### 微调模式 (refineMode) 特性

当 `refineMode={true}` 时：
1. **呼吸灯效果**: `BREATHE_STYLE` CSS 注入，`box-shadow` 脉冲动画
2. **悬停放大**: `whileHover={{ scale: 1.005 }}`
3. **点击入库**: `onClick={() => onActivityClick?.(activity)}`
4. **@ 引用标签**: 右上角显示 "@ 引用" 标签
5. **活动卡片可点击**: 整个卡片变为 pointer cursor

---

## PATCH 接口支持字段

### 文件位置
- **文件**: `src/app/api/plans/[id]/route.ts` (97 行)

### PATCH 接口详解

```typescript
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { itinerary, status, agentProgress } = body as {
    itinerary?:     Record<string, unknown>  // FullItinerary JSON
    status?:        string                   // 'done' | 'pending' | 'error' | 'interrupted'
    agentProgress?: Record<string, unknown>  // Agent 状态快照
  }

  // 情况 1️⃣：仅更新状态或 agentProgress（不包含 itinerary）
  if ((status || agentProgress) && !itinerary) {
    const patch: Record<string, unknown> = {}
    if (status) {
      patch.status = status
      patch.planning_params = null  // ⚠️ 自动清空规划参数
    }
    if (agentProgress) patch.agent_progress = agentProgress
    const { error } = await supabase.from('plans').update(patch).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // 情况 2️⃣：更新完整行程（包含 itinerary）
  if (!itinerary) {
    return NextResponse.json({ error: 'Missing itinerary or status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('plans')
    .update({
      status:          'done',
      title:           (itinerary.title as string)       ?? '未命名行程',
      summary:         (itinerary.summary as string)     ?? '',
      destination:     (itinerary.destination as string) ?? '',
      days_count:      Array.isArray(itinerary.days) ? itinerary.days.length : 0,
      budget_low:      (itinerary.budget as { low?: number })?.low  ?? 0,
      budget_high:     (itinerary.budget as { high?: number })?.high ?? 0,
      itinerary,                                          // 完整 JSONB 存储
      planning_params: null,                              // 清空规划参数
    })
    .eq('id', id)

  if (error) {
    console.error('[PATCH /api/plans/[id]]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

### PATCH 支持的更新字段表

| 字段 | 类型 | 何时更新 | 说明 |
|-----|------|---------|------|
| **status** | string | 情况 1 & 2 | `'done'` \| `'pending'` \| `'error'` \| `'interrupted'` |
| **title** | string | 情况 2 | 从 `itinerary.title` 提取，默认 `"未命名行程"` |
| **summary** | string | 情况 2 | 从 `itinerary.summary` 提取 |
| **destination** | string | 情况 2 | 从 `itinerary.destination` 提取 |
| **days_count** | int | 情况 2 | `itinerary.days.length` |
| **budget_low** | numeric | 情况 2 | `itinerary.budget.low ?? 0` |
| **budget_high** | numeric | 情况 2 | `itinerary.budget.high ?? 0` |
| **itinerary** | jsonb | 情况 2 | 完整 FullItinerary JSON |
| **planning_params** | jsonb | 情况 1 & 2 | ⚠️ **自动置为 null** |
| **agent_progress** | jsonb | 情况 1 | Agent 执行状态快照 |

### 请求示例

#### 情况 1：仅更新状态

```bash
PATCH /api/plans/plan-1704067200000-ab3c2
Content-Type: application/json

{
  "status": "done",
  "agentProgress": {
    "poi": "completed",
    "route": "completed",
    "tips": "completed",
    "xhs": "completed",
    "synthesis": "completed"
  }
}
```

**响应**: `{ "ok": true }`

#### 情况 2：更新完整行程

```bash
PATCH /api/plans/plan-1704067200000-ab3c2
Content-Type: application/json

{
  "itinerary": {
    "id": "plan-1704067200000-ab3c2",
    "title": "7天东京漫步之旅",
    "summary": "体验传统与现代的完美融合...",
    "destination": "东京",
    "origin": "北京",
    "startDate": "2024-12-20",
    "endDate": "2024-12-27",
    "userPrompt": "我想体验东京的传统文化...",
    "days": [
      {
        "day": 1,
        "date": "2024-12-20",
        "title": "抵达东京，浅草寺游览",
        "morning": [...],
        "afternoon": [...],
        "evening": [...]
      },
      // ... 6 more days
    ],
    "xhsNotes": [...],
    "packingTips": [...],
    "warnings": [...],
    "budget": { "low": 5000, "high": 8000, "currency": "CNY" },
    "generatedAt": "2024-12-15T10:30:00Z"
  }
}
```

**响应**: `{ "ok": true }`

### ⚠️ 关键注意事项

1. **planning_params 自动清空**: 无论哪种情况，更新完成后 `planning_params` 都会被设为 `null`
2. **不支持的字段操作**:
   - ❌ 无法单独更新 `device_id`（只能创建时指定）
   - ❌ 无法更新 `saved_at`（由数据库自动管理）
   - ❌ 无法更新 `start_date`、`end_date`（通过 `itinerary` 间接更新）
3. **部分字段有默认值**: 如 `title`、`budget_*` 为空时自动填充默认值
4. **状态转换流**: `pending` → `done` (成功) 或 `error` (失败) 或 `interrupted` (中断)

---

## 分享和微调功能的实现难点

### 1️⃣ 行程分享功能分析

#### 现状：✅ 基础分享已实现

**已有功能:**
```typescript
// src/components/itinerary/ExportButton.tsx (行 59-66)
const handleShare = async () => {
  if (!planId) return
  try {
    await navigator.clipboard.writeText(
      `${window.location.origin}/plans/${planId}`
    )
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2500)
  } catch { /* 静默 */ }
}
```

**分享页面结构:**
- `/plans/[id]` — Server Component 预取行程数据
  - 检查 `plan.device_id === 当前device_id` 判断是否所有者
  - 访客显示「保存到我的计划」(POST /api/plans)
  - 所有者显示「返回列表」
  - 所有人都能访问行程详情

#### ⚠️ 实现难点

| 难点 | 现象 | 原因 | 方案 |
|-----|------|------|------|
| **无访问控制** | 任何人知道 ID 就能访问 | 无 `share_token` 或 `visibility` 字段 | 添加字段 + RLS 策略 |
| **无分享管理** | 无法取消分享或设置过期 | plans 表无相关字段 | 迁移: 添加 `share_enabled` + `share_expires_at` |
| **无分享统计** | 无法知道分享次数/访问者 | 无访问日志表 | 新建 `plan_shares` 表记录分享记录 |
| **无密码保护** | 无法为分享链接加密 | 当前架构假设 device_id 隔离 | 添加可选 `share_password` 字段 + 认证中间件 |
| **ID 碰撞风险** | 随机 ID 可能暴露规律 | 伪随机生成: `plan-{Date.now()}-{random}` | 改用 UUID + 短链服务 |
| **无分享通知** | 被分享者无法追踪更新 | 无通知/邮件机制 | 新建 `plan_viewers` 表 + Webhook/Email 服务 |

#### 分享功能实现建议

**第一步：扩展数据库表**

```sql
-- 添加分享相关字段
ALTER TABLE plans ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS share_password TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- 创建分享日志表
CREATE TABLE IF NOT EXISTS plan_shares (
  id BIGSERIAL PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  viewer_device_id TEXT,          -- NULL 表示匿名访客
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accessed_at TIMESTAMPTZ,        -- 访问时间
  user_agent TEXT,                -- 用户设备识别
  ip_address TEXT                 -- 访问 IP (需要隐私考虑)
);

CREATE INDEX ON plan_shares(plan_id);
CREATE INDEX ON plan_shares(shared_at DESC);
```

**第二步：修改 GET /plans/[id] 端点**

```typescript
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // ⚡ 新增：分享权限检查
  if (data.share_enabled === false) {
    const currentDeviceId = req.headers.get('x-device-id') // 从请求头获取
    if (data.device_id !== currentDeviceId) {
      return NextResponse.json({ error: 'Plan is not shared' }, { status: 403 })
    }
  }

  // ⚡ 新增：检查分享过期
  if (data.share_expires_at && new Date(data.share_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Sharing link expired' }, { status: 403 })
  }

  // ⚡ 新增：记录访问日志
  await supabase.from('plan_shares').insert({
    plan_id: id,
    viewer_device_id: null, // 可选
    accessed_at: new Date().toISOString(),
  })

  return NextResponse.json({ plan: data, shared: true })
}
```

**第三步：前端分享面板**

```tsx
// src/components/itinerary/ShareModal.tsx (新建)
export function ShareModal({ planId, isOpen, onClose }: Props) {
  const [shareEnabled, setShareEnabled] = useState(false)
  const [expiresIn, setExpiresIn] = useState<'never' | '7d' | '30d'>('never')
  const [withPassword, setWithPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [shareLink, setShareLink] = useState('')

  const handleShare = async () => {
    const expiresAt = expiresIn === 'never' 
      ? null 
      : new Date(Date.now() + (expiresIn === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000)

    const res = await fetch(`/api/plans/${planId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        share_enabled: shareEnabled,
        share_expires_at: expiresAt,
        share_password: withPassword ? password : null,
      })
    })

    if (res.ok) {
      const token = generateShareToken() // 生成短链
      setShareLink(`${origin}/share/${token}`)
    }
  }

  return (
    <modal>
      <Toggle label="启用分享" checked={shareEnabled} onChange={setShareEnabled} />
      <Select label="过期时间" value={expiresIn} options={['never', '7d', '30d']} onChange={setExpiresIn} />
      <Checkbox label="需要密码" checked={withPassword} onChange={setWithPassword} />
      {withPassword && <Input placeholder="设置分享密码" value={password} onChange={setPassword} />}
      <Button onClick={handleShare}>生成分享链接</Button>
      {shareLink && <CopyableInput value={shareLink} />}
    </modal>
  )
}
```

---

### 2️⃣ 行程微调功能分析

#### 现状：✅ 微调 UI 已完整实现

**已有功能:**
- 「调整行程」按钮 (src/app/page.tsx 行 551-568)
- 微调输入面板 (RefineInput 组件)
- 活动卡片微调选择 (DayTimeline 呼吸灯 + 引用)
- @mention 行程地点搜索

```typescript
// src/app/page.tsx (行 295-326)
const handleRefine = () => {
  const currentItineraryText = itinerary
    ? JSON.stringify({
        title:  itinerary.title,
        days:   itinerary.days?.map(d => ({
          day:   d.day,
          date:  d.date,
          title: d.title,
          morning:   d.morning?.map(a => ({ time: a.time, name: a.name })),
          afternoon: d.afternoon?.map(a => ({ time: a.time, name: a.name })),
          evening:   d.evening?.map(a => ({ time: a.time, name: a.name })),
        })),
      })
    : '';

  const refinePrompt = currentItineraryText
    ? `以下是当前已生成的行程方案（JSON格式）：\n${currentItineraryText}\n\n用户调整意见：${refineFeedback.trim()}\n\n请在保留原有行程框架的基础上，只针对用户提出的问题进行调整，输出完整的新行程方案。`
    : refineFeedback.trim();

  startPlanning({ /* ... */, finalPrompt: refinePrompt });
};
```

#### ⚠️ 实现难点

| 难点 | 现象 | 原因 | 方案 |
|-----|------|------|------|
| **无持久化历史** | 微调后无法回到之前版本 | 无版本控制 | 新建 `plan_versions` 表 |
| **无微调建议** | UI 提示词固定 | 代码硬编码建议 | AI 动态生成建议 + 用户反馈学习 |
| **活动精准定位困难** | 用户难以描述要改的活动 | @mention 搜索受限 | 支持「点击活动 → 自动插入位置引用」 |
| **无冲突检测** | 多个用户共享计划时无法协作 | 无并发控制 | 添加 `version` 字段 + 乐观锁 |
| **微调结果不稳定** | 同一微调请求结果不同 | AI 随机性 + prompt 工程不足 | 改进 prompt + 添加 `adjust_history` 字段 |
| **无撤销机制** | 微调后无法快速回滚 | 缺乏历史版本管理 | 实现「上一版本」快速切换 |
| **更新成本高** | 整个行程重新计算 | 无增量更新机制 | 支持单日/单活动更新 API |

#### 微调功能实现建议

**第一步：版本控制表**

```sql
CREATE TABLE IF NOT EXISTS plan_versions (
  id BIGSERIAL PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  version_number INT NOT NULL,                          -- 1, 2, 3, ...
  itinerary JSONB NOT NULL,                             -- 该版本的完整行程
  change_type TEXT NOT NULL,  -- 'initial' | 'refine' | 'manual_edit'
  change_description TEXT,     -- 用户描述的改动
  user_feedback TEXT,          -- 微调时的用户 Prompt
  created_by_device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, version_number)
);

CREATE INDEX ON plan_versions(plan_id, version_number DESC);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;
```

**第二步：微调 API 端点**

```typescript
// POST /api/plans/[id]/refine
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { feedback, affectedActivities } = await req.json()

  // 1. 获取当前计划
  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!plan?.itinerary) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  // 2. 创建历史版本
  const nextVersion = (plan.current_version ?? 0) + 1
  await supabase.from('plan_versions').insert({
    plan_id: id,
    version_number: plan.current_version,
    itinerary: plan.itinerary,
    change_type: 'refine',
    change_description: feedback,
    user_feedback: feedback,
  })

  // 3. 调用 AI 微调（SSE 流式响应）
  const refinePrompt = `...${feedback}...`
  const newItinerary = await callAIAgentsForRefinement(refinePrompt, plan.itinerary)

  // 4. 更新计划 + 版本号
  await supabase
    .from('plans')
    .update({
      itinerary: newItinerary,
      current_version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ ok: true, version: nextVersion })
}
```

**第三步：前端版本切换**

```tsx
// src/components/itinerary/VersionSelector.tsx (新建)
export function VersionSelector({ planId }: Props) {
  const [versions, setVersions] = useState<PlanVersion[]>([])
  const [currentVersion, setCurrentVersion] = useState(1)

  useEffect(() => {
    fetch(`/api/plans/${planId}/versions`)
      .then(r => r.json())
      .then(d => setVersions(d.versions))
  }, [planId])

  const handleRevert = async (versionNumber: number) => {
    const res = await fetch(`/api/plans/${planId}/revert`, {
      method: 'POST',
      body: JSON.stringify({ versionNumber })
    })
    if (res.ok) {
      setCurrentVersion(versionNumber)
      // 刷新行程
    }
  }

  return (
    <div className="space-y-2">
      <h4>版本历史 (当前: v{currentVersion})</h4>
      {versions.map((v, i) => (
        <div key={i} className="flex items-center justify-between p-2 border rounded">
          <div>
            <p className="font-medium">版本 {v.version_number}</p>
            <p className="text-sm text-gray-500">{v.change_description}</p>
            <p className="text-xs text-gray-400">{formatDate(v.created_at)}</p>
          </div>
          {v.version_number !== currentVersion && (
            <button onClick={() => handleRevert(v.version_number)}>回到此版本</button>
          )}
        </div>
      ))}
    </div>
  )
}
```

**第四步：单日/单活动微调 API**

```typescript
// PATCH /api/plans/[id]/days/[dayIndex] — 仅更新某一天
// PATCH /api/plans/[id]/activities/[activityId] — 仅更新某个活动

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; dayIndex: string }> }
) {
  const { id, dayIndex } = await params
  const { feedback, newActivity } = await req.json()

  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!plan?.itinerary) return

  // 仅对该天的行程调用 AI
  const dayPlan = plan.itinerary.days[Number(dayIndex)]
  const refinedDay = await callAIAgentsForSingleDay({
    dayPlan,
    feedback,
    itinerary: plan.itinerary
  })

  // 更新该天
  const updatedItinerary = {
    ...plan.itinerary,
    days: plan.itinerary.days.map((d, i) =>
      i === Number(dayIndex) ? refinedDay : d
    )
  }

  await supabase
    .from('plans')
    .update({ itinerary: updatedItinerary })
    .eq('id', id)

  return NextResponse.json({ ok: true })
}
```

---

### 3️⃣ 综合实现路线图

#### 优先级排序

```
🔴 P0 — 分享功能基础 (2-3 周)
  ├─ 添加 share_enabled/share_expires_at 字段
  ├─ 实现分享权限检查
  └─ 前端分享设置面板

🟡 P1 — 微调稳定性 (1-2 周)
  ├─ plan_versions 表 + 版本管理 API
  ├─ 前端版本切换 UI
  └─ 快速回滚按钮

🟢 P2 — 高级特性 (3-4 周)
  ├─ 分享密码保护
  ├─ 分享统计 + 访问日志
  ├─ 单日/单活动微调 API
  └─ 协作编辑 (多用户)

⚪ P3 — 可选优化 (后续)
  ├─ 分享通知 + 邮件
  ├─ 短链服务集成
  └─ 分享权限模板
```

#### 技术栈建议

| 需求 | 当前 | 建议 | 理由 |
|-----|------|------|------|
| **版本控制** | 无 | Git-like 版本树 | 支持对比、合并、时间旅行 |
| **访问控制** | device_id 隔离 | ABAC + RLS 策略 | Supabase 原生支持 |
| **短链** | 完整 UUID | TinyURL/bit.ly API | 提高分享链接易用性 |
| **通知** | 无 | Supabase Realtime + PostHog | 实时更新 + 事件追踪 |
| **并发** | 无 | 乐观锁 + Conflict Resolution | 支持多人协作 |

---

## 📊 总结表格

### 分享功能实现难点排序

| 难点 | 优先级 | 实现时间 | 复杂度 | 用户价值 |
|-----|--------|---------|--------|----------|
| 基础分享链接 | P0 | 2-3 天 | ⭐ | ⭐⭐⭐⭐ |
| 分享过期控制 | P0 | 1-2 天 | ⭐ | ⭐⭐⭐ |
| 分享权限检查 | P0 | 2-3 天 | ⭐⭐ | ⭐⭐⭐ |
| 密码保护 | P1 | 3-4 天 | ⭐⭐ | ⭐⭐ |
| 分享统计 | P1 | 2-3 天 | ⭐⭐ | ⭐⭐ |
| 短链服务 | P2 | 1-2 天 | ⭐ | ⭐⭐ |
| 分享通知 | P2 | 3-5 天 | ⭐⭐⭐ | ⭐⭐ |

### 微调功能实现难点排序

| 难点 | 优先级 | 实现时间 | 复杂度 | 用户价值 |
|-----|--------|---------|--------|----------|
| 版本历史记录 | P0 | 2-3 天 | ⭐⭐ | ⭐⭐⭐⭐ |
| 快速回滚 | P0 | 1-2 天 | ⭐ | ⭐⭐⭐⭐ |
| 单日微调 API | P1 | 3-5 天 | ⭐⭐⭐ | ⭐⭐⭐ |
| 单活动微调 | P1 | 2-3 天 | ⭐⭐ | ⭐⭐ |
| 版本对比 | P2 | 3-4 天 | ⭐⭐⭐ | ⭐⭐ |
| 协作编辑 | P3 | 5-7 天 | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Conflict Resolution | P3 | 3-5 天 | ⭐⭐⭐⭐ | ⭐⭐ |

