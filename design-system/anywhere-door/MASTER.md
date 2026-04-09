# 全局设计规范 / Global Design System

> **项目:** 任意门 Anywhere Door
> **最后更新:** 2026-04
> **规则说明:** `pages/*.md` 中的规则覆盖此文件

---

## 1. 设计理念

灵感来源于多啦A梦的任意门——轻盈、现代、充满可能性。

**视觉定位:** 简洁蓝白科技感，克制使用动效，以内容为核心

| 特征 | 实现方式 |
|------|---------|
| 轻盈感 | 白底卡片 + 细边框 + 柔和阴影 |
| 现代感 | Inter 字体 + 蓝色主色 + 8px 圆角 |
| 专注感 | 背景浅蓝网格纹 + 克制动效 |

---

## 2. 色彩系统

### 主色

| 用途 | 值 | 说明 |
|------|-----|------|
| 品牌主色 | `#2563EB` | 按钮、链接、激活态 |
| 主色深 | `#1D4ED8` | 按钮渐变终点、hover |
| 主色浅 | `#EFF6FF` | 选中背景、高亮背景 |
| 主色边框 | `#BFDBFE` | 选中边框 |

### 中性色

| 用途 | 值 |
|------|-----|
| 页面背景 | `#F8FAFF` |
| 卡片背景 | `#FFFFFF` |
| 卡片边框 | `#E5E7EB` |
| 分割线 | `#F3F4F6` |
| 主要文字 | `#0F172A` |
| 次要文字 | `#64748B` |
| 占位文字 | `#9CA3AF` |
| 禁用文字 | `#D1D5DB` |

### 语义色

| 用途 | 值 |
|------|-----|
| 成功 | `#16A34A` / `#F0FDF4` |
| 危险/删除 | `#EF4444` / `#FEF2F2` / `#FECACA` |
| 警告 | `#D97706` / `#FFFBEB` |

---

## 3. 字体系统

**字体:** `Inter, system-ui, sans-serif`（全站统一）

| 用途 | 大小 | 字重 | 行高 |
|------|------|------|------|
| 页面主标题 | `clamp(2.8rem, 10vw, 5rem)` | 900 | 1.15 |
| 卡片标题 H2 | `1.25rem` (20px) | 700 | 1.25 |
| 小标题 H3 | `1rem` (16px) | 600 | 1.4 |
| 正文 | `0.875rem` (14px) | 400 | 1.6 |
| 辅助文字 | `0.75rem` (12px) | 400~500 | 1.5 |
| 标签/胶囊 | `0.75rem` (12px) | 500 | — |

---

## 4. 圆角系统

**统一使用 `8px`，所有卡片、按钮、输入框保持一致。**

| 用途 | 值 |
|------|-----|
| 卡片、面板、输入框、按钮 | `8px` |
| 小标签、胶囊 | `6px` |
| 图标容器（小） | `6px` |
| 圆形头像/徽标 | `50%` |

---

## 5. 阴影系统

| 用途 | 值 |
|------|-----|
| 主卡片（表单/行程） | `0 2px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08)` |
| 普通卡片 | `0 1px 4px rgba(0,0,0,0.05)` |
| 顶部导航按钮 | `0 2px 8px rgba(0,0,0,0.08)` |
| 主按钮 | `0 4px 14px rgba(37,99,235,0.30)` |

---

## 6. 按钮规范

### 主按钮（CTA）
```css
background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
color: #FFFFFF;
border: none;
border-radius: 8px;
padding: 10px 24px;
font-size: 14px;
font-weight: 600;
box-shadow: 0 4px 14px rgba(37,99,235,0.30);
```

### 次级按钮（Default）
```css
background: #FFFFFF;
color: #64748B;
border: 1px solid #E2E8F0;
border-radius: 8px;
padding: 7px 14px;
font-size: 13px;
font-weight: 500;
```

### 危险按钮（Danger）
```css
background: transparent;
color: #EF4444;
border: 1px solid #FECACA;
border-radius: 8px;
```

### 规则
- 所有按钮 `border-radius: 8px`，禁止使用 `rounded-full` 胶囊形
- 禁用态：`opacity: 0.4` 或 `background: #F3F4F6; color: #9CA3AF`
- 加载态：图标静态展示，不做旋转动画

---

## 7. 表单规范

### 输入框
```css
border: 1px solid #E5E7EB;
border-radius: 8px;
background: #FFFFFF;
font-size: 14px;
color: #111827;
/* focus */
outline: none;
box-shadow: none;
border-color: #2563EB;
```

### 复合输入容器（城市+日期一行）
```css
border: 1px solid #E5E7EB;
border-radius: 8px;
overflow: hidden;
```
内部子区域用竖线（`width: 1px; background: #E5E7EB`）分隔，不重复加边框。

---

## 8. 卡片规范

```css
background: #FFFFFF;
border: 1px solid #E5E7EB;
border-radius: 8px;
box-shadow: 0 1px 4px rgba(0,0,0,0.05);
```

主要卡片（表单/AI预览）用更强阴影：
```css
box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08);
```

---

## 9. 动画规范

| 类型 | 时长 | 曲线 |
|------|------|------|
| 微交互（hover/focus） | `150ms` | `ease` |
| 元素进入 | `300~600ms` | `[0.16, 1, 0.3, 1]`（Expo Out） |
| 列表项延迟 | `delay: i * 40ms` | — |
| 页面切换 | `450ms` | `[0.16, 1, 0.3, 1]` |
| 轮播切换 | `400ms` | `easeInOut` |

**规则:**
- 进入动画：`opacity: 0→1` + `y: 20→0`（或 `y: 6→0` 小元素）
- 使用 Framer Motion `AnimatePresence` 处理条件渲染动效
- `infinite` 动画仅限：背景漂移、骨架屏 shimmer、Hero 标题轮播
- 禁止按钮图标做旋转 `infinite` 动画

---

## 10. 图标规范

统一使用 **Lucide React**，`size` 规格：

| 场景 | Size |
|------|------|
| 正文内联图标 | `12px` |
| 按钮图标 | `13~14px` |
| 列表/卡片图标 | `14~15px` |
| 标题/导航图标 | `16px` |
| 空状态插图 | `28px` |

---

## 11. 间距规范

基准：`4px` 倍数系统（Tailwind 默认）

| 用途 | 值 |
|------|-----|
| 卡片内边距 | `20px` (p-5) |
| 卡片底部操作栏 | `12px 20px` |
| 行内元素间距 | `6~8px` |
| 区块间距 | `16~20px` |
| 页面水平边距 | `16px` (px-4) |
| 页面最大宽度（主内容） | `768px` (max-w-3xl) |
| 页面最大宽度（行程） | `1152px` (max-w-6xl) |

---

## 12. 反模式

| 禁止 | 替代 |
|------|------|
| `rounded-full` / `rounded-2xl` 用于卡片和按钮 | 统一 `border-radius: 8px` |
| 按钮图标 `animate-spin` infinite | 静态图标 + 文案变化 |
| focus 时出现默认黑色 outline | `outline: none; box-shadow: none` |
| 装饰性元素用 `infinite` 动画 | 只用于骨架屏/背景 |
| 文字用 `text-gray-400`（`#9CA3AF`）作为正文 | 最低用 `#64748B` |
| 同一区域混用不同圆角值 | 同层级元素圆角一致 |
