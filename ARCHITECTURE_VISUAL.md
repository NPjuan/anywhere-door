# Anywhere Door — 架构可视化和快速参考

## 🎯 整体数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                      用户交互层 (Frontend)                       │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  页面: /src/app/page.tsx (主页 - 1512 行)             │   │
│  │  ├─ 表单: SearchForm                                 │   │
│  │  │  ├─ CityAutocomplete (城市选择)                  │   │
│  │  │  ├─ DateRangePicker (日期)                      │   │
│  │  │  ├─ PromptInput (旅行诉求)                      │   │
│  │  │  └─ TravelStylePicker (风格预设)                │   │
│  │  ├─ 预览: Prompt 预览 (编辑框)                      │   │
│  │  ├─ 执行: AgentStatusPanel (5 个 Agent 进度)       │   │
│  │  └─ 结果: (行程展示 in itinerary page)             │   │
│  └────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  状态管理: Zustand Stores (/src/lib/stores)          │   │
│  │  ├─ searchStore      → origin, destination, dates, prompt  │
│  │  ├─ itineraryStore   → 行程 JSON, activeDay, planId      │
│  │  ├─ agentStore       → 5 个 Agent 状态, 流式输出          │
│  │  └─ flightStore      → [可能废弃]                         │
│  └────────────────────────────────────────────────────────┘   │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  数据持久化: localStorage + Supabase                   │   │
│  │  ├─ localStorage: 搜索参数, 设备 ID                  │   │
│  │  └─ Supabase: plans 表 (完整行程 + 进度)            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API 层 (Backend Routes)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 1️⃣ POST /api/agents/preview-prompt                    │  │
│  │    LLM 流式生成 Prompt 预览                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 2️⃣ POST /api/agents/orchestrate (SSE)               │  │
│  │    ├─ 并行 Agent 执行:                               │  │
│  │    │  ├─ /api/agents/poi       (POI 推荐)          │  │
│  │    │  ├─ /api/agents/route-plan (路线规划)         │  │
│  │    │  ├─ /api/agents/content    (旅行贴士)         │  │
│  │    │  └─ /api/agents/xhs        (小红书笔记)       │  │
│  │    ├─ 轮询 /api/plans/[id] 获取进度                │  │
│  │    └─ synthesis Agent 汇总生成 FullItinerary       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 3️⃣ 计划管理:                                         │  │
│  │    GET  /api/plans?deviceId=xxx   → 列表            │  │
│  │    POST /api/plans                → 创建            │  │
│  │    GET  /api/plans/[id]           → 查询 + 进度    │  │
│  │    DELETE /api/plans/[id]         → 删除            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 AI 引擎 & 外部服务                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ DeepSeek (默认) / Claude (备用)                        │  │
│  │  - Prompt 预览 (预强化)                               │  │
│  │  - 5 个 Agent 的系统 Prompt:                          │  │
│  │    • POI Agent: 地点推荐                             │  │
│  │    • Route Agent: 日程规划                           │  │
│  │    • Tips Agent: 旅行贴士                            │  │
│  │    • XHS Agent: 小红书风格                           │  │
│  │    • Synthesis: 汇总编排                             │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 高德地图 (Amap)                                        │  │
│  │  - /api/amap/search    → POI 搜索                    │  │
│  │  - /api/amap/staticmap → 静态地图                    │  │
│  │  - 前端 RouteMap 组件集成                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Supabase (数据库 + 认证)                              │  │
│  │  - plans 表: 完整行程存储                            │  │
│  │  - device_id 分组: 多设备支持                        │  │
│  │  - 实时推送: agent_progress 更新                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 核心状态机流程

### useHomeFlow 状态转移

```
初始状态 (form)
    ↓
用户输入完整表单
    ↓
点击"生成行程" → dispatch { type: 'START_GENERATING' }
    ↓
状态 = generating (流式 Prompt 预览中...)
    ├─ 调用 POST /api/agents/preview-prompt
    ├─ 流式接收 Prompt chunks
    ├─ dispatch { type: 'APPEND_PROMPT'; chunk }
    └─ previewPrompt 实时更新
    ↓
预览完成 → dispatch { type: 'PROMPT_READY' }
    ↓
状态 = prompt-preview (用户可以查看 + 编辑)
    ├─ 显示预览的 Prompt
    ├─ 编辑框允许修改
    └─ 两个按钮: "返回" 或 "开始规划"
    ↓
用户点击"开始规划"
    ├─ 调用 setFinalPrompt(修改后的 prompt)
    └─ dispatch { type: 'SET_FINAL_PROMPT'; prompt }
    ↓
状态 = planning (Agent 执行中...)
    ├─ 调用 POST /api/agents/orchestrate (SSE)
    ├─ 创建后端计划记录 (status: pending)
    ├─ 并行执行 4 个 Agent
    ├─ 轮询 GET /api/plans/[id] 获取进度
    ├─ updateAgent() 更新 agentStore 中每个 Agent 的状态
    └─ 显示 AgentStatusPanel 进度条
    ↓
所有 Agent 完成 → synthesis 生成最终行程
    ↓
dispatch { type: 'PLANNING_DONE' }
    ↓
状态 = done (行程展示)
    ├─ setItinerary(JSON) → itineraryStore
    ├─ setPlanId(id)
    └─ 跳转到 /itinerary 页面
    ↓
用户可以: 保存计划 / 编辑 / 分享 / 导出

失败路径:
    planning 中途失败 → SET_ERROR → 返回 form 状态
    用户点击"中断" → interrupt() 修改 DB status → RESET
    用户点击"返回" → goBack() → 上一个状态
```

---

## 📊 Agent 并行执行流程

```
┌──────────────────────────────────────┐
│  POST /api/agents/orchestrate        │
│  (SSE 实时推送)                       │
└──────────────────────────────────────┘
        ↓
创建计划记录到 Supabase:
  { id, device_id, status: 'pending', ... }
        ↓
┌─────────────────────────────────────────────────────┐
│          并行执行 4 个 Agent                         │
├─────────────────────────────────────────────────────┤
│ 1️⃣ POI Agent        │  2️⃣ Route Agent           │
│ ─────────────────   │  ─────────────────         │
│ 输入: destination   │  输入: POI list, dates    │
│      userPrompt     │        budget             │
│ ──────────────────  │  ──────────────────       │
│ 输出: POISchema     │  输出: RoutePlanSchema    │
│ 推荐 8-12 个地点    │  生成日程安排             │
├─────────────────────────────────────────────────────┤
│ 3️⃣ Tips Agent       │  4️⃣ XHS Agent            │
│ ─────────────────   │  ─────────────────        │
│ 输入: destination   │  输入: destination       │
│      userPrompt     │        userPrompt, days  │
│ ──────────────────  │  ──────────────────      │
│ 输出: ContentSchema │  输出: XHSAgentSchema    │
│ 打包清单+贴士       │  小红书风格笔记           │
└─────────────────────────────────────────────────────┘
        ↓
所有 Agent 完成 → updateAgent() 设置 status: 'done'
        ↓
┌──────────────────────────────────────┐
│  synthesis Agent (串行汇总)           │
│  ─────────────────────────────────   │
│  输入: 4 个 Agent 的输出              │
│  输出: FullItinerary (最终行程)      │
│  ─────────────────────────────────   │
│  生成:                               │
│  • 标题、摘要                         │
│  • days[]、xhsNotes[]                │
│  • 完整 JSON 对象                    │
└──────────────────────────────────────┘
        ↓
SSE 发送:
  { type: "done", itinerary: {...} }
        ↓
前端 setItinerary(json)
更新 Supabase:
  UPDATE plans
  SET status = 'done', itinerary = {...}
  WHERE id = planId
```

---

## 🗄️ 数据库关键字段

### plans 表的关键 JSONB 字段

#### `agent_progress` 结构
```json
{
  "poi": {
    "status": "done",                    // idle | running | done | error
    "progress": 100,                     // 0-100
    "message": "✓ 完成",
    "preview": "推荐地点摘要..."
  },
  "route": {
    "status": "done",
    "progress": 100,
    "message": "✓ 完成",
    "preview": "日程安排摘要..."
  },
  "tips": {
    "status": "done",
    "progress": 100,
    "message": "✓ 完成",
    "preview": "贴士摘要..."
  },
  "xhs": {
    "status": "done",
    "progress": 100,
    "message": "✓ 完成",
    "preview": "笔记摘要..."
  },
  "synthesis": {
    "status": "running",                 // synthesis 最后执行
    "progress": 45,
    "message": "整合行程中...",
    "preview": ""
  }
}
```

#### `itinerary` 结构 (FullItinerary)
```json
{
  "id": "plan-xxx",
  "title": "巴黎浪漫之旅",
  "summary": "5 天深度探索巴黎艺术与美食",
  "destination": "巴黎",
  "origin": "上海",
  "startDate": "2025-05-01",
  "endDate": "2025-05-05",
  "userPrompt": "深度美食旅行...",
  "days": [
    {
      "day": 1,
      "date": "2025-05-01",
      "title": "艺术初尝",
      "morning": [...],
      "afternoon": [...],
      "evening": [...]
    }
  ],
  "xhsNotes": [
    {
      "title": "🗼 巴黎必去地标 Top 5",
      "body": "第一次来巴黎一定要去的地方...",
      "tags": ["巴黎", "旅游", "必去"],
      "noteType": "toplist"
    }
  ],
  "budget": {
    "low": 5000,
    "high": 8000,
    "currency": "CNY"
  }
}
```

#### `planning_params` 结构
```json
{
  "originCode": "SHA",
  "destinationCode": "CDG",
  "startDate": "2025-05-01",
  "endDate": "2025-05-05",
  "finalPrompt": "用户最终确认的 prompt...",
  "hotelPOI": {...},
  "mustVisit": [...],
  "mustAvoid": [...]
}
```

---

## 🔧 核心 Hooks 职责分工

| Hook | 行数 | 主要职责 |
|------|------|---------|
| `useHomeFlow` | 1000+ | ⭐ 核心状态机，协调全流程 |
| `useAgentStream` | 150 | 处理 SSE 流，同步 agentStore |
| `usePortalAnimation` | 80 | 3D 门户特效 |

### useHomeFlow 核心方法

```typescript
// 1️⃣ 生成 Prompt 预览
async generatePromptPreview(params): Promise<void>
  // 调用 POST /api/agents/preview-prompt
  // 流式接收 prompt chunks
  // 触发 dispatch('APPEND_PROMPT')

// 2️⃣ 启动规划
async startPlanning(): Promise<void>
  // 调用 POST /api/agents/orchestrate (SSE)
  // 监听 SSE 事件流
  // 并行执行 5 个 Agent

// 3️⃣ 轮询进度
async startPollingForPlan(planId): Promise<void>
  // 设置 interval
  // 定时 GET /api/plans/[id]
  // 更新 agentStore 中每个 Agent 的状态

// 4️⃣ 中断规划
async interrupt(): Promise<void>
  // PUT /api/plans/[id] { status: 'interrupted' }
  // 清理 polling
  // 返回 form 状态

// 5️⃣ 失败重试
async retryAfterFailure(): Promise<void>
  // 使用 planning_params 重新执行
  // 调用 startPlanning()
```

---

## 🎨 UI 组件树

```
Layout (全局)
├── Navbar
│   └── 导航链接 (主页/我的计划)
│
└── 页面
    ├── / (主页)
    │   ├── SearchForm
    │   │   ├── CityAutocomplete (来源)
    │   │   ├── ArrowLeftRight (交换)
    │   │   ├── CityAutocomplete (目的地)
    │   │   ├── DateRangePicker
    │   │   ├── TravelStylePicker (4 个预设)
    │   │   ├── PromptInput
    │   │   └── Button (生成行程)
    │   │
    │   ├── PromptPreview (state = prompt-preview)
    │   │   ├── TextArea (编辑框)
    │   │   └── Button (开始规划)
    │   │
    │   └── AgentStatusPanel (state = planning)
    │       ├── Agent 1 (POI)
    │       ├── Agent 2 (Route)
    │       ├── Agent 3 (Tips)
    │       ├── Agent 4 (XHS)
    │       └── Agent 5 (Synthesis)
    │
    ├── /itinerary (行程详情)
    │   ├── DayTimeline
    │   │   └── 上午/下午/晚上活动卡片
    │   ├── RouteMap (高德地图)
    │   ├── XHSStyleNote (小红书卡片)
    │   └── ExportButton
    │
    └── /plans (已保存计划列表)
        ├── 刷新按钮
        ├── 搜索框 (可选)
        └── PlanCard x N
            ├── 计划信息
            ├── 删除按钮
            └── 查看详情链接
```

---

## 📱 响应式设计策略

| 设备 | 断点 | 布局 |
|------|------|------|
| Mobile | < 640px | 单列、垂直堆叠 |
| Tablet | 640px - 1024px | 两列网格 |
| Desktop | > 1024px | 三列网格 + 侧边栏 |

---

## 🔐 API 端点完整列表

### 计划管理
- `GET /api/plans?deviceId=xxx` - 查询列表
- `POST /api/plans` - 创建计划
- `GET /api/plans/[id]` - 查询单个（含进度）
- `PUT /api/plans/[id]` - 更新状态
- `DELETE /api/plans/[id]` - 删除计划

### Agent 编排
- `POST /api/agents/preview-prompt` - 生成 Prompt 预览
- `POST /api/agents/orchestrate` - 并行执行 Agent (SSE)
- `POST /api/agents/orchestrate-bg` - 后台规划

### 单个 Agent
- `POST /api/agents/poi` - POI 推荐
- `POST /api/agents/route-plan` - 路线规划
- `POST /api/agents/content` - 旅行贴士
- `POST /api/agents/xhs` - 小红书笔记
- `POST /api/agents/style` - [同 poi]

### 高德地图代理
- `POST /api/amap/search` - POI 搜索
- `GET /api/amap/staticmap` - 静态地图

---

## 🎯 关键代码查找速查表

| 需求 | 查找位置 |
|------|---------|
| 修改搜索表单 | `/src/components/search/SearchForm.tsx` |
| 添加新 Agent | `/src/app/api/agents/[name]/route.ts` |
| 修改 Prompt | `/src/lib/agents/prompts/index.ts` |
| 改动业务流程 | `/src/hooks/useHomeFlow.ts` |
| 调整样式主题 | `/src/app/globals.css` 或组件内 `style` 属性 |
| 更改数据库字段 | `/src/app/api/plans/route.ts` |
| 修复 UI 显示 | `/src/components/itinerary/*.tsx` |
| 管理全局状态 | `/src/lib/stores/*.ts` |
| 处理外部 API | `/src/lib/api/` |

