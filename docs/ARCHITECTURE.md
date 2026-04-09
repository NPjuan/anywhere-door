# 架构文档

## 概述

任意门（Anywhere Door）是一个 AI 旅行规划应用。用户填写表单后，AI 生成结构化行程预览，用户确认后启动多 Agent 并行规划，最终输出完整的多日行程。

---

## 核心规划流程

```
表单输入
  ↓ 点击「规划行程」
generatePromptPreview()        → POST /api/agents/preview-prompt（流式）
  ↓ AI 生成 Prompt 预览，用户可编辑
startPlanning()                → POST /api/agents/orchestrate-bg（202 立即返回）
  ↓ 后台并行执行 4 个 Agent
轮询 GET /api/plans/[id]       → 检测 synthesis.status === 'waiting'
  ↓ 前端发起 synthesis 流式请求
POST /api/agents/synthesis-stream（流式输出行程 JSON）
  ↓ 写入 Supabase，前端展示结果
```

### 状态机（useHomeFlow）

```
form → generating → prompt-preview → planning → done
                         ↑
                    interrupt() 回到此步
```

---

## 项目结构

```
src/
├── app/
│   ├── page.tsx                    # 主页 UI
│   ├── plans/
│   │   ├── page.tsx               # 我的计划列表（分页）
│   │   └── [id]/page.tsx          # 计划详情
│   └── api/
│       ├── plans/
│       │   ├── route.ts           # GET（分页列表）/ POST（创建）
│       │   └── [id]/route.ts      # GET / PATCH / DELETE
│       └── agents/
│           ├── preview-prompt/    # 流式生成 Prompt 预览
│           ├── orchestrate-bg/    # 后台并行执行 4 个 Agent
│           ├── synthesis-stream/  # 前端调用的流式 synthesis
│           ├── style/             # POI 推荐 Agent
│           ├── route-plan/        # 路线规划 Agent
│           ├── content/           # 旅行贴士 Agent
│           └── xhs/               # 小红书风格笔记 Agent
│
├── components/
│   ├── home/
│   │   ├── HeroSection.tsx        # 标题 + 多语言轮播
│   │   ├── HomeForm.tsx           # 主表单（城市/日期/航班/POI）
│   │   ├── PromptPreviewCard.tsx  # AI 生成预览卡片
│   │   ├── PoweredByName.tsx
│   │   └── DeviceIdBadge.tsx
│   ├── agents/
│   │   └── AgentStatusPanel.tsx   # 5 个 Agent 实时进度
│   ├── itinerary/
│   │   ├── DayTimeline.tsx        # 日程时间线
│   │   ├── RouteMap.tsx           # 高德地图
│   │   ├── XHSStyleNote.tsx       # 小红书风格笔记
│   │   └── ExportButton.tsx       # 复制 / 分享链接 / 下载
│   ├── form/
│   │   ├── PlaceSelect.tsx        # Amap POI 搜索选择
│   │   └── RefineInput.tsx        # 调整行程输入框
│   └── portal/
│       └── AuroraBackground.tsx   # 背景动效
│
├── hooks/
│   └── useHomeFlow.ts             # 核心状态机 Hook
│
└── lib/
    ├── stores/
    │   ├── searchStore.ts         # 表单参数（纯内存）
    │   ├── itineraryStore.ts      # 当前行程 JSON
    │   └── agentStore.ts          # Agent 实时状态
    ├── agents/
    │   ├── prompts/index.ts       # 5 个 Agent 的 System Prompt
    │   ├── types.ts               # Zod schemas（POI/DayPlan/FullItinerary）
    │   └── utils.ts               # getAIProvider()
    ├── cities.ts                  # 城市 + 机场数据
    ├── supabase.ts                # Supabase 客户端
    ├── deviceId.ts                # 浏览器设备 ID（localStorage）
    ├── itineraryCanvas.ts         # 行程图片导出
    └── utils/
        └── jsonParse.ts           # 健壮 JSON 解析（处理 AI 输出）
```

---

## 5 个 Agent

| Agent | 路由 | 职责 | 执行方式 |
|-------|------|------|----------|
| POI (style) | `/api/agents/style` | 推荐 8-12 个目的地景点 | `generateObject` |
| Route | `/api/agents/route-plan` | 按日规划行程路线 | `generateObject` |
| Tips (content) | `/api/agents/content` | 打包清单 + 注意事项 | `generateObject` |
| XHS | `/api/agents/xhs` | 小红书风格攻略笔记 | `generateObject` |
| Synthesis | `/api/agents/synthesis-stream` | 汇总前 4 个 Agent 输出为完整行程 | `streamText`（前端流式） |

前 4 个在 `orchestrate-bg` 中后台并行执行；Synthesis 由前端在轮询发现 `synthesis.status === 'waiting'` 时主动调用，实现流式输出。

---

## 数据库（Supabase）

### plans 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT | `plan-{timestamp}-{random}` |
| `device_id` | TEXT | 浏览器设备 ID |
| `status` | TEXT | `pending` / `done` / `error` / `interrupted` |
| `title` | TEXT | 行程标题 |
| `destination` | TEXT | 目的地城市 |
| `start_date` | TEXT | YYYY-MM-DD |
| `end_date` | TEXT | YYYY-MM-DD |
| `days_count` | INT | 天数 |
| `budget_low` | NUMERIC | 预算下限（元） |
| `budget_high` | NUMERIC | 预算上限（元） |
| `itinerary` | JSONB | 完整行程（FullItinerary schema） |
| `agent_progress` | JSONB | `{poi: {status, preview}, ..., synthesis: {status, input}}` |
| `planning_params` | JSONB | 表单完整参数，用于刷新后恢复 |
| `saved_at` | TIMESTAMPTZ | 创建时间 |

### agent_progress 字段结构

```json
{
  "poi":       { "status": "done",    "preview": "颐和园 · 天坛 · 故宫..." },
  "route":     { "status": "done",    "preview": "Day1 北京古都 → Day2 胡同探秘" },
  "tips":      { "status": "done",    "preview": "防晒霜 / 舒适鞋 / 雨伞" },
  "xhs":       { "status": "done",    "preview": "北京必去！5个..." },
  "synthesis": { "status": "waiting", "input": { "originCity": "...", "routeDays": [...] } }
}
```

`synthesis.status` 生命周期：`idle` → `waiting`（后台写入，含 input）→ `running`（前端调 synthesis-stream）→ `done`

---

## 状态管理（Zustand）

### searchStore — 表单参数

```typescript
{
  origin:        CityOption | null   // 出发城市（含已选机场）
  destination:   CityOption | null   // 目的城市
  startDate:     string              // YYYY-MM-DD
  endDate:       string              // YYYY-MM-DD
  prompt:        string              // 旅行诉求
  travelers:     number              // 出行人数
  hotelPOI:      PlacePOI | null     // 住宿 POI
  mustVisit:     PlacePOI[]          // 必去地点
  mustAvoid:     PlacePOI[]          // 避开地点
  arrivalTime:   string              // 落地时间 HH:mm
  departureTime: string              // 返程起飞 HH:mm
}
```

纯内存，无持久化。刷新后通过 `planning_params` 从 DB 恢复。

### itineraryStore — 当前行程

```typescript
{
  itinerary:  FullItinerary | null
  planId:     string | null
  activeDay:  number
}
```

### agentStore — Agent 状态

```typescript
agents: AgentState[]  // 5 个 Agent：poi / route / tips / xhs / synthesis
// 每个 AgentState: { id, status, progress, message, preview, streamChunk }
```

---

## API 文档

### GET /api/plans

```
?deviceId=xxx&page=1&limit=10

返回:
{
  plans: PlanRow[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

### POST /api/plans

创建 pending 计划，Body：

```json
{
  "deviceId": "dev-xxx",
  "status": "pending",
  "planningParams": { ...完整表单参数 }
}
```

### GET /api/plans/[id]

返回完整计划，含 `agent_progress` 和 `itinerary`。

### PATCH /api/plans/[id]

```json
{ "status": "interrupted" }
// 或
{ "agentProgress": { ... } }
```

### POST /api/agents/preview-prompt

流式返回 Prompt 预览文本。Body 含表单全量参数（城市、日期、诉求、机场、落地时间等）。

### POST /api/agents/orchestrate-bg

启动后台规划，立即返回 `202`，Body：

```json
{
  "planId": "plan-xxx",
  "originCode": "PEK",
  "destinationCode": "SHA",
  "startDate": "2026-04-10",
  "endDate": "2026-04-12",
  "prompt": "...enriched prompt..."
}
```

### POST /api/agents/synthesis-stream

前端主动调用，流式输出行程 JSON。Body：

```json
{ "planId": "plan-xxx" }
```

从 `agent_progress.synthesis.input` 读取输入数据，流式执行并写回 DB。

---

## enrichedPrompt 约束格式

`handleConfirm` 在用户确认后，将结构化约束拼入 finalPrompt：

```
[机场] 出发：首都国际机场（PEK）；抵达：浦东国际机场（PVG）
[落地时间] 第一天落地时间为 14:30，请从该时间点开始规划当天行程
[返程时间] 最后一天返程起飞时间为 20:00，请确保行程在此前结束
[人数] 共 3 人出行，请据此调整住宿、餐厅和活动容量
[酒店] 住宿地址：外滩华尔道夫酒店（中山东一路2号，坐标 121.49,31.24）
[必去] 上海迪士尼乐园（川沙路）
[不去] 请避开以下地点：豫园
```

`route-plan` 和 `synthesis-stream` 都会解析 `[xxx]` 开头的行，单独列为强制约束。

---

## 刷新恢复机制

页面加载时 `useHomeFlow` 的 init effect：

1. 拉取最近一条计划（`GET /api/plans?limit=1`）
2. 读取 `planning_params`，恢复 searchStore 全量表单参数（城市对象、机场、时间、POI 等）
3. 若 `status === 'pending'`：恢复 Agent 进度 UI，继续轮询
4. 其他状态（done/error/interrupted）：只恢复表单，不进入规划流程

---

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `planning_params` 为 null | 旧版 synthesis-stream 会清空该字段 | 已修复，不再清空 |
| 行程忽略机场/酒店约束 | enrichedPrompt 约束行未被 Agent 识别 | 已修复，route-plan 和 synthesis 都解析 `[xxx]` 约束行 |
| date 字段显示「第一天」 | AI 未按 YYYY-MM-DD 格式输出 | Zod regex 约束 + prompt 明确要求 + 前端正则校验兜底 |
| synthesis JSON 解析失败 | AI 输出截断或包含 markdown 代码块 | `jsonParse.ts` 使用括号栈匹配算法健壮提取 |
