# 分享链接实现说明

## 完整流程

```
行程生成完成 → 自动保存到 Supabase plans 表
  ↓
用户点击「分享链接」→ 复制 {origin}/plans/{planId} 到剪贴板
  ↓
访问者打开链接 → /plans/[id] 服务端直接查 Supabase 渲染页面
  ↓
系统判断访客/本人（对比 device_id）→ 分别展示不同操作
```

## 涉及文件

| 文件 | 职责 |
|------|------|
| `src/components/itinerary/ExportButton.tsx` | 「分享链接」按钮，复制链接到剪贴板 |
| `src/app/plans/[id]/page.tsx` | Server Component，`generateMetadata` 输出 OG 信息 |
| `src/app/plans/[id]/PlanDetailClient.tsx` | 客户端交互，访客/本人判断，保存到我的计划 |
| `src/app/plans/page.tsx` | 列表页，每行有「分享」快捷按钮 |
| `src/app/api/plans/[id]/route.ts` | GET/PATCH/DELETE，DELETE 有 device_id 鉴权 |

## 访客 vs 本人

- **本人**（device_id 匹配）：面包屑显示「我的计划」层级，返回按钮跳列表
- **访客**（device_id 不匹配）：面包屑只显示「首页」，返回按钮跳首页，右上角显示「保存到我的计划」

## OG 元信息

`generateMetadata` 在服务端读取行程数据，自动生成：
- `og:title` — 行程标题
- `og:description` — 目的地 · 天数 · 预算 · 摘要
- `og:url` — 完整分享链接
- Twitter Card — `summary` 类型

发到微信/群聊/Twitter 时自动展示行程预览卡片。
