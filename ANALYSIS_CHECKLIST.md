# ✅ 项目分析检查清单

## 📍 分析范围：行程分享 & 微调功能

---

## 1️⃣ Plans 表现有字段 ✅

### 已验证字段（15 个）

```sql
✅ id              TEXT        -- 主键 (plan-{timestamp}-{random})
✅ device_id       TEXT        -- 设备隔离
✅ status          TEXT        -- pending|done|error|interrupted
✅ title           TEXT        -- 行程标题
✅ summary         TEXT        -- 摘要
✅ destination     TEXT        -- 目的地
✅ start_date      TEXT        -- YYYY-MM-DD
✅ end_date        TEXT        -- YYYY-MM-DD
✅ days_count      INT         -- 天数
✅ budget_low      NUMERIC     -- 最低预算
✅ budget_high     NUMERIC     -- 最高预算
✅ itinerary       JSONB       -- 完整行程
✅ planning_params JSONB       -- 恢复参数
✅ agent_progress  JSONB       -- Agent 状态
✅ saved_at        TIMESTAMPTZ -- 时间戳
```

### 缺失字段（影响分享功能）

```
❌ share_enabled        BOOLEAN     -- 是否启用分享
❌ share_token          TEXT        -- 分享唯一标识
❌ share_expires_at     TIMESTAMPTZ -- 分享过期时间
❌ share_password       TEXT        -- 分享密码（可选）
❌ current_version      INT         -- 当前版本号
```

### SQL 迁移代码位置
- **文件**: `supabase/schema.sql`
- **行号**: 1-96
- **表**: `create table if not exists plans`

**✓ 验证方式**: 查看 schema.sql 和 /api/plans route.ts 的 update 逻辑

---

## 2️⃣ Activity Schema 完整字段 ✅

### 数据结构定义

| 字段 | 类型 | 必填 | 说明 | 位置 |
|-----|------|------|------|------|
| **time** | string | ✅ | "09:00" | types.ts:27 |
| **name** | string | ✅ | 活动名 | types.ts:28 |
| **description** | string | ✅ | 描述 | types.ts:29 |
| **duration** | string | ✅ | "1.5小时" | types.ts:31 |
| **cost** | string | ❌ | "¥100-200" | types.ts:32 |
| **transport** | string | ❌ | 交通方式 | types.ts:33 |
| **poi** | POI | ❌ | 目的地 | types.ts:30 |

### POI 子结构（8 个字段）

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| **id** | string | ✅ | POI ID |
| **name** | string | ✅ | 地点名 |
| **address** | string | ✅ | 地址 |
| **category** | string | ✅ | 分类 |
| **latLng** | {lat, lng} | ❌ | 坐标 |
| **rating** | number | ❌ | 评分 |
| **hours** | string | ❌ | 营业时间 |
| **tips** | string | ❌ | 贴士 |

### 代码位置
- **文件**: `src/lib/agents/types.ts`
- **行号**:
  - ActivitySchema: 26-34
  - POISchema: 15-24
  - FullItinerarySchema: 90-105
  - DayPlanSchema: 36-43

**✓ 验证方式**: Zod schema 校验

---

## 3️⃣ DayTimeline 活动渲染机制 ✅

### 渲染流程图

```
DayTimeline (输入: dayPlans[], activeDay: number)
  ├─ [27-38] 验证输入
  │   └─ Math.max(0, Math.min(activeDay, dayPlans.length - 1))
  ├─ [40-44] 按时段分组
  │   ├─ plan.morning
  │   ├─ plan.afternoon
  │   └─ plan.evening
  ├─ [46-71] 转换为 Timeline items
  │   ├─ 时段标签 (hour label)
  │   └─ 活动卡片 (ActivityCard)
  ├─ [79-97] Day 按钮组
  │   └─ onClick → onDayChange(index)
  ├─ [101-135] 动画切换内容
  │   └─ <motion.div key={safeActiveDay}>
  └─ [141-220] ActivityCard 详情
      ├─ 时间 (蓝色 mono)
      ├─ 名称 (黑色 semibold)
      ├─ 描述 (灰色)
      ├─ 元信息 (duration, cost, address)
      └─ 交通提示 (蓝色图标)
```

### 关键代码行

| 行号 | 功能 | 代码 |
|-----|------|------|
| 27-38 | 安全索引 | `Math.max(0, Math.min(activeDay, ...))` |
| 40-44 | 分组 | `.filter(s => s.activities.length > 0)` |
| 46-71 | 展平 | `sections.flatMap()` |
| 79-97 | Day 按钮 | `dayPlans.map((dp, i) => ...)` |
| 101-135 | 动画 | `<motion.div key={safeActiveDay}>` |
| 176-177 | 时间渲染 | `{activity.time}` |
| 188-189 | 描述 | `{activity.description}` |
| 193-209 | 元信息 | flexbox + 4 个 optional fields |
| 212-217 | 交通 | `{activity.transport}` |

### 微调模式 (refineMode=true)

- ✅ 呼吸灯效果 (CSS animation)
- ✅ 悬停放大 (scale 1.005)
- ✅ 点击回调 (onActivityClick)
- ✅ @ 引用标签

### 代码位置
- **文件**: `src/components/itinerary/DayTimeline.tsx`
- **行数**: 221 行
- **导出**: `DayTimeline` + `ActivityCard` 两个组件

**✓ 验证方式**: 追踪 props 和返回值

---

## 4️⃣ PATCH 接口支持字段 ✅

### 接口定义

**端点**: `PATCH /api/plans/[id]`

**请求体 JSON**:
```typescript
{
  itinerary?:     FullItinerary  // 完整行程对象
  status?:        string         // done|pending|error|interrupted
  agentProgress?: object         // Agent 状态
}
```

### 支持的更新模式

#### 模式 1️⃣：状态更新（不含 itinerary）

```javascript
PATCH /api/plans/plan-xxx
{
  "status": "done",
  "agentProgress": { ... }
}
```

**更新字段**:
- status
- agent_progress
- planning_params (自动 → null)

#### 模式 2️⃣：完整行程更新（含 itinerary）

```javascript
PATCH /api/plans/plan-xxx
{
  "itinerary": { ... 完整 FullItinerary ... }
}
```

**自动提取并更新**:
- status → 'done'
- title ← itinerary.title
- summary ← itinerary.summary
- destination ← itinerary.destination
- days_count ← itinerary.days.length
- budget_low ← itinerary.budget.low
- budget_high ← itinerary.budget.high
- itinerary → 完整 JSONB
- planning_params → null

### 代码位置
- **文件**: `src/app/api/plans/[id]/route.ts`
- **行号**:
  - PATCH 函数: 26-73
  - 模式 1: 36-46
  - 模式 2: 48-72
  - 类型定义: 29-33

**✓ 验证方式**: 查看 Supabase update 调用

---

## 5️⃣ 分享功能难点判断 ✅

### 当前状态

✅ **已有**:
- `/plans/[id]` 页面直接访问
- `ExportButton` 复制分享链接
- 完整行程展示
- 访客「保存到我的计划」功能

❌ **缺失**:
- 分享权限控制 (share_enabled)
- 分享过期时间 (share_expires_at)
- 分享取消功能
- 分享统计/访问日志
- 分享通知

### 难点排序

| 难点 | 优先级 | 难度 | 时间 | 原因 |
|-----|--------|------|------|------|
| 权限检查 | P0 | ⭐ | 2-3d | 需要 DB 字段 + GET 逻辑 |
| 过期控制 | P0 | ⭐ | 1-2d | 时间戳比较 |
| 取消分享 | P0 | ⭐ | 1d | 字段反转 |
| 密码保护 | P1 | ⭐⭐ | 2-3d | 认证中间件 |
| 访问统计 | P1 | ⭐⭐ | 2-3d | 新表 + 日志记录 |
| 分享通知 | P2 | ⭐⭐⭐ | 3-5d | 邮件/推送服务 |
| 短链服务 | P2 | ⭐ | 1-2d | 第三方 API |

### 需要的 SQL 迁移

```sql
ALTER TABLE plans ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS share_password TEXT;

CREATE TABLE IF NOT EXISTS plan_shares (
  id BIGSERIAL PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  viewer_device_id TEXT,
  accessed_at TIMESTAMPTZ,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON plan_shares(plan_id, created_at DESC);
```

### 需要修改的代码

**必改 (3 个)**:
1. `supabase/schema.sql` — 添加字段
2. `src/app/api/plans/[id]/route.ts` — GET 权限检查
3. `src/components/itinerary/ExportButton.tsx` — 分享设置 modal

**新增 (2 个)**:
1. `src/app/api/plans/[id]/share/route.ts` — 分享管理 API
2. `src/components/itinerary/ShareModal.tsx` — 分享设置 UI

---

## 6️⃣ 微调功能难点判断 ✅

### 当前状态

✅ **已有**:
- 「调整行程」按钮 (page.tsx 行 551)
- RefineInput 文本框
- @mention 活动引用
- 活动卡片呼吸灯效果
- handleRefine() 调用 startPlanning()

❌ **缺失**:
- 版本历史记录 (plan_versions 表)
- 版本回滚 API
- 版本选择 UI
- 版本对比
- 单日/单活动微调

### 难点排序

| 难点 | 优先级 | 难度 | 时间 | 原因 |
|-----|--------|------|------|------|
| 版本记录 | P0 | ⭐⭐ | 2-3d | 新表 + 自动快照 |
| 快速回滚 | P0 | ⭐ | 1-2d | 版本切换 API |
| 版本 UI | P1 | ⭐⭐ | 1-2d | 前端组件 |
| 版本对比 | P2 | ⭐⭐⭐ | 2-3d | diff 算法 |
| 单日微调 | P2 | ⭐⭐⭐ | 3-5d | 增量更新 + AI |
| 单活动微调 | P2 | ⭐⭐ | 2-3d | 活动选择 + 微调 |
| 协作编辑 | P3 | ⭐⭐⭐⭐ | 5-7d | 乐观锁 + Conflict 解决 |

### 需要的 SQL 迁移

```sql
CREATE TABLE IF NOT EXISTS plan_versions (
  id BIGSERIAL PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  itinerary JSONB NOT NULL,
  change_type TEXT NOT NULL,  -- initial|refine|manual_edit
  change_description TEXT,
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, version_number)
);

ALTER TABLE plans ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;

CREATE INDEX ON plan_versions(plan_id, version_number DESC);
```

### 需要修改的代码

**必改 (3 个)**:
1. `supabase/schema.sql` — 新表 + 字段
2. `src/app/api/plans/[id]/route.ts` — PATCH 时创建版本
3. `src/app/page.tsx` — handleRefine() 调用版本 API

**新增 (3 个)**:
1. `src/app/api/plans/[id]/versions/route.ts` — 版本 CRUD
2. `src/app/api/plans/[id]/revert/route.ts` — 回滚
3. `src/components/itinerary/VersionSelector.tsx` — 版本 UI

---

## 📊 实现优先级建议

```
┌──────────────────────────────────────────────────────┐
│  🎯 推荐实现顺序                                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Phase 1: 分享基础 (2-3 天) ← 开始                    │
│  ├─ 添加 share_enabled/share_expires_at/share_token  │
│  ├─ GET /plans/[id] 权限检查                         │
│  └─ 分享设置 modal                                   │
│                                                      │
│  Phase 2: 版本管理 (3-5 天)                           │
│  ├─ plan_versions 表                                 │
│  ├─ 版本回滚 API                                      │
│  └─ 版本选择 UI                                       │
│                                                      │
│  Phase 3: 微调稳定性 (2-3 天) ← 依赖 Phase 2         │
│  ├─ 版本自动快照                                     │
│  └─ 快速回滚按钮                                     │
│                                                      │
│  Phase 4: 细粒度微调 (3-5 天)                        │
│  ├─ 单日微调 API                                      │
│  └─ 单活动微调 UI                                     │
│                                                      │
│  Phase 5: 高级特性 (可选，后续)                       │
│  ├─ 分享密码保护                                     │
│  ├─ 分享统计/访问日志                                 │
│  └─ 协作编辑                                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📝 验证检查表

### Phase 1：分享基础 - 验收标准

- [ ] schema.sql 添加 3 个字段
- [ ] GET /plans/[id] 检查 share_enabled
- [ ] GET /plans/[id] 检查 share_expires_at
- [ ] 未授权返回 403
- [ ] ExportButton 显示分享设置按钮
- [ ] 分享设置 modal 可设置过期时间
- [ ] 设置后 DB 更新成功
- [ ] 分享链接复制功能正常

### Phase 2：版本管理 - 验收标准

- [ ] plan_versions 表创建成功
- [ ] 初始规划自动创建 v1
- [ ] 微调后自动创建 v2, v3 ...
- [ ] VersionSelector 显示所有版本
- [ ] 点击版本可查看详情
- [ ] 回滚按钮恢复到指定版本
- [ ] current_version 字段更新

### Phase 3：微调稳定性 - 验收标准

- [ ] 微调前后都有版本记录
- [ ] 可快速切换版本
- [ ] 页面刷新后版本号正确
- [ ] 无意外微调时可快速回滚

### Phase 4：细粒度微调 - 验收标准

- [ ] PATCH /plans/[id]/days/[dayIndex] 端点
- [ ] 单日微调不影响其他天
- [ ] AI 返回结果符合预期
- [ ] 版本历史记录单日编辑

---

## 🎓 关键概念

### Device-based Isolation

```
plans 表通过 device_id 隔离用户数据
├─ 访问时检查 device_id === currentDeviceId
├─ 共享时需要显式 share_enabled = true
└─ 即使 share_enabled = true，也应检查过期时间
```

### Soft Ownership

```
分享链接的所有权
├─ 默认情况：只有 device_id 匹配的用户可见
├─ share_enabled = true：所有人都可见
├─ 访客保存：POST /api/plans 创建新计划（不共享原计划）
└─ 不存在"协作编辑"概念（当前架构）
```

### Immutable Versions

```
版本管理策略
├─ 每次微调创建新版本（不覆盖旧版本）
├─ current_version 指向最新版
├─ 回滚只是改变 current_version 指向
└─ 旧版本在 plan_versions 表中保留
```

---

## 📎 附录：关键代码位置速查

| 功能 | 文件 | 行号 |
|-----|------|------|
| Activity Schema | types.ts | 26-34 |
| POI Schema | types.ts | 15-24 |
| DayTimeline 验证 | DayTimeline.tsx | 27-38 |
| DayTimeline 渲染 | DayTimeline.tsx | 46-71 |
| ActivityCard | DayTimeline.tsx | 141-220 |
| 分享链接 | ExportButton.tsx | 59-66 |
| PATCH 接口 | api/plans/[id]/route.ts | 26-73 |
| 微调入口 | page.tsx | 551-568 |
| 微调 handler | page.tsx | 295-326 |
| Plans 表 | schema.sql | 9-24 |

---

## ✅ 分析完成

**总计验证项**: 6 大项
**实现建议**: 5 个 Phase
**预计工作量**: 14-25 天（全部 Phase）
**立即可做**: Phase 1（2-3 天）

---

