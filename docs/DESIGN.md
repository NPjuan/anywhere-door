# 设计规范

## 视觉风格

- **主题**：科技感 + 轻灵感，蓝白为主色调，背景 `#F8FAFF`
- **品牌色**：`#2563EB`（蓝），强调/交互元素统一使用
- **字体**：Inter（英文）+ 系统默认（中文），`font-family: Inter, system-ui, sans-serif`

---

## 颜色规范

### 文字

| 用途 | 颜色 |
|------|------|
| 主标题 / 重要内容 | `#0F172A` |
| 正文 | `#111827` |
| 次要文字 | `#475569` |
| 辅助说明 | `#64748B` |
| 表单标签 | `#6B7280` |
| Placeholder / 弱提示 | `#9CA3AF` |
| 极弱 / 装饰性 | `#94A3B8`、`#CBD5E1` |

### 品牌色

| 用途 | 颜色 |
|------|------|
| 主色 / 按钮 / 链接 | `#2563EB` |
| 主色悬浮 | `#1D4ED8` |
| 浅蓝背景 | `#EFF6FF` |
| 浅蓝边框 | `#BFDBFE` |
| 浅蓝文字 | `#93C5FD` |

### 状态色

| 状态 | 背景 | 边框 | 文字 |
|------|------|------|------|
| 成功 | `#F0FDF4` | `#BBF7D0` | `#16A34A` |
| 错误 | `#FEF2F2` | `#FECACA` | `#EF4444` |
| 警告 | `#FFFBEB` | `#FDE68A` | `#D97706` |
| 信息 | `#EFF6FF` | `#BFDBFE` | `#2563EB` |

### 中性色

| 用途 | 颜色 |
|------|------|
| 页面背景 | `#F8FAFF` |
| 卡片背景 | `#FFFFFF` |
| 输入框背景 | `#FAFBFC` |
| 分割线 | `#F3F4F6` |
| 边框（默认）| `#E5E7EB` |
| 边框（强调）| `#E2E8F0` |

---

## 圆角规范

| 场景 | 值 |
|------|----|
| 卡片、输入框、按钮 | `8px`（`borderRadius: 8`）|
| 小标签、小按钮 | `6px` |
| 极小标签 / chip | `4px` |
| 弹窗 | `12px` |

---

## 阴影规范

| 场景 | 阴影 |
|------|------|
| 表单卡片（主） | `0 2px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08)` |
| 普通卡片 | `0 1px 4px rgba(0,0,0,0.05)` |
| 按钮（品牌色） | `0 4px 14px rgba(37,99,235,0.30)` |
| 下拉弹窗 | `0 8px 24px rgba(0,0,0,0.10)` |
| 大弹窗 | `0 8px 32px rgba(0,0,0,0.12)` |

---

## 间距规范

- 卡片内边距：`p-5`（20px）
- 卡片间距：`gap-4`（16px）或 `gap-5`（20px）
- 区块间距：`mt-4`、`mt-5`
- 图标与文字间距：`gap-1.5`（6px）

---

## 按钮规范

### 主按钮（规划行程）
```css
background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
color: #FFFFFF;
border-radius: 8px;
font-weight: 600;
box-shadow: 0 4px 14px rgba(37,99,235,0.30);
```

### 次要按钮（复制/分享/下载）
```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
color: #64748B;
padding: 7px 14px;
border-radius: 8px;
font-size: 13px;
font-weight: 500;
```

### 图标按钮（返回）
```css
width: 32px; height: 32px;
border: 1px solid #E2E8F0;
background: #FFFFFF;
color: #374151;
border-radius: 8px;
```

---

## 动效规范

- **页面入场**：`framer-motion`，`opacity: 0→1`，`y: 20→0`，`duration: 0.4~0.6s`，`ease: [0.16, 1, 0.3, 1]`
- **卡片切换**：`duration: 0.15s`，`ease: easeOut`
- **按钮点击**：`whileTap: { scale: 0.96~0.97 }`
- **浮层入场**：`spring`，`damping: 24, stiffness: 300`

---

## 组件规范

### 表单
- 标签颜色：`#6B7280`，`font-size: 12px`（`text-xs`），无 `font-weight`
- Placeholder：`#9CA3AF`
- 输入框边框：`#E5E7EB`，focus 时：`#93C5FD`
- 背景：`#FAFBFC`

### 进度/状态
- Running（动点）：三个点动画，颜色跟 agent 主题色
- Done（✓）：绿色勾，`#16A34A`
- Error（!）：红色感叹号，`#EF4444`

### 行程详情
- 时间线卡片背景：`#FAFBFC`，边框：`#F1F5F9`
- 日期标签选中：`#2563EB` 蓝底白字；未选中：透明底，边框 `#E2E8F0`

---

## 品牌语

- 中文：口袋里装着整个世界，你想去何方
- 副文案（轮换）：
  - 找传说的宝藏，冒险到远方
  - 心中有许多愿望，能够实现有多棒
  - 每天过的都一样，偶尔会突发奇想
- Prompt placeholder：细节描述越多，任意门开的越准，向任意门许愿吧！
