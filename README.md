# 任意门 Anywhere Door

> AI 驱动的旅行行程规划应用。输入出发城市、目的地、日期和旅行诉求，自动生成多日详细行程。

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 (App Router) + React 19 + TypeScript |
| 样式 | Tailwind CSS v4 + Ant Design v6 + Framer Motion |
| 状态 | Zustand（纯内存，无 localStorage） |
| 数据库 | Supabase PostgreSQL |
| AI | DeepSeek（默认）/ Claude（备用），通过 Vercel AI SDK |
| 地图 | 高德地图（Amap） |

## 快速开始

```bash
pnpm install
pnpm dev
# 访问 http://localhost:3000
```

## 环境变量

```env
# 必需
DEEPSEEK_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
AMAP_SERVER_KEY=

# 可选
ANTHROPIC_API_KEY=        # 启用 Claude 作为 AI 引擎
AI_PROVIDER=deepseek      # 切换为 claude
```

## 文档

- [架构文档](./docs/ARCHITECTURE.md) — 项目架构、核心流程、API 文档

## 数据库初始化

在 Supabase SQL 编辑器执行：

```sql
create table plans (
  id               text        primary key,
  device_id        text        not null,
  status           text        not null default 'done',
  title            text        not null,
  summary          text,
  destination      text,
  start_date       text,
  end_date         text,
  days_count       int,
  budget_low       numeric,
  budget_high      numeric,
  itinerary        jsonb,
  agent_progress   jsonb,
  planning_params  jsonb,
  saved_at         timestamptz not null default now()
);

create index on plans (device_id);
create index on plans (saved_at desc);
```
