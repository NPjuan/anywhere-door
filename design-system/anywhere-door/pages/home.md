# 主页覆写规则 / Home Page Overrides

> **项目 Project:** 任意门 Anywhere Door
> **页面类型 Page Type:** 主页 Hero / Landing
> **说明 Note:** 此文件中的规则**覆盖** `MASTER.md`，未提及的规则以 MASTER 为准。
> *Rules here **override** `MASTER.md`. Anything not mentioned falls back to MASTER.*

---

## 布局覆写 / Layout Overrides

### 整体布局 / Overall Layout

- **背景 Background:** 深空背景 `--color-bg-deep`（`#0A0E27`）+ 星空粒子
  *Deep space background + star field particles*
- **布局模式 Layout:** 全视口居中，传送门为绝对视觉中心
  *Full viewport centered, portal as absolute visual center*
- **内容层级 Content Layers:**
  1. 星空粒子背景（Canvas，最底层）/ Star particle background (Canvas, bottom layer)
  2. 传送门圆圈 + 光晕（绝对定位居中）/ Portal circle + glow (absolutely centered)
  3. 搜索表单面板（玻璃态，传送门下方）/ Search form panel (glassmorphism, below portal)
  4. 顶部浮动导航 / Top floating navbar

### 导航栏 / Navbar

- **样式 Style:** 浮动导航，与顶部边缘保持 `16px` 间距
  *Floating navbar, `16px` gap from top edge*
- **背景 Background:** `bg-white/10 backdrop-blur-md`（深色模式）
- **位置 Position:** `fixed top-4 left-4 right-4`，`z-[var(--z-portal)]`

---

## 间距覆写 / Spacing Overrides

- **传送门与搜索表单间距 / Portal to Search Form Gap:** `32px`
- **搜索表单内边距 / Search Form Padding:** `32px`（desktop）/ `20px`（mobile）
- 其余间距遵循 MASTER / *All other spacing follows MASTER*

---

## 色彩覆写 / Color Overrides

| 元素 Element | 亮色模式 Light | 深色模式 Dark |
|---|---|---|
| 页面背景 Page BG | 不适用（主页强制深色）| `#0A0E27` |
| 传送门光圈 Portal Ring | — | `--color-portal-glow` |
| 搜索面板背景 Search Panel | — | `rgba(255,255,255,0.08)` |
| 搜索面板边框 Search Panel Border | — | `rgba(255,255,255,0.15)` |
| 正文文字 Body Text | — | `#E0F2FE` |

> **规则：主页强制使用深色模式 / Rule: Home page forces dark mode**
> 无论系统设置，主页始终显示深空背景。
> *Regardless of system preference, home page always shows deep space background.*

---

## 字体覆写 / Typography Overrides

- **主标题 H1:** Orbitron, `font-size: clamp(2rem, 5vw, 3.5rem)`, `tracking-widest`
- **副标题 / Tagline:** Exo 2, `font-size: 1.125rem`, `opacity: 0.7`
- 其余字体遵循 MASTER / *All other typography follows MASTER*

---

## 传送门专属规格 / Portal-Specific Specs

### 静止状态 IDLE State
```
- 外圆光圈：2px 实线 #0EA5E9（旅游天蓝），box-shadow: --shadow-portal
- 内部：深色半透明（rgba(10,14,39,0.6)）
- 动画：portalPulse 轻微呼吸（视为"等待加载"状态，符合 skill 规范）
- Aurora 背景缓慢流动：auroraFlow 10s，背景环境动效（allowed）
- ⚠️ 无持续装饰性粒子动画（违反 skill 连续动画规范）
```

### 搜索中 SEARCHING State
```
- 光圈变为旋转边框（CSS @property + rotate，跟随搜索进度，非 infinite）
- 颜色渐变：#0EA5E9 → #818CF8（天蓝 → 靛紫）
- 过渡：250ms ease-in-out
```

### 开启 OPEN State（页面过渡触发）
```
- clip-path: circle(0%) → circle(150%)，800ms，--ease-portal
- 同时：白色闪光叠层（opacity 0→0.8→0，200ms，一次性）
- 完成后：AnimatePresence 切换至搜索结果页
```

---

## 搜索表单规格 / Search Form Specs

### 视觉设计 / Visual Design
- **形状 Shape:** 玻璃态圆角面板，`border-radius: --radius-xl`
- **背景 Background:** `rgba(255,255,255,0.08)` + `backdrop-blur-xl`
- **边框 Border:** `1px solid rgba(255,255,255,0.15)`
- **阴影 Shadow:** `0 8px 32px rgba(0,0,0,0.3)`

### 表单字段顺序 / Form Field Order
1. 出发城市 Departure City（带机场图标）
2. 目的城市 Destination City（带位置图标）
3. 出发日期 / 返回日期 Departure / Return Date
4. 旅行风格选择器 Travel Style Picker（5 个圆形图标按钮）
5. 出发按钮 Go Button（`--color-cta` 橙色，全宽，高度 `56px`）

### 出发按钮 CTA Button
```css
background: --color-cta (#F97316)
hover: --color-cta-hover (#EA6C0A)
border-radius: --radius-lg (20px)
font: Orbitron, font-weight: 700, letter-spacing: 0.1em
height: 56px
transition: all 250ms --ease-in-out
cursor-pointer: ✅ 必须
```

---

## 页面专属组件 / Page-Specific Components

| 组件 Component | 说明 Description |
|---|---|
| `PortalDoor` | 传送门主体，状态机动效 |
| `ParticleField` | Canvas 粒子系统（星星 + 尾迹）|
| `PortalTransition` | 开启时全屏 clip-path 扩展 |
| `SearchForm` | 玻璃态搜索面板，含5字段 |
| `TravelStylePicker` | 5种风格圆形图标选择器 |

---

## 反模式（主页专属）/ Anti-Patterns (Home Specific)

| ❌ 禁止 Don't | ✅ 替代 Do Instead |
|---|---|
| 亮色背景主页 / Light background home | 强制深空背景 / Force deep space background |
| 通用旅游照片 Hero / Generic travel stock photos | 传送门动效本身就是视觉焦点 |
| 复杂注册/登录流程 / Complex signup upfront | 直接搜索，无需登录 / Search first, no login required |
| 表单过多字段（>5）/ Too many form fields | 保持 5 个核心字段 |
| 传送门遮挡搜索表单 / Portal covering form | 传送门在上，表单在下，不重叠 |
