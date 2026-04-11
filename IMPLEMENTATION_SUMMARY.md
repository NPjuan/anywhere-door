# 🎯 Anywhere Door 行程分享 & 微调功能实现指南

## 📊 快速概览

```
┌─────────────────────────────────────────────────────────────────┐
│                   行程分享 & 微调 — 当前状态                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ 已完成                                                        │
│  ├─ 基础分享链接：/plans/[id] 页面已支持直接访问                │
│  ├─ 活动渲染：DayTimeline 完整实现（221 行）                    │
│  ├─ 行程展示：PlanDetailClient 完整实现（248 行）              │
│  ├─ 微调 UI：RefineInput + 活动卡片点击已完整                   │
│  ├─ 导出功能：复制、下载、分享链接已完整                        │
│  ├─ PATCH 接口：支持更新 itinerary + status + agentProgress    │
│  └─ 版本管理：plans 表含 planning_params 用于恢复               │
│                                                                   │
│  ⚠️ 缺失的关键字段（影响分享功能）                               │
│  ├─ ❌ share_token — 无专门分享令牌                              │
│  ├─ ❌ visibility — 无可见性控制 (public/private)                │
│  ├─ ❌ share_expires_at — 无过期时间                             │
│  ├─ ❌ share_enabled — 无分享启用状态                            │
│  └─ ❌ plan_versions 表 — 无版本历史                             │
│                                                                   │
│  ⚡ 缺失的关键功能（影响微调功能）                               │
│  ├─ ❌ 版本回滚 — 无法快速回到之前版本                          │
│  ├─ ❌ 版本对比 — 无法查看改动详情                              │
│  ├─ ❌ 版本选择 — 无版本历史 UI                                  │
│  ├─ ❌ 单日微调 API — 只能整体重新规划                          │
│  └─ ❌ 冲突解决 — 无协作编辑支持                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ 关键数据结构查询表

### Plans 表（14 个字段）

| 字段 | 类型 | 当前有 | 用于 | 需要 |
|-----|------|--------|------|------|
| `id` | TEXT ✅ | ✓ | PK | - |
| `device_id` | TEXT ✅ | ✓ | 数据隔离 | - |
| `status` | TEXT ✅ | ✓ | 状态管理 | - |
| `title` | TEXT ✅ | ✓ | 显示 | - |
| `summary` | TEXT ✅ | ✓ | 显示 | - |
| `destination` | TEXT ✅ | ✓ | 显示 | - |
| `start_date` | TEXT ✅ | ✓ | 显示 | - |
| `end_date` | TEXT ✅ | ✓ | 显示 | - |
| `days_count` | INT ✅ | ✓ | 显示 | - |
| `budget_low` | NUMERIC ✅ | ✓ | 显示 | - |
| `budget_high` | NUMERIC ✅ | ✓ | 显示 | - |
| `itinerary` | JSONB ✅ | ✓ | 核心内容 | - |
| `planning_params` | JSONB ✅ | ✓ | 恢复规划 | - |
| `agent_progress` | JSONB ✅ | ✓ | 状态追踪 | - |
| `saved_at` | TIMESTAMPTZ ✅ | ✓ | 排序 | - |
| **`share_enabled`** | BOOLEAN ❌ | ✗ | **分享控制** | **需要** |
| **`share_token`** | TEXT ❌ | ✗ | **分享 ID** | **需要** |
| **`share_expires_at`** | TIMESTAMPTZ ❌ | ✗ | **过期控制** | **需要** |
| **`current_version`** | INT ❌ | ✗ | **版本管理** | **需要** |

### Activity 对象（7 个字段）

```typescript
{
  time: "09:00",                           // ✅ 必填
  name: "浅草寺参观",                      // ✅ 必填
  description: "参观东京最古老的寺庙",    // ✅ 必填
  duration: "1.5小时",                     // ✅ 必填
  cost: "¥100-200",                        // ❌ 可选（推荐有）
  transport: "地铁银座线，15分钟",        // ❌ 可选（推荐有）
  poi: {                                   // ❌ 可选（推荐有）
    id, name, address, category, latLng, rating, hours, tips
  }
}
```

---

## 2️⃣ DayTimeline 活动渲染流程

```
DayTimeline (227 行)
  ↓
  1. 验证输入 (行 27-38)
     └─ Math.max(0, Math.min(activeDay, dayPlans.length - 1))
  ↓
  2. 按时段分组 (行 40-44)
     ├─ sections[0] = { label: '上午', activities: plan.morning }
     ├─ sections[1] = { label: '下午', activities: plan.afternoon }
     └─ sections[2] = { label: '晚上', activities: plan.evening }
  ↓
  3. 转换为 Timeline items (行 46-71)
     ├─ 时段标签 icon + content
     └─ 活动卡片 icon (蓝点) + ActivityCard component
  ↓
  4. Day 按钮 UI (行 79-97)
     ├─ 按钮行：Day 1, Day 2, ..., Day N
     └─ 点击 → onDayChange(index)
  ↓
  5. 当天内容展示 (行 101-135)
     ├─ 动画切换 <motion.div key={safeActiveDay}>
     ├─ 当天标题 + date
     └─ antd Timeline component
  ↓
  ActivityCard 渲染 (行 141-220)
     ├─ 第1行：时间 + 名称 + (@ 引用标签)
     ├─ 第2行：描述
     ├─ 第3行：meta (duration, cost, address)
     └─ 第4行：transport 提示
```

### 关键代码行

```typescript
// 行 27-38：获取当前天
const safeActiveDay = Math.max(0, Math.min(activeDay, dayPlans.length - 1));
const plan = dayPlans[safeActiveDay];

// 行 40-44：分组
const sections = [
  { label: '上午', labelEn: 'Morning', activities: plan.morning ?? [] },
  // ... 下午、晚上
].filter((s) => s.activities.length > 0);

// 行 46-71：展平为 Timeline items
const timelineItems = sections.flatMap((section) => [
  { icon: <span />, content: <SectionLabel /> },
  ...section.activities.map((activity) => ({
    icon: <BlueDot />,
    content: <ActivityCard activity={activity} />
  }))
])

// 行 176-177：时间渲染（蓝色 mono 字体）
<span style={{ color: '#2563EB', fontFamily: 'monospace' }}>
  {activity.time}
</span>

// 行 188-189：描述渲染
<p style={{ color: '#64748B' }}>
  {activity.description}
</p>

// 行 193-209：元信息 flexbox 布局
<div className="flex flex-wrap gap-3 mt-2">
  {activity.duration && <span><Clock size={10} /> {activity.duration}</span>}
  {activity.cost && <span><DollarSign size={10} /> {activity.cost}</span>}
  {activity.poi?.address && <span><MapPin size={10} /> {activity.poi.address}</span>}
</div>
```

---

## 3️⃣ PATCH /api/plans/[id] 支持字段

### 接口签名

```typescript
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json()
  const { itinerary, status, agentProgress } = body
  // ...
}
```

### 两种更新模式

#### 模式 A：状态更新（不含 itinerary）

```bash
PATCH /api/plans/plan-xxx
Content-Type: application/json

{
  "status": "done",              # ✅ 支持
  "agentProgress": {             # ✅ 支持
    "poi": "completed",
    "route": "completed",
    "tips": "completed",
    "xhs": "completed",
    "synthesis": "completed"
  }
}
```

**更新字段**:
- `status` → 'done' | 'pending' | 'error' | 'interrupted'
- `agent_progress` → JSONB
- `planning_params` → 自动置为 null ⚠️

#### 模式 B：完整行程更新（含 itinerary）

```bash
PATCH /api/plans/plan-xxx
Content-Type: application/json

{
  "itinerary": {                 # ✅ 必填
    "id": "plan-xxx",
    "title": "7天东京",
    "summary": "...",
    "destination": "东京",
    "origin": "北京",
    "startDate": "2024-12-20",
    "endDate": "2024-12-27",
    "userPrompt": "...",
    "days": [...],
    "xhsNotes": [...],
    "packingTips": [...],
    "warnings": [...],
    "budget": { "low": 5000, "high": 8000, "currency": "CNY" },
    "generatedAt": "2024-12-15T10:30:00Z"
  }
}
```

**自动提取并更新字段**:
- `status` → 自动设为 'done'
- `title` ← `itinerary.title`
- `summary` ← `itinerary.summary`
- `destination` ← `itinerary.destination`
- `days_count` ← `itinerary.days.length`
- `budget_low` ← `itinerary.budget.low`
- `budget_high` ← `itinerary.budget.high`
- `itinerary` → 完整 JSONB
- `planning_params` → 自动置为 null ⚠️

---

## 4️⃣ 分享功能实现路线

### 第 1 阶段：基础分享（当前状态 → 完整）

**任务列表**:
1. ✅ 已有：`/plans/[id]` 页面可直接访问
2. ✅ 已有：`ExportButton` 有「分享链接」按钮
3. ❌ 缺少：分享权限检查 (share_enabled 字段)
4. ❌ 缺少：分享过期控制 (share_expires_at 字段)
5. ❌ 缺少：分享取消功能

**SQL 迁移脚本**:
```sql
ALTER TABLE plans 
  ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- 对于现有行程，默认只有所有者可见
UPDATE plans SET share_enabled = false WHERE share_enabled IS NULL;
```

**修改的文件**:
- `src/app/api/plans/[id]/route.ts` (GET)
  - 添加分享权限检查逻辑
  - 检查 `share_expires_at` 是否过期
  
- `src/components/itinerary/ExportButton.tsx`
  - 添加「分享设置」modal
  - 支持启用/禁用分享、设置过期时间

**影响范围**: 中等 (改动 2-3 个文件，新增 1 个组件)

---

### 第 2 阶段：版本管理（微调基础）

**任务列表**:
1. ❌ 缺少：plan_versions 表记录版本历史
2. ❌ 缺少：current_version 字段指向当前版本
3. ❌ 缺少：版本回滚 API
4. ❌ 缺少：版本历史 UI

**SQL 迁移脚本**:
```sql
-- 版本历史表
CREATE TABLE IF NOT EXISTS plan_versions (
  id BIGSERIAL PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  itinerary JSONB NOT NULL,
  change_type TEXT NOT NULL,  -- 'initial' | 'refine' | 'manual_edit'
  change_description TEXT,
  user_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, version_number)
);

-- 添加字段到 plans 表
ALTER TABLE plans ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;

CREATE INDEX ON plan_versions(plan_id, version_number DESC);
```

**新增 API 端点**:
- `POST /api/plans/[id]/versions` — 列出所有版本
- `POST /api/plans/[id]/revert` — 回滚到指定版本
- `POST /api/plans/[id]/refine` — 微调（自动创建新版本）

**新增前端组件**:
- `src/components/itinerary/VersionSelector.tsx` — 版本选择面板
- 版本卡片展示：版本号、改动描述、创建时间、回滚按钮

**影响范围**: 大 (改动 3-4 个文件，新增 3-4 个 API 端点和 2-3 个前端组件)

---

### 第 3 阶段：高级分享（可选）

**任务列表**:
1. ❌ 缺少：分享密码保护
2. ❌ 缺少：分享统计 (访问次数、访问者)
3. ❌ 缺少：分享通知 (邮件/推送)
4. ❌ 缺少：短链服务

**SQL 迁移脚本**:
```sql
-- 分享相关字段
ALTER TABLE plans 
  ADD COLUMN IF NOT EXISTS share_password TEXT,
  ADD COLUMN IF NOT EXISTS share_view_count INT DEFAULT 0;

-- 分享访问日志表
CREATE TABLE IF NOT EXISTS plan_shares (
  id BIGSERIAL PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  viewer_device_id TEXT,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accessed_at TIMESTAMPTZ,
  user_agent TEXT,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE INDEX ON plan_shares(plan_id);
CREATE INDEX ON plan_shares(shared_at DESC);
```

**影响范围**: 很大 (复杂度高，涉及多个系统)

---

## 5️⃣ 微调功能实现路线

### 第 1 阶段：版本历史（快速回滚）

**前置条件**: 完成分享功能第 2 阶段 (plan_versions 表)

**任务列表**:
1. ✅ 微调 UI 已实现：「调整行程」按钮、RefineInput
2. ✅ 已有：`handleRefine()` 函数调用 startPlanning()
3. ❌ 缺少：微调后自动创建版本快照
4. ❌ 缺少：版本选择 UI
5. ❌ 缺少：快速回滚按钮

**修改的文件**:
- `src/app/page.tsx` (handleRefine 函数)
  - 微调后自动调用 POST /api/plans/[id]/versions
  
- `src/components/itinerary/VersionSelector.tsx` (新建)
  - 展示版本列表
  - 选择版本后调用回滚 API

**影响范围**: 中等 (改动 1-2 个文件，新增 1-2 个组件)

---

### 第 2 阶段：细粒度微调（单日/单活动）

**任务列表**:
1. ❌ 缺少：PATCH /api/plans/[id]/days/[dayIndex] 端点
2. ❌ 缺少：PATCH /api/plans/[id]/activities/[id] 端点
3. ❌ 缺少：前端 UI 支持单日选择、单活动选择

**新增 API 端点**:
```typescript
// PATCH /api/plans/[id]/days/[dayIndex]
// 仅更新某一天，而不是整个行程

// PATCH /api/plans/[id]/activities/[id]
// 仅更新某个活动
```

**修改的文件**:
- `src/app/api/plans/[id]/route.ts`
  - 添加动态路由处理 `/days/[dayIndex]`
  
- `src/components/itinerary/DayTimeline.tsx`
  - 添加"仅编辑此天"按钮
  - 支持单天微调 UI

**影响范围**: 大 (新增 2 个 API 端点，改动 1-2 个前端组件)

---

## 📌 快速参考：我需要改哪些文件？

### 分享功能最小实现

```
🔵 必改
├─ supabase/schema.sql                 [新增字段] share_enabled, share_expires_at, share_token
├─ src/app/api/plans/[id]/route.ts    [修改 GET]  添加分享权限检查
└─ src/components/itinerary/ExportButton.tsx
                                       [修改]     添加分享设置 modal

🟣 新增
├─ src/app/api/plans/[id]/share/route.ts
                                       [新增 POST] 更新分享设置
└─ src/components/itinerary/ShareModal.tsx
                                       [新增]     分享设置面板

💡 时间：2-3 天
```

### 微调功能最小实现

```
🔵 必改
├─ supabase/schema.sql                 [新增表] plan_versions, [新增字段] current_version
├─ src/app/api/plans/[id]/route.ts    [修改 PATCH] 自动创建版本快照
└─ src/app/page.tsx                    [修改] handleRefine() 调用版本 API

🟣 新增
├─ src/app/api/plans/[id]/versions/route.ts
                                       [新增 GET/POST] 版本管理
├─ src/app/api/plans/[id]/revert/route.ts
                                       [新增 POST] 版本回滚
└─ src/components/itinerary/VersionSelector.tsx
                                       [新增]     版本选择 UI

💡 时间：3-5 天
```

---

## 🎓 核心概念对齐

### 当前架构理解

```
┌─────────────────┐
│  page.tsx       │ ← 用户交互入口
│  (useHomeFlow)  │   
└────────┬────────┘
         ↓
┌─────────────────┐
│ orchestrate API │ ← SSE 流式执行 5 个 Agent
└────────┬────────┘
         ↓
┌─────────────────┐
│  plans 表       │ ← 存储完整行程 (itinerary JSONB)
│  (Supabase)     │
└────────┬────────┘
         ↓
┌─────────────────┐
│  plans/[id]     │ ← 展示页面（分享入口）
│  PlanDetailClient│
└─────────────────┘
```

### 与分享/微调的交互

```
分享流程:
  plans/[id] 页面
    ↓
  判断 share_enabled = true?
    ├─ 是 → 允许访问
    ├─ 否 + device_id 不匹配 → 拒绝 403
    └─ 检查 share_expires_at 是否过期?

微调流程:
  "调整行程" 按钮
    ↓
  startPlanning(refinePrompt)
    ↓
  PATCH /api/plans/[id]
    ├─ 自动创建 plan_version 记录
    ├─ 更新 plans.itinerary
    ├─ 更新 plans.current_version
    └─ itineraryStore 更新显示
```

---

## 📚 相关代码片段速查表

| 需求 | 文件 | 行号 | 代码 |
|-----|------|------|------|
| 获取当前行程 | DayTimeline.tsx | 27-38 | `dayPlans[safeActiveDay]` |
| 渲染活动时间 | DayTimeline.tsx | 176-177 | `{activity.time}` (蓝色) |
| 渲染活动描述 | DayTimeline.tsx | 188-189 | `{activity.description}` |
| 元信息布局 | DayTimeline.tsx | 193-209 | flexbox 4 个 optional |
| 分享链接生成 | ExportButton.tsx | 59-66 | `/plans/${planId}` |
| 微调入口 | page.tsx | 551-568 | "调整行程" 按钮 |
| 微调 prompt 构建 | page.tsx | 295-315 | JSON 序列化 + prompt |
| 更新行程 | api/plans/[id] | 26-72 | PATCH itinerary |
| 保存行程 | api/plans/[id] | 78-121 | POST deviceId + itinerary |

---

## ✨ 总结

| 功能 | 优先级 | 难度 | 时间 | 关键文件数 |
|-----|--------|------|------|-----------|
| 分享基础 | P0 | ⭐ | 2-3d | 2-3 |
| 版本管理 | P1 | ⭐⭐ | 3-5d | 4-5 |
| 细粒度微调 | P2 | ⭐⭐⭐ | 3-5d | 3-4 |
| 高级分享 | P3 | ⭐⭐⭐ | 5-7d | 4-5 |

**建议实现顺序**: 分享基础 → 版本管理 → 细粒度微调 → 高级分享

