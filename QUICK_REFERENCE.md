# Anywhere Door — 快速参考卡

## 🚀 30秒快速理解

**这是什么？**
- 基于 AI 的旅行规划 App，用户输入出发地/目的地/日期 + 旅行诉求，自动生成多日行程

**核心流程？**
```
表单输入 → AI增强Prompt → 并行5个Agent → 生成最终行程 → 保存到数据库
```

**技术栈？**
- 前端: React 19 + Next.js 16 + Tailwind + Zustand
- 后端: Next.js API Routes + Supabase PostgreSQL
- AI: DeepSeek (主) / Claude (备)
- 地图: 高德地图 (Amap)

---

## 📁 三层架构

### 🎨 Presentation Layer (前端展示)
```
/src/app/page.tsx (主页 - 搜索表单 + 实时进度)
/src/app/itinerary/ (行程展示页)
/src/app/plans/ (已保存计划列表)
/src/components/ (28个 React 组件)
```

### 🔄 State Management (状态管理)
```
searchStore    → 搜索表单参数
itineraryStore → 临时行程 JSON
agentStore     → 5 个 Agent 的实时状态
flightStore    → [可能废弃]
```

### 📡 Backend Layer (后端服务)
```
/api/plans/              → 计划 CRUD
/api/agents/orchestrate  → 并行执行 Agent (SSE)
/api/agents/{name}       → 单个 Agent
/api/amap/               → 高德地图代理
```

---

## 🎯 5 个核心 Agent

| Agent | 职责 | 输入 | 输出 |
|-------|------|------|------|
| **POI** | 地点推荐 | destination + userPrompt | 8-12 个地点 (POISchema) |
| **Route** | 路线规划 | POI list + dates | 每日行程 (RoutePlanSchema) |
| **Tips** | 旅行贴士 | destination + userPrompt | 打包清单 + 注意事项 |
| **XHS** | 小红书笔记 | destination + prompt + days | 社交风格内容 (5类型) |
| **Synthesis** | 汇总编排 | 4个Agent输出 | FullItinerary JSON |

---

## 🔗 关键链接速查

### 核心文件
- **主页逻辑**: `/src/hooks/useHomeFlow.ts` (1000+ 行)
- **并行执行**: `/src/app/api/agents/orchestrate/route.ts`
- **Prompt 模板**: `/src/lib/agents/prompts/index.ts`
- **数据类型**: `/src/lib/agents/types.ts` (Zod schemas)

### 状态管理
- **搜索参数**: `/src/lib/stores/searchStore.ts`
- **行程数据**: `/src/lib/stores/itineraryStore.ts`
- **Agent 状态**: `/src/lib/stores/agentStore.ts`

### 数据库
- **Supabase 客户端**: `/src/lib/supabase.ts`
- **计划 API**: `/src/app/api/plans/route.ts`
- **SQL 字段文档**: 文件内的 CREATE TABLE 注释

### UI 组件
- **搜索表单**: `/src/components/search/SearchForm.tsx`
- **行程展示**: `/src/components/itinerary/DayTimeline.tsx`
- **地图集成**: `/src/components/itinerary/RouteMap.tsx`
- **Agent 进度**: `/src/components/agents/AgentStatusPanel.tsx`

---

## 💾 数据库表结构 (plans)

```
id               TEXT        plan-{时间戳}-{随机码}
device_id        TEXT        设备唯一标识
status           TEXT        pending | done | error | interrupted
title            TEXT        行程标题
destination      TEXT        目的地
start_date       TEXT        YYYY-MM-DD
end_date         TEXT        YYYY-MM-DD
days_count       INT         天数
budget_low       NUMERIC     预算下限
budget_high      NUMERIC     预算上限
itinerary        JSONB       ✨ 完整行程 (FullItinerary JSON)
agent_progress   JSONB       ✨ 实时进度 {poi: {...}, route: {...}}
planning_params  JSONB       用于恢复规划
saved_at         TIMESTAMP   保存时间
```

关键 JSONB 字段详见 `ARCHITECTURE_VISUAL.md`

---

## 🔄 状态机流程

```
form 
  ↓ (用户点击"生成行程")
generating (流式 Prompt 预览)
  ↓
prompt-preview (用户可编辑)
  ↓ (用户确认)
planning (5 Agent 并行执行)
  ↓
done (展示行程)
```

### 关键方法

```typescript
useHomeFlow() 返回:
├─ step              // 当前状态
├─ previewPrompt     // Prompt 预览
├─ finalPrompt       // 最终确认的 Prompt
├─ error             // 错误消息
├─ generatePromptPreview()   // 生成预览
├─ setFinalPrompt()          // 确认编辑
├─ startPlanning()           // 启动规划
├─ interrupt()               // 中断
├─ retryAfterFailure()       // 重试
└─ goBack()                  // 返回
```

---

## 🌐 API 端点速查

### 规划管理
```
GET  /api/plans?deviceId=xxx       // 查询我的计划列表
POST /api/plans                     // 创建新计划
GET  /api/plans/[id]               // 查询单个计划 + 进度
PUT  /api/plans/[id]               // 更新状态
DELETE /api/plans/[id]             // 删除计划
```

### Agent 编排
```
POST /api/agents/preview-prompt    // 生成 Prompt 预览 (流式)
POST /api/agents/orchestrate       // 启动规划 (SSE)
POST /api/agents/orchestrate-bg    // 后台规划 (可选)
```

### 单个 Agent
```
POST /api/agents/poi               // POI 推荐
POST /api/agents/route-plan        // 路线规划
POST /api/agents/content           // 旅行贴士
POST /api/agents/xhs               // 小红书笔记
```

### 外部服务
```
POST /api/amap/search              // POI 搜索
GET  /api/amap/staticmap           // 静态地图
```

---

## 📊 组件层级

```
Page (主页)
├── SearchForm
│   ├── CityAutocomplete (来源)
│   ├── CityAutocomplete (目的地)
│   ├── DateRangePicker
│   ├── PromptInput
│   └── TravelStylePicker
├── PromptPreview (条件渲染)
└── AgentStatusPanel (条件渲染)
    ├─ Agent 1-4 (并行)
    └─ Agent 5 (synthesis)

ItineraryPage
├── DayTimeline (日程)
├── RouteMap (地图)
├── XHSStyleNote (笔记卡片)
└── ExportButton (导出)

PlansPage
├── PlanCard x N
│   ├── 基本信息
│   ├── 删除按钮
│   └── 链接到详情
```

---

## 🎨 样式系统

- **CSS**: Tailwind CSS v4 + 自定义变量
- **色系**: 深色主题 (#020B18) + 浅色主题 (#F8FAFF)
- **动画**: Framer Motion
- **UI 库**: Ant Design v6

---

## 🔧 常见操作

### 添加新 Agent
1. 复制 `/src/app/api/agents/poi/route.ts`
2. 在 `/src/lib/agents/prompts/index.ts` 添加 prompt
3. 在 `/src/lib/agents/types.ts` 定义 Output schema
4. 更新 `agentStore` 中的 `AgentId` 类型
5. 在 `orchestrate/route.ts` 中添加并行调用

### 修改 Prompt
编辑 `/src/lib/agents/prompts/index.ts`
- 每个 Agent 一个导出函数: `xxxSystemPrompt`
- 函数接收: destination, userPrompt, days 等参数

### 调整 UI
- 页面: `/src/app/page.tsx`
- 组件: `/src/components/{category}/`
- 样式: 检查 `className` 和 `style` 属性

### 修改数据库
编辑 `/src/app/api/plans/route.ts` 中的 INSERT/SELECT 逻辑
需要同步更新 Supabase 表结构 (SQL)

---

## ⚡ 性能指标

| 指标 | 值 |
|------|-----|
| Prompt 预览生成 | ~3-5 秒 (流式) |
| 4 个 Agent 并行执行 | ~15-30 秒 |
| Synthesis 汇总 | ~5-10 秒 |
| **总耗时** | **~30-45 秒** |
| **轮询间隔** | 2.5 秒 |

---

## 🚨 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| "Missing Supabase env" | 没有配置 `NEXT_PUBLIC_SUPABASE_*` | 检查 `.env.local` |
| "AI Provider not found" | 没有 `DEEPSEEK_API_KEY` 或 `ANTHROPIC_API_KEY` | 检查 `.env.local` 和 `AI_PROVIDER` 值 |
| "Agent timeout" | SSE 连接中断 | 检查网络，考虑增加超时时间 |
| "Missing deviceId" | localStorage 初始化失败 | 清空浏览器数据，重新加载 |
| Plan 状态卡在 pending | 后端进程崩溃 | 检查服务器日志，手动更新 DB status |

---

## 🎓 学习路径

### 新手 (1-2 小时)
1. 阅读本文件 (10 分钟)
2. 浏览 `/src/app/page.tsx` 顶部 (20 分钟)
3. 理解 `useHomeFlow` 状态机 (30 分钟)
4. 查看一个 Agent 实现 (20 分钟)

### 中级 (2-4 小时)
1. 深入读 `useHomeFlow.ts` 完整代码
2. 理解 SSE + 轮询机制
3. 学习 Zustand store 设计
4. 查看 Supabase 数据库设计

### 高级 (4+ 小时)
1. 修改 Prompt 并测试效果
2. 添加新 Agent
3. 优化性能 (并行度、超时)
4. 实现新功能 (用户认证、分享等)

---

## 📚 相关文档

- **详细架构**: `ARCHITECTURE_OVERVIEW.md`
- **数据流图**: `ARCHITECTURE_VISUAL.md`
- **Supabase 设置**: `.env.example`
- **项目信息**: `README.md`

---

## 💡 Tips

1. **开发时**：在 `.env.local` 设置 `NEXT_PUBLIC_APP_URL=http://localhost:3000`
2. **调试 Agent**：在浏览器控制台查看 `agentStore` 状态
3. **快速重试**：使用 `planning_params` 恢复中断的规划
4. **性能优化**：Agent 输出太长时考虑流式处理
5. **扩展性**：所有 prompt 集中在 `prompts/index.ts`，易于维护

---

## 🔐 环保 (最小化环境变量)

**必须**:
```
DEEPSEEK_API_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
AMAP_SERVER_KEY
```

**可选**:
```
ANTHROPIC_API_KEY         # 如果使用 Claude
AI_PROVIDER=deepseek      # 默认值
AMADEUS_CLIENT_ID         # 如果启用航班搜索
```

---

## 🎯 下一步

- [ ] 启动 `pnpm dev` 本地开发
- [ ] 登录 Supabase 查看数据库
- [ ] 尝试生成第一个行程
- [ ] 修改 Prompt 看效果
- [ ] 阅读详细文档 `ARCHITECTURE_OVERVIEW.md`

