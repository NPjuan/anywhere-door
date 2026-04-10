# 架构文档

## 概述

任意门（Anywhere Door）是一个 AI 旅行规划应用。用户填写表单后，AI 生成结构化行程预览，用户确认后启动多 Agent 规划，最终输出完整的多日行程（含地图标注）。

---

## 核心规划流程

```
表单输入（城市/日期/人数/机场/落地时间/酒店/必去地点等）
  ↓ 点击「规划行程」
generatePromptPreview()  →  POST /api/agents/preview-prompt（流式）
  ↓ AI 生成 Prompt 预览，用户可编辑/确认
startPlanning()          →  POST /api/agents/orchestrate-bg（同步，等待所有 Agent 完成）

  orchestrate-bg 内部执行顺序：
  1. poi agent（串行，先跑）      →  推荐地点 + Amap 坐标
  2. route agent（poi 完成后跑）  →  用 poi 地点规划每日行程
     tips agent（与 route 并行） →  打包清单 + 注意事项
     xhs agent（与 route 并行）  →  小红书风格攻略
  3. route 完成后立即写 synthesis.status = 'waiting'（不等 tips/xhs）

  ↓ 前端轮询 GET /api/plans/[id]，检测到 synthesis.status === 'waiting'
POST /api/agents/synthesis-stream（前端调用，流式输出行程 JSON）
  ↓ 流式输出 → 前端实时显示进度 → 写入 Supabase → 展示完整行程
```

### 状态机（useHomeFlow）

```
form → generating → prompt-preview → planning → done
                         ↑
                   interrupt() 回到此步（保留 finalPrompt）
```

---

## 项目结构

```
src/
├── app/
│   ├── page.tsx                      # 主页（表单 + AI预览 + Agent进度 + 行程展示）
│   ├── plans/
│   │   ├── page.tsx                  # 我的计划列表（分页，10条/页）
│   │   └── [id]/page.tsx             # 计划详情页
│   ├── globals.css                   # 全局样式 + Hero 标题动效
│   └── api/
│       ├── plans/
│       │   ├── route.ts              # GET（分页）/ POST（创建）
│       │   └── [id]/route.ts         # GET / PATCH / DELETE
│       ├── amap/
│       │   ├── search/route.ts       # POI 搜索代理
│       │   └── staticmap/route.ts    # 静态地图代理
│       └── agents/
│           ├── preview-prompt/       # 流式生成 Prompt 预览（maxDuration=60）
│           ├── orchestrate-bg/       # 串/并行执行 4 个 Agent（maxDuration=300）
│           ├── synthesis-stream/     # 前端流式 synthesis（maxDuration=300）
│           ├── style/                # POI 推荐（maxDuration=300）
│           ├── route-plan/           # 路线规划（maxDuration=300）
│           ├── content/              # 旅行贴士（maxDuration=300）
│           └── xhs/                  # 小红书笔记（maxDuration=300）
│
├── components/
│   ├── home/
│   │   ├── HeroSection.tsx           # 多语言轮播标题
│   │   ├── HomeForm.tsx              # 主表单（城市/日期/机场/落地返程时间/人数/POI）
│   │   ├── PromptPreviewCard.tsx     # AI 生成预览卡片（含中断按钮）
│   │   ├── PoweredByName.tsx
│   │   └── DeviceIdBadge.tsx
│   ├── agents/
│   │   └── AgentStatusPanel.tsx      # 5 个 Agent 实时进度（哆啦A梦风格提示）
│   ├── itinerary/
│   │   ├── DayTimeline.tsx           # 日程时间线（上午/下午/晚上）
│   │   ├── RouteMap.tsx              # 高德地图（标注 + 连线）
│   │   ├── XHSStyleNote.tsx          # 小红书风格笔记卡片
│   │   └── ExportButton.tsx          # 复制行程 / 分享链接 / 下载图片
│   ├── form/
│   │   ├── PlaceSelect.tsx           # Amap POI 搜索选择器
│   │   └── RefineInput.tsx           # 调整行程输入框（支持 @ 引用地点）
│   └── portal/
│       └── AuroraBackground.tsx      # 背景动效
│
├── hooks/
│   └── useHomeFlow.ts                # 核心状态机 Hook（表单恢复/规划/中断/重启）
│
└── lib/
    ├── stores/
    │   ├── searchStore.ts            # 表单参数（纯内存，刷新后从 DB 恢复）
    │   ├── itineraryStore.ts         # 当前行程 JSON + hydrate()
    │   └── agentStore.ts             # 5 个 Agent 实时状态 + 流式文字
    ├── agents/
    │   ├── runners.ts                # 4 个 Agent 核心函数（直接调用，不走 HTTP）
    │   ├── prompts/index.ts          # 5 个 Agent 的 System Prompt
    │   ├── types.ts                  # Zod schemas（POI/DayPlan/FullItinerary）
    │   └── utils.ts                  # getAIProvider()（DeepSeek/Claude 切换）
    ├── api/maps/AmapClient.ts        # 高德地图客户端
    ├── cities.ts                     # 城市 + 机场数据（IATA code）
    ├── supabase.ts                   # Supabase 客户端
    ├── deviceId.ts                   # 浏览器设备 ID（localStorage）
    ├── itineraryCanvas.ts            # 行程图片导出
    └── utils/jsonParse.ts            # 健壮 JSON 解析（括号栈匹配）
```

---

## Agent 执行架构

### 5 个 Agent 职责

| Agent | 文件 | 职责 | 输入 | 输出 |
|-------|------|------|------|------|
| POI (style) | `runners.runPoiAgent` | 推荐 8-12 个景点，含 Amap 坐标 | destination, prompt, days | `{pois: [{name, latLng, ...}]}` |
| Route | `runners.runRoutePlanAgent` | 按 poi 列表规划每日行程 | pois, startDate, days, travelStyle | `{days: [{morning/afternoon/evening}]}` |
| Tips (content) | `runners.runContentAgent` | 打包清单 + 注意事项 | destination, travelStyle, days | `{packingTips, warnings}` |
| XHS | `runners.runXhsAgent` | 小红书风格攻略笔记 | destination, prompt, days | `{notes: [{title, body, tags}]}` |
| Synthesis | `synthesis-stream/route.ts` | 汇总所有 Agent 结果为完整行程 | synthesis.input（from DB） | `FullItinerary JSON`（流式） |

### 关键设计：runners.ts

`orchestrate-bg` **直接调用** `runners.ts` 里的函数，不走内部 HTTP 请求。这解决了 Vercel 上 `localhost:3000` 无法访问的问题。

### 坐标回填机制

poi agent 返回带 `latLng` 的地点数据，但 route/synthesis 输出的活动里不含坐标。synthesis-stream 在写入 DB 前做后处理：

```
poiLatLngMap（名字→坐标）→ 遍历 parsed.days 每个活动
  → 精确匹配活动名 or 模糊匹配（name.includes(k)）
  → 注入 activity.poi.latLng
```

同时在 synthesis prompt 里也传入坐标字典，要求 AI 主动输出 poi 字段（双保险）。

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
| `agent_progress` | JSONB | 各 Agent 状态 + synthesis.input |
| `planning_params` | JSONB | 完整表单参数（含 finalPrompt），用于刷新恢复 |
| `saved_at` | TIMESTAMPTZ | 创建时间 |

### agent_progress 字段生命周期

```json
{
  "poi":       { "status": "done",    "preview": "颐和园 · 天坛 · 故宫..." },
  "route":     { "status": "done",    "preview": "Day1 北京古都 → Day2 胡同探秘" },
  "tips":      { "status": "running", "preview": "" },
  "xhs":       { "status": "running", "preview": "" },
  "synthesis": {
    "status": "waiting",
    "input": {
      "originCity": "北京", "destCity": "成都",
      "routeDays": [...],
      "poiLatLngMap": { "宽窄巷子": { "lat": 30.67, "lng": 104.05, ... } },
      "packingTips": [], "warnings": [], "xhsNotes": []
    }
  }
}
```

synthesis.status 流转：`idle` → `waiting`（route 完成后写入）→ `running`（前端调用时）→ `done`

---

## 状态管理（Zustand，纯内存）

### searchStore — 表单参数

```typescript
{
  origin:        CityOption | null   // 出发城市（含已选机场代码/名称）
  destination:   CityOption | null   // 目的城市
  startDate:     string              // YYYY-MM-DD
  endDate:       string              // YYYY-MM-DD
  prompt:        string              // 旅行诉求文本
  travelers:     number              // 出行人数（默认1）
  hotelPOI:      PlacePOI | null     // 住宿地点（含坐标）
  mustVisit:     PlacePOI[]          // 必去地点列表
  mustAvoid:     PlacePOI[]          // 避开地点列表
  arrivalTime:   string              // 落地时间 HH:mm
  departureTime: string              // 返程起飞时间 HH:mm
}
```

所有字段都存入 `planning_params.JSONB`，刷新后可完整恢复（城市对象含机场信息）。

### itineraryStore — 当前行程

```typescript
{
  itinerary:  FullItinerary | null
  planId:     string | null
  activeDay:  number              // 当前查看的天数（0-indexed）
}
```

### agentStore — Agent 状态

```typescript
agents: AgentState[]  // 5个：poi / route / tips / xhs / synthesis
// AgentState: { id, status, progress, message, preview, streamChunk }
// streamChunk: synthesis 流式时显示的进度文字（从 JSON 流中提取景点名）
```

---

## API 文档

### GET /api/plans

```
?deviceId=xxx&page=1&limit=10

返回: { plans, total, page, limit, totalPages }
```

### POST /api/plans

```json
{ "deviceId": "dev-xxx", "status": "pending", "planningParams": { ...完整表单 } }
```

### GET /api/plans/[id]

返回完整计划，含 `agent_progress`（包括 `synthesis.input`）和 `itinerary`。

### PATCH /api/plans/[id]

```json
{ "status": "interrupted" }
```

### POST /api/agents/preview-prompt

流式返回 Prompt 预览文本。Body 含表单全量参数。

### POST /api/agents/orchestrate-bg

同步执行（等所有 Agent 完成才返回）。`orchestrate-bg` 直接调用 `runners.ts` 函数，不走 HTTP，兼容 Vercel 和自托管。

```json
{
  "planId": "plan-xxx",
  "originCode": "PEK",
  "destinationCode": "SHA",
  "startDate": "2026-04-10",
  "endDate": "2026-04-12",
  "prompt": "...enriched prompt with [机场][酒店][必去] constraints..."
}
```

### POST /api/agents/synthesis-stream

前端主动调用，从 DB 读 `synthesis.input`，流式输出行程 JSON，写回 DB。

```json
{ "planId": "plan-xxx" }
```

---

## enrichedPrompt 约束格式

用户确认后，`handleConfirm` 将结构化约束拼入 finalPrompt：

```
用户旅行诉求正文...

[机场] 出发：首都国际机场（PEK）；抵达：浦东国际机场（PVG），请将机场作为行程起止 POI
[落地时间] 第一天落地时间为 14:30，请从该时间点开始规划当天行程
[返程时间] 最后一天返程起飞时间为 21:00，请确保行程在此前结束并预留前往机场时间
[人数] 共 3 人出行，请据此调整住宿、餐厅和活动容量
[酒店] 住宿地址：外滩华尔道夫酒店（中山东一路2号，坐标 121.49,31.24），请以酒店为基点规划
[必去] 上海迪士尼乐园（川沙路）
[不去] 请避开以下地点：豫园
```

`route-plan` 和 `synthesis-stream` 解析 `[xxx]` 开头的行，单独注入为强制约束，避免 AI 混在正文里忽略。

---

## 刷新恢复机制

`useHomeFlow` 初始化时：

1. `GET /api/plans?limit=1` 拉取最近一条计划
2. 从 `planning_params` 恢复 searchStore 全量参数（城市对象/机场/POI/时间/finalPrompt）
3. **pending + synthesis 未到 waiting + 超过 5 分钟** → 判定进程异常崩溃，重新发起 `orchestrate-bg`
4. **pending + synthesis 未到 waiting + 5 分钟内** → 后台可能仍在执行，只轮询等待
5. **pending + synthesis 已到 waiting/running/done** → 只轮询，等前端触发流式
6. **done/error/interrupted** → 只恢复表单（暂存 `pendingRestore`，用户主动点击才填入）

---

## Vercel 部署注意事项

- 所有 Agent 路由设置 `export const maxDuration = 300`（需 Vercel Pro，Hobby 限制 60s）
- `orchestrate-bg` 直接调 `runners.ts` 函数，不能用内部 HTTP（`localhost:3000` 在 Serverless 上不可访问）
- 确保环境变量中有 `DEEPSEEK_API_KEY`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`AMAP_SERVER_KEY`、`NEXT_PUBLIC_APP_URL`（填 Vercel 域名）

---

## 常见问题

| 问题 | 根因 | 解决 |
|------|------|------|
| Vercel 上 4 个 Agent 立即失败 | `BASE_URL` 未配置，内部 HTTP 请求打到 `localhost:3000` 连接失败 | 已改为直接调 `runners.ts` 函数 |
| 地图无标点 | synthesis AI 不保留 poi 字段 | 后处理按名字匹配回填坐标（精确+模糊），同时 prompt 要求 AI 主动输出 poi |
| 刷新后 Agent 一直 running | 进程崩溃但 DB 里状态未更新 | 检测 synthesis 未到 waiting + 超 5 分钟，自动重启 orchestrate-bg |
| 重新规划时预览不显示流式 | `finalPrompt` 未清空，遮盖 `previewPrompt` | `START_GENERATING` 同时清空 `finalPrompt` |
| synthesis 输出错误 schema（pois[]） | AI 前置数据为空时自由发挥 | SYNTHESIS_SYSTEM_PROMPT 强制要求 morning/afternoon/evening 结构 |
| route-plan 导致进程 panic | POISchema.latLng 必填，AI 不输出坐标触发 Zod 校验失败，Turbopack 渲染错误时 UTF-8 panic | latLng 改为 optional，prompt 告知不输出 poi |
| synthesis JSON 解析失败 | AI 输出截断或含 markdown 代码块 | `jsonParse.ts` 括号栈匹配算法健壮提取 |
