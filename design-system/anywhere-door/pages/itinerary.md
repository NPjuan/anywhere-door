# 行程页覆写规则 / Itinerary Page Overrides

> **项目 Project:** 任意门 Anywhere Door
> **页面类型 Page Type:** AI 行程规划输出 / AI Itinerary Output
> **说明 Note:** 此文件中的规则**覆盖** `MASTER.md`，未提及的规则以 MASTER 为准。
> *Rules here **override** `MASTER.md`. Anything not mentioned falls back to MASTER.*

---

## 设计原则（本页）/ Design Principle (This Page)

**目标 Goal:** 沉浸式旅行体验感。地图与行程并排，像一份精美的旅行手册。
*Immersive travel experience. Map and itinerary side by side, like a beautiful travel guide.*

**风格 Style:** Bold Minimalism + 地图集成 / Bold Minimalism + Map integration

---

## 布局覆写 / Layout Overrides

### AI 生成中状态 / While AI is Generating

```
┌─────────────────────────────────────────────────────────┐
│  导航栏 / Navbar                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│         [传送门小图标，旋转中 spinning]                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ✈ 机票 Agent         ████████░░  搜索中...       │  │
│  │ 🗺 风格 Agent         ██████████  ✓ 完成          │  │
│  │ 📍 路线 Agent         ████░░░░░░  规划中...       │  │
│  │ 📝 内容 Agent         ██░░░░░░░░  生成中...       │  │
│  │ 🔮 汇总 Agent         ░░░░░░░░░░  等待中...       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│         流式文字输出区（当前 Agent 正在生成的内容）         │
│         Streaming text area (current agent output)      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 行程完成后状态 / After Itinerary is Complete

```
┌─────────────────────────────────────────────────────────┐
│  导航栏（含分享/导出按钮）/ Navbar with share/export     │
├─────────────────────────┬───────────────────────────────┤
│  行程时间线（40%）        │  高德地图（60%）               │
│  Itinerary Timeline      │  Amap                        │
│                          │                              │
│  ┌──────────────────┐   │  [交互地图，含 POI 图钉]       │
│  │ Day 1  / 第一天  │   │  Interactive map with pins    │
│  │ 行程卡片 × N     │   │                              │
│  └──────────────────┘   │                              │
│  ┌──────────────────┐   │                              │
│  │ Day 2  / 第二天  │   │                              │
│  └──────────────────┘   │                              │
│  ...                     │                              │
├─────────────────────────┴───────────────────────────────┤
│  移动端：上下堆叠（地图在上，行程在下）                    │
│  Mobile: Stacked (map top, timeline bottom)              │
└─────────────────────────────────────────────────────────┘
```

- **背景 Background:** `--color-bg-base`（`#F0F9FF`）
- **时间线容器 Timeline Container:** `overflow-y-scroll`，`height: calc(100vh - 80px)`
- **地图容器 Map Container:** `position: sticky; top: 80px; height: calc(100vh - 80px)`

---

## Agent 状态面板规格 / Agent Status Panel Specs

### 进度条 / Progress Bars

| Agent | 图标 Icon | 颜色 Color |
|---|---|---|
| 机票 Flight | `Plane` (Lucide) | `--color-primary` |
| 风格+POI Style | `MapPin` (Lucide) | `--color-style-photography`（随所选风格变化）|
| 路线 Route | `Route` (Lucide) | `--color-success` |
| 内容 Content | `FileText` (Lucide) | `--color-magic-purple` |
| 汇总 Synthesis | `Sparkles` (Lucide) | `--color-portal-glow` |

- **面板背景 Panel BG:** `bg-white`，`border border-[--color-border]`，`--radius-lg`
- **进度条高度 Bar Height:** `8px`，`--radius-portal`（全圆角）
- **完成态 Completed:** 进度条变为渐变 `linear-gradient(90deg, --color-portal-glow, --color-magic-purple)`

### 流式文字区 / Streaming Text Area

- **字体 Font:** Exo 2，`font-size: 0.875rem`，`color: --color-text-muted`
- **打字机效果 Typewriter:** 每个字符 `20ms` 间隔
- **背景 BG:** `bg-[--color-bg-base]`，`--radius-md`，`p-4`
- **高度 Height:** `120px`，`overflow-y-auto`

---

## 行程头部规格 / Itinerary Header Specs

```
[目的地城市名，大字 H1 Orbitron]  上海 → 成都
[AI 生成的行程名，H3]            《美食探索者的成都三日慢游》
[摘要，2行，Exo 2]               X月X日 - X月X日 · X天 · X人
                                 ¥XXXX · 直飞 · 成都双流国际机场
```

---

## 每日行程卡片规格 / Day Timeline Card Specs

### 日期标题 / Day Header

```css
background: linear-gradient(135deg, --color-primary, --color-portal-glow)
color: white
border-radius: --radius-md
padding: 12px 20px
font: Orbitron, font-size: 0.875rem, letter-spacing: 0.1em
```

### 活动卡片 / Activity Card

```
┌─────────────────────────────────────────────┐
│  [时间标签]  [活动名称（Orbitron）]            │
│  09:00      锦里古街                          │
│             [地址/地铁]  [地图链接图标]        │
│             [AI 生成的一句话描述]              │
│             [时长标签]  [价格参考标签]         │
└─────────────────────────────────────────────┘
```

- **卡片背景 BG:** `bg-white`，`border-l-4 border-[--color-primary]`
- **悬停 Hover:** 左边框颜色变为当前旅行风格色
- **cursor:** `cursor-pointer`，点击后地图高亮对应 POI

### 活动卡片时间线连接线 / Timeline Connector

- `2px` 竖线，颜色 `--color-border`，连接相邻卡片
- 早/中/晚分组标题：`上午 Morning`，`下午 Afternoon`，`晚上 Evening`

---

## 高德地图规格 / Amap Specs

### 地图样式 / Map Style

- **默认样式 Default:** 高德标准地图，`amap-theme-default`
- **自定义 Customization:** 主色调与 `--color-primary` 一致（地图可通过 Amap 自定义样式配置）

### POI 图钉 / POI Markers

| 状态 State | 样式 Style |
|---|---|
| 默认 Default | 蓝色圆形，数字序号，`24px` |
| 悬停 Hover | 放大至 `32px`，显示活动名称 tooltip |
| 激活 Active（行程卡片点击）| 跳动动效，颜色变为当前风格色 |

### 路线折线 / Route Polyline

- 每天使用不同颜色的折线 / Different color polyline per day
- Day 1: `--color-primary`，Day 2: `--color-magic-purple`，Day 3+: `--color-success`
- 折线宽度 Width: `4px`，透明度 Opacity: `0.8`

---

## 小红书风格攻略卡片 / XHS-Style Note Card Specs

位置：行程时间线下方，独立区块
*Position: Below day timeline, separate section*

### 卡片设计 / Card Design

```
┌──────────────────────────────────────────┐
│  [目的地图片，全出血，高度 160px]          │
├──────────────────────────────────────────┤
│  [标题，Exo 2 Bold，14px，2行截断]        │
│  成都3天完美攻略✨ 必打卡地点全收录        │
│                                          │
│  [正文，12px，4行截断，color-text-muted]  │
│                                          │
│  [标签行] #旅行 #成都美食 #任意门推荐      │
├──────────────────────────────────────────┤
│  [头像 32px]  任意门小助手    ♡ 收藏      │
└──────────────────────────────────────────┘
```

- **圆角 Radius:** `--radius-lg`（20px）
- **卡片宽度 Width:** `240px`（desktop 横向滚动）/ `100%`（mobile 竖向堆叠）
- **标签颜色 Tag Color:** `--color-magic-purple`，`bg-[--color-magic-purple]/10`

---

## 导出按钮规格 / Export Button Specs

- **位置 Position:** 页面顶部导航栏右侧
- **选项 Options:** 复制链接 / 生成 PDF / 分享到微信
- **样式 Style:** `outline` 按钮组，`--radius-sm`

---

## 反模式（本页专属）/ Anti-Patterns (This Page)

| ❌ 禁止 Don't | ✅ 替代 Do Instead |
|---|---|
| 无地图集成 / No map | 高德地图必须集成 / Amap must be integrated |
| 纯文字行程列表 / Plain text only | 结构化卡片 + 时间线 |
| Agent 状态面板遮挡行程 / Panel covering itinerary | Agent 完成后面板自动收起 |
| 地图与行程分离（两个页面）| 同页左右分栏 / Same page split layout |
| 不显示 Agent 生成过程 / Hide generation process | 实时进度条 + 流式文字 |
