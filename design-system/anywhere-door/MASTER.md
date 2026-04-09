# 全局设计规范 / Global Design System Master

> **项目 Project:** 任意门 Anywhere Door
> **主题 Theme:** 科技感 + 可爱 / Kawaii Futurism（多啦A梦任意门 / Doraemon's Anywhere Door）
> **规则说明 Rule:** 页面专属文件（`pages/*.md`）中的规则**覆盖**此文件 / Rules in page-specific files **override** this master.

---

## 目录 / Contents

1. [设计理念 Design Philosophy](#1-设计理念--design-philosophy)
2. [色彩系统 Color System](#2-色彩系统--color-system)
3. [字体系统 Typography](#3-字体系统--typography)
4. [间距系统 Spacing](#4-间距系统--spacing)
5. [圆角系统 Border Radius](#5-圆角系统--border-radius)
6. [阴影系统 Shadows](#6-阴影系统--shadows)
7. [动画系统 Animation](#7-动画系统--animation)
8. [传送门组件 Portal Component](#8-传送门组件--portal-component)
9. [旅行风格主题 Travel Style Themes](#9-旅行风格主题--travel-style-themes)
10. [响应式断点 Breakpoints](#10-响应式断点--breakpoints)
11. [无障碍规范 Accessibility](#11-无障碍规范--accessibility)
12. [反模式 Anti-Patterns](#12-反模式--anti-patterns)

---

## 1. 设计理念 / Design Philosophy

**核心概念 Core Concept:** "科技感 + 可爱" = Kawaii Futurism

灵感来源于多啦A梦的任意门——一扇能瞬间抵达任何地方的神奇门。
*Inspired by Doraemon's Anywhere Door — a magical portal that instantly takes you anywhere.*

**ui-ux-pro-max 技能输出 / Skill Output:**
- **风格 Style:** Glassmorphism + Spatial UI（玻璃磨砂 + 空间感）
- **色板 Colors:** Travel/Tourism 专属色板（天蓝 + 探险橙）
- **字体 Typography:** Inter（Spatial Clear — "Optimized for readability on dynamic backgrounds"）
- **页面模式 Pattern:** Marketplace/Directory（搜索栏即 CTA）
- **关键动效约束 Key Animation Rule:** 持续动画（infinite）**仅限骨架屏 + 天空背景漂移**

**两种视觉语言的融合 / Fusion of Two Visual Languages:**

| 多啦A梦宇宙 Doraemon Universe | 轻盈科技感 Light Tech Aesthetic |
|---|---|
| 圆润形态 Rounded forms | Inter 干净现代字体 Clean modern font |
| 自由感 Freedom / openness | 蓝天白云背景 Sky & cloud background |
| 神奇传送门 Magical portal | 玻璃磨砂圆圈 Frosted glass circle |
| 可爱亲切 Cute & approachable | 柔和阴影层次 Soft shadow depth |

---

## 2. 色彩系统 / Color System

### 2.1 品牌主色 / Brand Colors

| Token | Hex | 用途 Usage |
|---|---|---|
| `--color-primary` | `#0EA5E9` | 旅游天蓝，主要交互元素 / Travel sky blue, primary interactive elements（ui-ux-pro-max 推荐）|
| `--color-primary-hover` | `#0284C7` | 悬停态 / Hover state |
| `--color-secondary` | `#38BDF8` | 浅天蓝，次要元素 / Light sky blue, secondary elements |
| `--color-cta` | `#F97316` | 出发橙，行动按钮 / "Go" orange, CTA buttons（ui-ux-pro-max 推荐）|
| `--color-cta-hover` | `#EA6C0A` | CTA 悬停 / CTA hover |

### 2.2 传送门魔法色 / Portal Magic Colors

| Token | Hex | 用途 Usage |
|---|---|---|
| `--color-portal-glow` | `#38BDF8` | 传送门光圈青色 / Portal glow ring cyan |
| `--color-magic-purple` | `#818CF8` | 粒子尾迹紫 / Particle trail purple |
| `--color-magic-cyan` | `#22D3EE` | 传送门波纹 / Portal shimmer |
| `--color-star-gold` | `#FCD34D` | 星星粒子金 / Star particle gold |
| `--color-door-frame` | `#1E3A8A` | 门框蓝（蓝图感）/ Door frame blue (blueprint feel) |

### 2.3 背景色 / Background Colors

| Token | 值 Value | 用途 Usage |
|---|---|---|
| `--color-bg-deep` | `#0A0E27` | 深空背景（深色模式/主页 Hero）/ Deep space (dark mode / home hero) |
| `--color-bg-base` | `#F0F9FF` | 浅空背景（亮色模式）/ Light sky (light mode) |
| `--color-surface` | `rgba(255,255,255,0.85)` | 卡片表面 / Card surface |
| `--color-glass` | `rgba(255,255,255,0.12)` | 玻璃态背景 / Glassmorphism background |
| `--color-glass-border` | `rgba(255,255,255,0.25)` | 玻璃态边框 / Glassmorphism border |

### 2.4 文字色 / Text Colors

| Token | Hex | 用途 / 最低对比度 |
|---|---|---|
| `--color-text` | `#0C4A6E` | 主要文字，亮色模式 / Primary text, light mode |
| `--color-text-muted` | `#475569` | 次要文字，最低 4.5:1 对比度 / Min 4.5:1 contrast ratio |
| `--color-text-light` | `#94A3B8` | 仅用于亮色背景上的提示文字 / Hint text on light bg only |

### 2.5 色彩使用规则 / Color Usage Rules

- ✅ 亮色模式正文使用 `--color-text`（`#0C4A6E`），对比度 ≥ 7:1
- ✅ 次要文字最低使用 `--color-text-muted`（`#475569`），对比度 ≥ 4.5:1
- ❌ 禁止在白色背景上使用 `--color-text-light` 作为正文
- ✅ 玻璃态卡片在亮色模式下背景透明度 ≥ `bg-white/80`
- ❌ 禁止在亮色模式使用 `bg-white/10`（过于透明，不可见）

---

## 3. 字体系统 / Typography

### 3.1 字体选型 / Font Selection

| 字体 Font | 用途 Usage | 来源 Source |
|---|---|---|
| **Inter** | 全站标题 + 正文（统一）/ All headings + body (unified) | ui-ux-pro-max → "Spatial Clear" —— "Optimized for readability on dynamic backgrounds" |

**为何选 Inter / Why Inter:**
- Glassmorphism 界面专属推荐，在动态背景上可读性最佳
- 极简系统感，接近 visionOS 风格
- 无需区分标题/正文字体，统一感强

**Google Fonts 导入 / Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

### 3.2 字号规范 / Font Size Scale

| 用途 Usage | 字号 Size | 行高 Line Height | 字体 Font |
|---|---|---|---|
| 主标题 H1 | `2.25rem` (36px) | `1.2` | Orbitron Bold |
| 副标题 H2 | `1.875rem` (30px) | `1.3` | Orbitron SemiBold |
| 小标题 H3 | `1.5rem` (24px) | `1.4` | Orbitron Medium |
| 正文大 Body LG | `1.125rem` (18px) | `1.75` | Exo 2 Regular |
| 正文 Body | `1rem` (16px) | `1.75` | Exo 2 Regular |
| 辅助文字 Small | `0.875rem` (14px) | `1.5` | Exo 2 Regular |
| 标签 Caption | `0.75rem` (12px) | `1.5` | Exo 2 Medium |

### 3.3 排版规则 / Typography Rules

- ✅ 移动端正文字号最低 `16px`，防止 iOS 缩放
- ✅ 正文行高 `1.5–1.75`，确保可读性
- ✅ 每行字符数限制在 `65–75` 个字符（`max-w-prose`）
- ✅ Orbitron 字母间距 `tracking-widest`（`0.1em`）增强科幻感

---

## 4. 间距系统 / Spacing

使用 Tailwind 默认 4px 基准间距，额外定义关键语义间距。
*Uses Tailwind default 4px base spacing, plus semantic spacing tokens.*

| Token | 值 Value | 对应 Tailwind |
|---|---|---|
| `--space-xs` | `0.25rem` (4px) | `p-1` |
| `--space-sm` | `0.5rem` (8px) | `p-2` |
| `--space-md` | `1rem` (16px) | `p-4` |
| `--space-lg` | `1.5rem` (24px) | `p-6` |
| `--space-xl` | `2rem` (32px) | `p-8` |
| `--space-2xl` | `3rem` (48px) | `p-12` |
| `--space-3xl` | `4rem` (64px) | `p-16` |

**容器宽度 / Container Widths:**
- 页面最大宽度 / Max page width: `max-w-7xl` (1280px)
- 内容最大宽度 / Content max width: `max-w-6xl` (1152px)
- 阅读宽度 / Reading width: `max-w-3xl` (768px)

---

## 5. 圆角系统 / Border Radius

| Token | 值 Value | 用途 Usage |
|---|---|---|
| `--radius-sm` | `6px` | 小按钮、标签 / Small buttons, badges |
| `--radius-md` | `12px` | 输入框、卡片 / Inputs, cards |
| `--radius-lg` | `20px` | 大卡片、面板 / Large cards, panels |
| `--radius-xl` | `28px` | 模态框、弹层 / Modals, drawers |
| `--radius-portal` | `50%` | 传送门圆形 / Portal circle |

**规则 Rules:**
- ✅ 同一页面使用同一圆角档位，保持一致性
- ❌ 禁止混用 `rounded-sm` 和 `rounded-2xl` 在相邻元素

---

## 6. 阴影系统 / Shadows

| Token | 用途 Usage |
|---|---|
| `--shadow-sm` | 细微分层 / Subtle layering |
| `--shadow-md` | 卡片默认 / Card default |
| `--shadow-lg` | 悬浮卡片 / Elevated cards |
| `--shadow-portal` | 传送门青紫双层光晕 / Portal dual-color glow |
| `--shadow-card` | 机票/行程卡片 / Flight/itinerary cards |

---

## 7. 动画系统 / Animation

### 7.1 时长规范 / Duration Scale

| Token | 值 Value | 用途 Usage |
|---|---|---|
| `--duration-fast` | `150ms` | 悬停态切换 / Hover state transitions |
| `--duration-base` | `250ms` | 微交互 / Micro-interactions |
| `--duration-slow` | `400ms` | 面板展开/收起 / Panel expand/collapse |
| `--duration-portal` | `800ms` | 传送门完整开启序列 / Full portal open sequence |

### 7.2 动画曲线 / Easing

| Token | 值 Value | 用途 Usage |
|---|---|---|
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 弹性交互 / Springy interactions |
| `--ease-portal` | `cubic-bezier(0.16, 1, 0.3, 1)` | 传送门开启 / Portal open |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | 标准过渡 / Standard transitions |

### 7.3 动画规则 / Animation Rules

> **来源 Source:** `ui-ux-pro-max` → ux-guidelines "Continuous Animation"

- ✅ 微交互时长 `150–300ms`（skill 推荐范围 / skill recommended range）
- ✅ 使用 `transform` / `opacity` 触发 GPU 加速，禁止动画 `width` / `height`
- ✅ 所有动画必须遵守 `prefers-reduced-motion`（globals.css 已全局处理）
- ✅ 加载状态使用 shimmer 骨架屏（`.shimmer` class）
- ✅ Aurora 背景流动动画（`10s` 慢速，`transform only`）—— 属于背景环境动效，允许持续
- ❌ **禁止**装饰性元素（图标、卡片等）使用 `infinite` 持续动画 —— skill 明确标注 Medium severity
- ❌ 禁止超过 `500ms` 的非传送门动效

### 7.4 传送门状态机 / Portal State Machine

```
IDLE      → 传送门光圈轻微呼吸（portalPulse，用户交互前的加载等待状态）
          → Portal ring gentle pulse (portalPulse — treated as loading-wait state)
          → Aurora 背景缓慢流动（auroraFlow 10s，背景环境动效）
          → Aurora background slow flow (auroraFlow 10s — ambient background)

SEARCHING → 搜索中：传送门光圈旋转边框（CSS border-image rotate，非 infinite，跟随进度）
          → Searching: Portal ring spinning border (CSS rotate, progress-driven, not infinite)

OPEN      → 圆心扩展至全屏（clip-path circle，800ms，一次性 forwards）
          → Expand from center to fullscreen (clip-path circle, 800ms, one-shot forwards)

CLOSING   → 反向收缩至圆点（一次性）
          → Reverse collapse to dot (one-shot)
```

---

## 8. 传送门组件 / Portal Component

### 8.1 视觉规格 / Visual Specs

| 状态 State | 圆圈尺寸 Size | 光圈色 Glow Color | 粒子 Particles |
|---|---|---|---|
| IDLE | 320px (desktop) | `#38BDF8` 青 / cyan | 12 个金色星星 / 12 gold stars |
| SEARCHING | 360px | 旋转青紫 / Spinning cyan-purple | 加速螺旋 / Accelerating spiral |
| OPEN | 全屏 Full screen | 白色闪光 → 消散 / White flash → fade | 爆炸散射 / Burst scatter |

### 8.2 传送门尺寸响应 / Responsive Portal Size

| 断点 Breakpoint | 传送门直径 Diameter |
|---|---|
| `375px` (mobile) | `240px` |
| `768px` (tablet) | `320px` |
| `1024px` (desktop) | `400px` |
| `1440px` (wide) | `480px` |

---

## 9. 旅行风格主题 / Travel Style Themes

选中风格时，传送门光圈颜色切换为对应主题色。
*When a style is selected, the portal ring color switches to the theme color.*

| 风格 Style | 中文 | Token | Hex | 高德 POI 类型码 Amap Type |
|---|---|---|---|---|
| Photography | 摄影 | `--color-style-photography` | `#F59E0B` | `110000`（风景名胜）|
| Foodie | 美食 | `--color-style-foodie` | `#EF4444` | `050000`（餐饮服务）|
| Adventure | 探险 | `--color-style-adventure` | `#10B981` | `090000`（体育休闲）|
| Culture | 文化 | `--color-style-culture` | `#8B5CF6` | `080000`（文化场馆）|
| Relaxation | 休闲 | `--color-style-relaxation` | `#06B6D4` | `070000`（住宿/SPA）|

---

## 10. 响应式断点 / Breakpoints

使用 Tailwind 默认断点系统。
*Uses Tailwind default breakpoint system.*

| 断点 Breakpoint | 宽度 Width | 布局变化 Layout Change |
|---|---|---|
| `xs` (默认 default) | `< 640px` | 单栏，传送门缩小 / Single column, portal shrinks |
| `sm` | `≥ 640px` | — |
| `md` | `≥ 768px` | 传送门 + 搜索表单并排 / Portal + search form side by side |
| `lg` | `≥ 1024px` | 行程页左右分栏 / Itinerary split layout |
| `xl` | `≥ 1280px` | 最大容器宽度生效 / Max container width active |

---

## 11. 无障碍规范 / Accessibility

| 规则 Rule | 要求 Requirement |
|---|---|
| 色彩对比 Color Contrast | 正文 ≥ 4.5:1，大字 ≥ 3:1（WCAG AA）|
| 焦点状态 Focus States | 所有交互元素必须有可见焦点环 / All interactive elements must have visible focus rings |
| 触摸目标 Touch Targets | 最小 `44×44px` |
| Alt 文字 Alt Text | 所有有意义的图片必须有描述性 alt |
| ARIA 标签 ARIA Labels | 纯图标按钮必须有 `aria-label` |
| 键盘导航 Keyboard Nav | Tab 顺序与视觉顺序一致 / Tab order matches visual order |
| 减少动画 Reduced Motion | `prefers-reduced-motion` 全局生效（globals.css 已处理）|

---

## 12. 反模式 / Anti-Patterns

以下是此项目**禁止**的设计做法：
*The following design practices are **forbidden** in this project:*

| ❌ 禁止 Don't | ✅ 替代 Do Instead |
|---|---|
| 使用 emoji 作为 UI 图标 / Using emojis as UI icons | 使用 Lucide React SVG 图标 / Use Lucide React SVG icons |
| 正确品牌 Logo 未核实 / Unverified brand logos | 使用 Simple Icons 的官方 SVG |
| hover 时产生布局偏移 / Layout shift on hover | 仅使用 `color` / `opacity` / `shadow` 变化 |
| 亮色模式使用 `bg-white/10` 玻璃态 | 最低使用 `bg-white/80` |
| 不同页面使用不同容器宽度 / Mixed container widths | 统一使用 `max-w-7xl` |
| 动画使用 `width` / `height` | 使用 `transform` / `opacity`（GPU 加速）|
| 正文使用 `color: gray-400` | 最低使用 `--color-text-muted`（`#475569`）|
| 固定导航栏遮挡内容 / Fixed navbar covering content | 预留导航栏高度的 padding-top |
| 无 `cursor-pointer` 的可点击元素 | 所有可点击元素加 `cursor-pointer` |
