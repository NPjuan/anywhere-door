# 搜索结果页覆写规则 / Search Results Page Overrides

> **项目 Project:** 任意门 Anywhere Door
> **页面类型 Page Type:** 机票搜索结果 / Flight Search Results
> **说明 Note:** 此文件中的规则**覆盖** `MASTER.md`，未提及的规则以 MASTER 为准。
> *Rules here **override** `MASTER.md`. Anything not mentioned falls back to MASTER.*

---

## 设计原则（本页）/ Design Principle (This Page)

**目标 Goal:** 快速、清晰、可扫描。从主页的"魔幻深空"切换至"专业简洁"。
*Fast, clear, scannable. Transition from home's "magic deep space" to "professional clean".*

**风格 Style:** Flat Design + 轻量卡片 / Flat Design + lightweight cards（非玻璃态）

---

## 布局覆写 / Layout Overrides

### 整体布局 / Overall Layout

```
┌─────────────────────────────────────────────────────────┐
│  浮动导航（含返回按钮 + 行程摘要）/ Floating Navbar      │
├──────────────────┬──────────────────────────────────────┤
│  筛选侧边栏      │  机票结果列表                         │
│  Filter Sidebar  │  Flight Results List                  │
│  (固定 sticky)   │  (可滚动 scrollable)                  │
│  宽度: 280px     │  宽度: flex-1                         │
├──────────────────┴──────────────────────────────────────┤
│  移动端：筛选变为底部抽屉 / Mobile: Filter → Bottom Sheet │
└─────────────────────────────────────────────────────────┘
```

- **背景 Background:** `--color-bg-base`（`#F0F9FF`）亮色 / light
- **容器 Container:** `max-w-7xl`，两侧 `px-4`（mobile）/ `px-8`（desktop）
- **顶部间距 Top Padding:** `80px`（为固定导航预留 / for fixed navbar）

---

## 筛选侧边栏规格 / Filter Sidebar Specs

| 筛选项 Filter | 组件类型 Component |
|---|---|
| 价格区间 Price Range | 双头滑块 Dual-handle slider |
| 航空公司 Airline | 复选框列表 Checkbox list |
| 停留次数 Stops | 单选按钮 Radio: 直飞/1次/不限 |
| 出发时段 Departure Time | 时段图标按钮组 Time period icon group |
| 飞行时长 Flight Duration | 滑块 Slider |

- **侧边栏背景 Sidebar BG:** `bg-white`，右侧 `1px border-r border-[--color-border]`
- **每个筛选区块间距 / Section Spacing:** `mb-6`，含分割线

---

## 机票卡片规格 / Flight Card Specs

### 卡片结构 / Card Structure

```
┌──────────────────────────────────────────────────────┐
│  [航司Logo]  出发时间  ───────►  到达时间  [价格]    │
│  航司名称    出发机场          到达机场   [选择按钮]  │
│             ─── 飞行时长 / 停留次数 ───               │
└──────────────────────────────────────────────────────┘
```

- **卡片背景 Card BG:** `bg-white`
- **圆角 Border Radius:** `--radius-md`（12px）
- **阴影 Shadow:** `--shadow-card`（默认）→ `--shadow-lg`（hover）
- **边框 Border:** `border border-[--color-border]`
- **hover 过渡 Hover Transition:** `border-color` 变为 `--color-primary`，`250ms`
- **cursor:** `cursor-pointer` ✅ 必须

### 价格展示 / Price Display

- **字体 Font:** Orbitron，`font-size: 1.5rem`，颜色 `--color-primary`
- **货币 Currency:** `¥` 前缀，次要文字显示"起 from"

### 选择按钮 / Select Button

- **默认态 Default:** `outline` 样式，`border-[--color-primary]`，`color-[--color-primary]`
- **选中态 Selected:** `bg-[--color-primary]`，`text-white`，传送门小图标 🔵
- **高度 Height:** `40px`

### 卡片动效 / Card Animation

- **进入动效 Enter:** 从下方滑入 + 淡入，交错延迟（每张 `50ms`）
  *Slide up + fade in, staggered delay (50ms per card)*
- **hover:** `translateY(-2px)`，`250ms`

---

## 排序选项卡 / Sort Tabs

位置：机票列表顶部，固定在侧边栏右侧列顶部
*Position: Top of flight list, sticky within right column*

| 选项 Option | 说明 Description |
|---|---|
| 推荐 Best Match | 综合价格 + 时长 + 停留 |
| 价格最低 Cheapest | 按总价升序 |
| 时间最短 Fastest | 按飞行时长升序 |

- **激活态 Active:** `bg-[--color-primary]` + `text-white`
- **未激活态 Inactive:** `bg-white` + `text-[--color-text-muted]` + `hover:bg-[--color-border]`
- **圆角 Radius:** `--radius-sm`（6px）

---

## 空状态 / Empty State

当 API 返回 0 条结果时 / When API returns 0 results:

```
[传送门小图标，灰色，120px]
没有找到符合条件的航班
No flights found matching your criteria

[建议文字]
试试调整出发日期或修改筛选条件
Try adjusting your dates or changing filters

[修改搜索 按钮]  [返回主页 按钮]
```

- ❌ 禁止显示空白页面 / Never show blank page
- ❌ 禁止仅显示错误代码 / Never show error codes only

---

## 加载骨架屏 / Loading Skeleton

API 请求期间显示 3 张骨架卡片，使用全局 `.shimmer` 样式。
*Show 3 skeleton cards during API request, using global `.shimmer` style.*

```
[骨架卡片 × 3]
背景: rgba(56,189,248,0.05) → rgba(56,189,248,0.15) → 循环
宽度: 与真实卡片相同
圆角: --radius-md
```

---

## API 来源标识 / API Source Badge

卡片右下角显示数据来源（开发模式）/ Show data source in dev mode (bottom right of card):

| 来源 Source | 显示 Display |
|---|---|
| Amadeus | 小蓝点 + "Amadeus" |
| Aviationstack | 小橙点 + "Aviationstack" |
| Mock Data | 小灰点 + "Mock" |

---

## 反模式（本页专属）/ Anti-Patterns (This Page)

| ❌ 禁止 Don't | ✅ 替代 Do Instead |
|---|---|
| 玻璃态卡片（性能差）/ Glassmorphism cards | 纯白背景卡片 / Solid white cards |
| 深色背景（阅读疲劳）/ Dark background | 浅空蓝背景 `#F0F9FF` |
| 无筛选功能 / No filter | 侧边栏筛选（desktop）/ 底部抽屉（mobile）|
| 显示原始 API 错误信息 / Raw API errors | 友好的空状态 UI |
| 卡片无 hover 反馈 / No hover feedback | `border-color` + `translateY` 变化 |
