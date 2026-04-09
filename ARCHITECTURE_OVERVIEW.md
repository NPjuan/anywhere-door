# Anywhere Door — Next.js 旅行规划 App 架构概述

**项目版本**: 1.1.3  
**技术栈**: Next.js 16, React 19, TypeScript, Tailwind CSS, Zustand, Supabase  
**AI 引擎**: DeepSeek（默认）/ Claude（备用）  
**地图服务**: 高德地图 (Amap)

---

## 📐 整体架构设计

### 核心流程：三步规划流程
```
1. 用户表单输入 (origin, destination, dates, prompt)
   ↓
2. AI 生成 Prompt 预览 (LLM 流式生成)
   ↓
3. 并行执行 5 个 Agent (POI、Route、Tips、XHS、Synthesis)
   ↓
4. 生成完整行程 (FullItinerary) + 保存到 Supabase
```

### 数据持久化策略
- **搜索参数**: `localStorage` (Zustand persist)
- **临时行程**: 内存存储 + Supabase DB
- **已保存计划**: Supabase (plans 表) + 本地 localStorage 缓存

---

## 📁 项目结构详解

### 1️⃣ `/src/app` — Next.js App Router & API Routes

#### 主要页面
```
/src/app/
├── page.tsx                    # 主页（1512 行）— 核心规划界面
│   └── 状态机: form → generating → prompt-preview → planning → done
├── layout.tsx                  # 全局布局，Ant Design ConfigProvider
├── globals.css                 # 全局样式 + Tailwind 配置
│
├── itinerary/
│   ├── page.tsx               # 行程展示页入口
│   └── ItineraryContent.tsx   # 行程详情组件（日程、地图、笔记）
│
├── plan/                       # [废弃？] 单个计划页面
│   ├── page.tsx
│   └── PlanContent.tsx
│
├── plans/                      # 我的计划列表页
│   ├── page.tsx               # 计划列表（支持删除、刷新）
│   └── [id]/page.tsx          # 计划详情页（通过 ID 查询）
│
└── search/
    └── page.tsx               # 航班搜索页 [可能废弃]
```

#### API Routes (`/src/app/api`)
```
/api/
├── plans/
│   ├── route.ts               # GET (查询列表) / POST (创建计划)
│   │   - GET  /api/plans?deviceId=xxx       → 按设备获取计划列表
│   │   - POST /api/plans                    → 创建新计划（pending/done）
│   └── [id]/
│       ├── route.ts           # GET / PUT / DELETE 单个计划
│       │   - GET  /api/plans/[id]           → 获取计划详情（含进度信息）
│       │   - PUT  /api/plans/[id]           → 更新计划状态
│       │   - DELETE /api/plans/[id]         → 删除计划
│
├── agents/                     # AI Agent 执行接口
│   ├── orchestrate/
│   │   └── route.ts           # 主编排端点 — SSE 实时流
│   │       - 并行执行 4 个 Agent (poi, route, tips, xhs)
│   │       - synthesis 串行汇总
│   │       - SSE event format: {type, id, chunk, preview, error}
│   │
│   ├── orchestrate-bg/
│   │   └── route.ts           # 后台规划（可选） — 保存到 DB
│   │
│   ├── preview-prompt/
│   │   └── route.ts           # 生成 Prompt 预览（流式）
│   │
│   ├── poi/ (style)
│   │   └── route.ts           # POI 推荐 Agent
│   │
│   ├── route-plan/
│   │   └── route.ts           # 路线规划 Agent
│   │
│   ├── content/ (tips)
│   │   └── route.ts           # 旅行贴士 Agent
│   │
│   ├── xhs/
│   │   └── route.ts           # 小红书风格笔记 Agent
│   │
│   └── flight/
│       └── route.ts           # [可能废弃] 航班搜索
│
├── amap/                       # 高德地图代理
│   ├── search/route.ts        # POI 搜索
│   └── staticmap/route.ts      # 静态地图
│
└── flights/
    └── route.ts               # [可能废弃] 航班 API 聚合
```

---

### 2️⃣ `/src/components` — React 组件库

#### 子目录结构
```
/src/components/
├── ui/                         # 基础 UI 组件
│   ├── Button.tsx             # 按钮
│   ├── Input.tsx              # 输入框
│   ├── Card.tsx               # 卡片
│   ├── Modal.tsx              # 模态框
│   ├── Badge.tsx              # 标签
│   ├── Skeleton.tsx           # 骨架屏 / 加载动画
│   ├── ErrorBoundary.tsx      # 错误边界
│   ├── QuotaWarningBanner.tsx # 配额警告横幅
│   └── SkipLink.tsx           # 辅助功能
│
├── layout/
│   └── Navbar.tsx             # 顶部导航栏
│
├── portal/                     # 门户动画和背景
│   ├── PortalDoor.tsx         # 3D 门户特效
│   ├── PortalTransition.tsx   # 过渡动画
│   ├── AuroraBackground.tsx   # Aurora 渐变背景
│   └── index.ts               # 导出
│
├── form/                       # 表单组件
│   ├── PlaceSelect.tsx        # 地点选择（城市选择）
│   └── RefineInput.tsx        # 细化输入（POI 选择）
│
├── search/                     # 搜索表单相关
│   ├── SearchForm.tsx         # 主搜索表单（整合所有字段）
│   ├── CityAutocomplete.tsx   # 城市自动完成（Amap）
│   ├── DateRangePicker.tsx    # 日期范围选择
│   ├── PromptInput.tsx        # 旅行诉求输入
│   ├── TravelStylePicker.tsx  # 旅行风格快速选择
│   ├── FlightCard.tsx         # 航班卡片 [可能废弃]
│   └── FlightList.tsx         # 航班列表 [可能废弃]
│
├── itinerary/                  # 行程展示组件
│   ├── DayTimeline.tsx        # 日程时间线（上午/下午/晚上）
│   ├── RouteMap.tsx           # 地图展示（高德地图）
│   ├── FlightSummary.tsx      # 航班摘要 [可能废弃]
│   ├── ExportButton.tsx       # 导出按钮（PDF/图片）
│   └── XHSStyleNote.tsx       # 小红书风格笔记卡片
│
└── agents/
    └── AgentStatusPanel.tsx   # Agent 执行状态面板（5 个 Agent 的进度）
```

**关键 UI 库**: Ant Design, Lucide Icons, Framer Motion

---

### 3️⃣ `/src/lib` — 业务逻辑和工具函数

#### 核心模块
```
/src/lib/
├── stores/                     # Zustand 全局状态
│   ├── searchStore.ts         # 搜索参数 (origin, destination, dates, prompt, POI)
│   ├── itineraryStore.ts      # 临时行程 (parsed JSON + activeDay + planId)
│   ├── agentStore.ts          # 5 个 Agent 的实时状态 + 流式输出
│   ├── flightStore.ts         # [可能废弃] 航班搜索结果
│   └── savedPlansStore.ts     # [已弃用] localStorage 计划库
│
├── agents/                     # AI Agent 系统
│   ├── prompts/
│   │   └── index.ts           # 5 个 Agent 的系统 Prompt
│   │       - POI 推荐 (destination + userPrompt)
│   │       - 路线规划 (POI + 日期 → 每日行程)
│   │       - 旅行贴士 (destination + userPrompt)
│   │       - XHS 小红书风格 (destination + prompt + days)
│   │       - Synthesis 最终汇总
│   │
│   ├── types.ts               # Zod Schemas
│   │   - POISchema, ActivitySchema, DayPlanSchema
│   │   - POI Agent Output, Route Agent Output
│   │   - Tips Agent Output, XHS Agent Output
│   │   - FullItinerary (最终输出)
│   │
│   └── utils.ts               # getAIProvider() — DeepSeek/Claude 切换
│
├── api/                        # 外部 API 封装
│   ├── flights/
│   │   ├── FlightService.ts   # 统一接口
│   │   ├── AmadeusAdapter.ts  # Amadeus API
│   │   ├── AviationstackAdapter.ts  # Aviationstack API
│   │   ├── MockAdapter.ts     # Mock 数据（开发用）
│   │   └── types.ts           # Flight 类型定义
│   │
│   └── maps/
│       └── AmapClient.ts      # 高德地图客户端
│
├── cities.ts                  # 全球城市数据库（IATA code）
│   - searchCities()           # 搜索城市
│   - getAirportsByCity()      # 获取城市机场
│   - POPULAR_CITIES 常量
│
├── supabase.ts                # Supabase 客户端初始化
│   - createClient(url, key)
│   - 支持 ANON_KEY 和 PUBLISHABLE_DEFAULT_KEY
│
├── deviceId.ts                # 设备唯一标识
│   - getDeviceId()            # localStorage 持久化设备 ID
│
├── quotaMonitor.ts            # API 配额监控
│   - 跟踪 API 调用次数
│   - 管理 Amadeus/DeepSeek 等服务的配额
│
├── itineraryCanvas.ts         # 行程导出相关
│   - HTML → Canvas/PDF
│
└── utils/
    └── cn.ts                  # classname 工具 (clsx + tailwind-merge)
```

---

### 4️⃣ `/src/hooks` — Custom React Hooks

```
/src/hooks/
├── useHomeFlow.ts             # ★ 核心状态机 Hook（1000+ 行）
│   ├── 状态: form → generating → prompt-preview → planning → done
│   ├── runPlanning()          # 启动规划流程
│   ├── generatePromptPreview() # 流式生成 Prompt 预览
│   ├── setFinalPrompt()       # 用户编辑 Prompt 后确认
│   ├── startPlanning()        # 开始执行 Agent
│   ├── interrupt()            # 中断规划
│   ├── retryAfterFailure()    # 失败重试
│   ├── goBack()               # 返回上一步
│   ├── startPollingForPlan()  # 轮询 DB 获取进度
│   └── 与 agentStore + itineraryStore 集成
│
├── useAgentStream.ts          # Agent SSE 流消费 Hook
│   - connectSSE()             # 连接 SSE 端点
│   - 处理流式事件: agent:start, agent:done, synthesis:chunk, done
│   - 与 agentStore 同步状态
│
└── usePortalAnimation.ts      # Portal 门户特效动画
    - 3D 变换、粒子特效
```

---

## 🗄️ 数据库架构（Supabase PostgreSQL）

### plans 表

```sql
CREATE TABLE plans (
  id               TEXT PRIMARY KEY,              -- "plan-{timestamp}-{random}"
  device_id        TEXT NOT NULL,                 -- 设备唯一标识
  status           TEXT DEFAULT 'done',           -- 'pending' | 'done' | 'error' | 'interrupted'
  title            TEXT NOT NULL,                 -- 行程标题
  summary          TEXT,                          -- 简介
  destination      TEXT,                          -- 目的地城市
  start_date       TEXT,                          -- YYYY-MM-DD
  end_date         TEXT,                          -- YYYY-MM-DD
  days_count       INT,                           -- 天数
  budget_low       NUMERIC,                       -- 预算下限
  budget_high      NUMERIC,                       -- 预算上限
  itinerary        JSONB,                         -- 完整行程 JSON (FullItinerary)
  agent_progress   JSONB,                         -- {poi: {status, preview}, route: {...}, ...}
  planning_params  JSONB,                         -- 用于刷新恢复规划的参数
  saved_at         TIMESTAMPTZ DEFAULT now(),    -- 保存时间
  updated_at       TIMESTAMPTZ DEFAULT now()     -- 更新时间
);

CREATE INDEX ON plans (device_id);
CREATE INDEX ON plans (saved_at DESC);
```

### 主要字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT | 计划唯一标识，格式 `plan-{时间戳}-{随机码}` |
| `status` | TEXT | 规划状态机：pending(规划中) → done(完成) / error(失败) / interrupted(中断) |
| `agent_progress` | JSONB | 实时进度 `{poi: {status, progress, preview}, route: {...}, ...}` |
| `itinerary` | JSONB | 最终行程 JSON 对象 (FullItinerary schema) |
| `planning_params` | JSONB | 规划参数，用于 Resume 功能恢复规划 |

---

## 🔄 核心数据流

### 1️⃣ 用户搜索表单
```
用户输入: origin, destination, date, prompt
  ↓
searchStore.setOrigin(), setDestination(), setDateRange(), setPrompt()
  ↓
本地 localStorage 持久化
```

### 2️⃣ Prompt 预览生成
```
用户点击"生成行程"
  ↓
POST /api/agents/preview-prompt (流式)
  ↓
LLM 流式生成增强的 prompt
  ↓
useHomeFlow dispatch APPEND_PROMPT
  ↓
用户预览后可编辑，确认进入规划
```

### 3️⃣ 并行 Agent 执行
```
用户确认 → POST /api/agents/orchestrate (SSE)
  ↓
后端创建计划记录 (status: pending)
  ↓
并行执行 4 个 Agent:
  ├─ POI Agent → 推荐地点
  ├─ Route Agent → 规划日程
  ├─ Tips Agent → 旅行贴士
  └─ XHS Agent → 小红书笔记
  ↓
updateAgent() 更新 agentStore 状态
  ↓
所有并行 Agent 完成后，synthesis Agent 汇总
  ↓
前端轮询 GET /api/plans/[id] 查询进度
```

### 4️⃣ 最终输出与保存
```
synthesis 完成 → 生成 FullItinerary JSON
  ↓
SSE 发送 {type: "done", itinerary: {...}}
  ↓
useItineraryStore.setItinerary(json)
  ↓
前端展示行程 (DayTimeline + RouteMap + XHSStyleNote)
  ↓
用户点击保存 → POST /api/plans
  ↓
计划保存到 Supabase (status: done)
```

---

## 🎯 功能模块总览

### ✅ 已实现的功能
1. **智能表单输入** (SearchForm)
   - 城市自动完成 (Amap POI 搜索)
   - 日期范围选择
   - 旅行诉求自由输入
   - 旅行风格快速选择 (4 个预设)
   - 酒店/必去/避开 POI 详细定制

2. **AI 行程生成** (useHomeFlow)
   - 流式 Prompt 预览
   - 并行 5 Agent 执行 (SSE 实时更新)
   - 中断/重试/返回功能

3. **行程展示** (ItineraryContent)
   - 日程时间线 (上午/下午/晚上)
   - 高德地图路线展示
   - 小红书风格笔记卡片
   - 行程导出 (PDF/图片)

4. **计划管理** (PlansPage)
   - 查询已保存计划
   - 删除计划（双重确认）
   - 刷新列表
   - 查看计划详情

5. **设备持久化**
   - Device ID localStorage 存储
   - 按设备查询和管理计划

### 🔄 待完善 / 潜在优化
- [ ] 航班搜索 (Flight 相关组件可能需要重新启用)
- [ ] 用户认证系统
- [ ] 社交分享功能
- [ ] 行程协作编辑
- [ ] 离线模式支持
- [ ] 多语言支持 (i18n)

---

## 🔧 关键技术决策

### 状态管理策略
- **全局状态**: Zustand (轻量、无样板代码)
- **持久化**: localStorage (search/saved 参数) + Supabase (完整计划)
- **内存状态**: Agent 实时进度、行程预览

### AI 引擎
- **默认**: DeepSeek (成本低、速度快)
- **备用**: Claude (质量更高，可在 .env 切换)
- **模型**: deepseek-chat (默认) / claude-haiku-4.5 (备用)

### 流式处理
- **前端预览**: React 状态流更新 (useHomeFlow)
- **后端规划**: SSE (Server-Sent Events) 实时推送进度
- **轮询补偿**: GET /api/plans/[id] 定时轮询 agent_progress

### 地图集成
- **高德地图**: POI 搜索、静态地图、路线绘制
- **API 级别**: 通过 /api/amap/* 代理（隐藏密钥）

---

## 📊 文件统计

| 模块 | 文件数 | 主要职责 |
|------|--------|---------|
| `/src/app` | ~12 | 页面 + API routes |
| `/src/components` | ~28 | React UI 组件 |
| `/src/lib` | ~22 | 业务逻辑、类型、工具 |
| `/src/hooks` | 3 | 核心状态管理 |
| **总计** | **~75** | - |

---

## 🚀 核心 Dependencies

```json
{
  "@ai-sdk/anthropic": "^3.0.64",       // Claude API
  "@ai-sdk/deepseek": "^2.0.26",        // DeepSeek API
  "@supabase/supabase-js": "^2.102.0",  // Supabase 数据库
  "@tanstack/react-query": "^5.96.1",   // 数据获取缓存
  "ai": "^6.0.142",                     // Vercel AI SDK (streamText)
  "antd": "^6.3.5",                     // UI 组件库
  "framer-motion": "^12.38.0",          // 动画库
  "zustand": "^5.0.12",                 // 状态管理
  "next": "16.2.2",                     // Next.js 框架
  "react": "19.2.4"                     // React
}
```

---

## 🎓 最佳实践观察

✅ **优点**:
- 清晰的目录结构，职责划分明确
- Zustand 状态管理避免 Context 深度嵌套
- 类型安全：Zod schemas for runtime validation
- SSE + 轮询混合方案应对网络不稳定性
- 环境变量支持多个 AI 服务切换

⚠️ **可改进**:
- 主页 page.tsx 1512 行过长，建议拆分子组件
- API routes 可以提取通用错误处理中间件
- Agent 逻辑重复较多，可以模板化
- 缺少单元测试和集成测试

---

## 📝 环境变量配置

**必需**:
```
DEEPSEEK_API_KEY          # DeepSeek API key
NEXT_PUBLIC_SUPABASE_URL  # Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon key
AMAP_SERVER_KEY           # 高德地图服务器 key
```

**可选**:
```
ANTHROPIC_API_KEY         # Claude (备用)
AI_PROVIDER=deepseek      # 切换到 claude
AMADEUS_CLIENT_ID         # 航班 API (Amadeus)
AVIATIONSTACK_API_KEY     # 航班 API (Aviationstack)
```

---

## 🔍 项目命名约定

| 前缀/后缀 | 含义 | 示例 |
|---------|------|------|
| `use*` | React Hook | `useHomeFlow`, `useAgentStream` |
| `*Agent` | AI Agent 相关 | `agentStore`, `AgentStatusPanel` |
| `*Store` | Zustand store | `searchStore`, `itineraryStore` |
| `*Schema` | Zod schema | `POISchema`, `FullItinerarySchema` |
| `*Prompt` | LLM 系统 prompt | `poiSystemPrompt`, `SYNTHESIS_SYSTEM_PROMPT` |
| `route.ts` | Next.js API route | `/api/agents/orchestrate/route.ts` |

---

## 📚 入门指南

### 启动开发服务器
```bash
pnpm install
pnpm dev
# 访问 http://localhost:3000
```

### 核心流程理解
1. 阅读 `/src/hooks/useHomeFlow.ts` 理解整体状态机
2. 阅读 `/src/app/page.tsx` 理解 UI 交互
3. 阅读 `/src/app/api/agents/orchestrate/route.ts` 理解并行执行
4. 查阅 `/src/lib/stores/` 理解状态分层

### 添加新功能
1. 如需新 Agent：复制 `/src/app/api/agents/poi/route.ts` 并修改
2. 如需新状态：在 `/src/lib/stores/` 创建新 store
3. 如需新页面：在 `/src/app/` 创建 `[feature]/page.tsx`

