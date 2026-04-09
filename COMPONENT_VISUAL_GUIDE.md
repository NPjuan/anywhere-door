# Anywhere Door - Component Visual Guide & Styling Reference

## 1. ITINERARY OUTPUT PAGE LAYOUT

```
┌─────────────────────────────────────────────────────────────┐
│  Background: #020B18 (Deep Dark)                            │
│  DeepBackground component (light gradients overlay - unused) │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [← 返回]                                    [ExportButton]  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 标题: 行程名称                                        │   │
│  │ 描述: AI生成的摘要                                    │   │
│  │ [📍 目的地] [📅 X天] [💰 预算]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────┬──────────────────────┐       │
│  │  DayTimeline (col-span-3) │  RouteMap (col-span-2)      │
│  │                          │  sticky top            │
│  │  ┌─────────────────────┐ │  ┌──────────────────┐ │
│  │  │ Day 1 │ Day 2 │ ... │ │  │                  │ │
│  │  └─────────────────────┘ │  │   Amap (360px)   │ │
│  │  ┌─────────────────────┐ │  │                  │ │
│  │  │ 第1天 - Title       │ │  │  [POI Markers]   │ │
│  │  └─────────────────────┘ │  │  [Route Line]    │ │
│  │                          │  │                  │ │
│  │  上午 Morning:           │  │                  │ │
│  │  ┌──────────────────┐   │  │                  │ │
│  │  │ 09:00 Activity 1 │   │  │                  │ │
│  │  │ Time, Cost, Addr │   │  │                  │ │
│  │  └──────────────────┘   │  │                  │ │
│  │  ┌──────────────────┐   │  │                  │ │
│  │  │ 12:00 Activity 2 │   │  └──────────────────┘ │
│  │  └──────────────────┘   │                        │
│  │                          │                        │
│  │  下午 Afternoon:         │                        │
│  │  [Activities...]         │                        │
│  │                          │                        │
│  │  晚上 Evening:           │                        │
│  │  [Activities...]         │                        │
│  └──────────────────────────┴──────────────────────┘
│                                                     │
│  [XHS 攻略笔记 horizontal scroll]                    │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐              │
│  │卡片│ │卡片│ │卡片│ │卡片│ │卡片│              │
│  └────┘ └────┘ └────┘ └────┘ └────┘              │
│                                                     │
│  ⚠️ 注意事项 (if present)                          │
│  · 建议项目 1                                       │
│  · 建议项目 2                                       │
│                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. EXPORT BUTTON COMPONENT DETAIL

```
┌─────────────────────────────────────────┐
│  ExportButton Location: Line 139-141    │
│  in ItineraryContent.tsx                │
└─────────────────────────────────────────┘

[复制行程]  [分享]

BUTTON 1: 复制行程 (Copy Itinerary)
├─ State: Default
│  ├─ Background: #F9FAFB (light gray)
│  ├─ Border: 1px solid #E5E7EB
│  ├─ Color: #64748B (gray text)
│  ├─ Icon: Copy (Lucide)
│  ├─ Label: "复制行程"
│  └─ Action: Copy to clipboard
│
├─ State: Copied (2s duration)
│  ├─ Background: #F0FDF4 (light green)
│  ├─ Border: 1px solid #BBF7D0
│  ├─ Color: #16A34A (green text)
│  ├─ Icon: CheckCircle (Lucide)
│  └─ Label: "已复制"
│
└─ Style Details
   ├─ Padding: 6px 12px
   ├─ BorderRadius: 8px
   ├─ FontSize: 13px
   ├─ FontWeight: 500
   ├─ Display: flex (gap: 6px)
   └─ WhiteSpace: nowrap

BUTTON 2: 分享 (Share)
├─ State: Default
│  ├─ Background: transparent
│  ├─ Border: 1px solid #E5E7EB
│  ├─ Color: #64748B (gray text)
│  ├─ Icon: Share2 (Lucide)
│  ├─ Label: "分享"
│  └─ Action: navigator.share() API
│
└─ Style Details
   ├─ Padding: 6px 12px
   ├─ BorderRadius: 8px
   ├─ FontSize: 13px
   ├─ FontWeight: 500
   └─ WhiteSpace: nowrap
```

---

## 3. DAY TIMELINE COMPONENT DETAIL

```
┌────────────────────────────────────────────┐
│  DayTimeline Component Structure           │
│  File: DayTimeline.tsx (lines 50-128)      │
└────────────────────────────────────────────┘

┌─ Day Tabs (horizontal scroll) ─────────────┐
│ [Day 1] [Day 2] [Day 3] [Day 4]           │
│  ↑ Active state: gradient blue background  │
│  gradient: #0EA5E9 → #38BDF8               │
│  text: white, shadow: 0 2px 8px            │
│  inactive: #F1F5F9 with gray border        │
└─────────────────────────────────────────────┘

┌─ Day Header ───────────────────────────────┐
│ Background: linear-gradient(135deg,        │
│   #0EA5E9, #0284C7)                        │
│ ┌──────────────────────────────────────┐  │
│ │ 第 1 天 · 2024-04-01                 │  │
│ │ 成都文化探索之旅                       │  │
│ └──────────────────────────────────────┘  │
│ BorderRadius: 20px                         │
│ Padding: 12px 20px                         │
│ Color: white                               │
└─────────────────────────────────────────────┘

┌─ Section: 上午 Morning ───────────────────┐
│ ┌─────────────────────────────────────┐  │
│ │ 上午 · Morning ─────────────────────│  │
│ └─────────────────────────────────────┘  │
│ Color: #38BDF8 on rgba(14,165,233,0.10)  │
│ BorderRadius: full                        │
│                                           │
│ Timeline Connector (left side):           │
│ Vertical line: 2px, #E2E8F0               │
│                                           │
│ ┌─ Activity Card ──────────────────┐   │
│ │ ●   [09:00]  锦里古街              │   │
│ │  \  说明文字...                     │   │
│ │   └─ 地点 | 1h | ¥50               │   │
│ │                                    │   │
│ │ Left Border: 3px solid #0EA5E9    │   │
│ │ Background: #FFFFFF                │   │
│ │ Border: 1px solid #E2E8F0         │   │
│ │ BoxShadow: 0 1px 4px rgba(...)    │   │
│ │ Padding: 14px                      │   │
│ │ Cursor: pointer                    │   │
│ └──────────────────────────────────┘   │
│ ┌─ Activity Card ──────────────────┐   │
│ │ ●   [11:00]  宽窄巷子             │   │
│ │  \  ...                           │   │
│ └──────────────────────────────────┘   │
│                                         │
│ [Same pattern for afternoon/evening]   │
└─────────────────────────────────────────┘
```

---

## 4. ACTIVITY CARD INTERNAL STRUCTURE

```
Activity Card Internal Layout:

┌─────────────────────────────────────────┐
│ • │ [时间]  [活动名称]                   │
│   │ 09:00   锦里古街                     │
│   │                                      │
│   │ 这是AI生成的一句话活动描述...        │
│   │                                      │
│   │ [⏱️ 1h] [💰 ¥50] [📍 武侯区]      │
│   │                                      │
│   │ [🚌 地铁3号线/公交]                 │
│   │                                      │
└─────────────────────────────────────────┘

Components:
- Left dot marker: 
  position: absolute -left-[18px]
  size: 12px × 12px
  background: var(--color-primary) #0EA5E9
  border: 2px white

- Time badge:
  background: rgba(56,189,248,0.12)
  color: #38BDF8
  border-radius: 4px
  padding: 4px 6px
  font-size: 12px
  font-weight: 500

- Activity name:
  color: #0F172A (dark)
  font-weight: 600
  font-size: 14px
  truncate

- Description:
  color: #64748B (gray)
  font-size: 13px
  line-height: 1.4

- Metadata tags (duration, cost, address):
  color: #94A3B8 (lighter gray)
  font-size: 12px
  display: flex, gap: 8px

- Transport badge:
  background: light blue
  color: primary
  font-size: 11px
  padding: 4px 6px
```

---

## 5. ROUTE MAP COMPONENT

```
┌─────────────────────────────────────────┐
│  RouteMap (Amap Integration)            │
│  Height: 360px                          │
│  BorderRadius: 12px                     │
│  Overflow: hidden                       │
└─────────────────────────────────────────┘

States:

[LOADING] 
├─ Overlay: rgba(240,249,255,0.8)
├─ Content: spinner + "地图加载中..."
└─ Display: flex center

[ERROR / NO KEY]
├─ Background: #F8FAFF
├─ Border: 1px solid #E2E8F0
├─ Icon: Map (Lucide, 36px)
├─ Text: "地图暂不可用"
└─ Fallback: POI list

[LOADED]
├─ Amap initialization
├─ POI Markers:
│  ├─ Style: numbered circles
│  ├─ Label: white badge with border
│  ├─ Border color: DAY_COLORS[0] (#0EA5E9)
│  ├─ BoxShadow: 0 2px 8px rgba(14,165,233,0.2)
│  └─ Offset: x=0, y=-40
│
├─ Polyline (connecting POIs):
│  ├─ Color: DAY_COLORS[0] (#0EA5E9)
│  ├─ Weight: 3px
│  ├─ Opacity: 0.8
│  ├─ Style: dashed
│  └─ Used when: pois.length > 1
│
└─ Map options:
   ├─ Zoom: 13
   ├─ Center: first POI or default Chengdu
   └─ Style: amap://styles/fresh

DAY_COLORS Array:
[
  '#0EA5E9',  // Day 1: sky blue
  '#818CF8',  // Day 2: indigo
  '#10B981',  // Day 3: green
  '#F59E0B',  // Day 4: amber
  '#EF4444'   // Day 5+: red
]
```

---

## 6. XHS STYLE NOTE COMPONENT

```
┌─ XHS Style Note Card ──────────────────┐
│  Horizontal scroll section              │
│  Width: 288px (w-72)                    │
│  BorderRadius: 8px                      │
│  Padding: 12px 14px                     │
│  Background: #FFFFFF                    │
│  Border: 1px solid #E5E7EB              │
└────────────────────────────────────────┘

Card Layout:

┌──────────────────────────────────────┐
│ [Type] [Title]               [View →] │
└──────────────────────────────────────┘

Left - Type Badge:
├─ Format: colored tag
├─ Font-size: 11px
├─ Padding: 2px 6px
├─ Border-radius: 4px
├─ White-space: nowrap
│
└─ Types & Colors:
   ├─ 攻略 (guide):   Blue #2563EB on #EFF6FF
   ├─ 清单 (toplist): Purple #7C3AED on #F5F3FF
   ├─ 避坑 (tips):    Orange #D97706 on #FFFBEB
   ├─ 点评 (review):  Green #059669 on #ECFDF5
   └─ 日记 (diary):   Pink #DB2777 on #FDF2F8

Middle - Title:
├─ Flex: 1 (grow)
├─ Color: #0F172A (dark)
├─ Font-size: 14px
├─ Font-weight: 500
├─ Text: truncate (1 line)
└─ Action: Links to xiaohongshu.com search

Right - View Link:
├─ Color: #2563EB (blue)
├─ Font-size: 12px
├─ Text: "查看 →"
├─ Shrink: 0 (no wrap)
└─ White-space: nowrap

Hover Effects:
├─ Border-color: #BFDBFE (lighter blue)
├─ Background: #FAFEFF (very light)
└─ Transition: 150ms
```

---

## 7. BACKGROUND STYLING COMPARISON

```
┌────────────────────────────────────────┐
│  AuroraBackground.tsx (Light Mode)     │
└────────────────────────────────────────┘

Base Color: #F8FAFF (very light blue)

Top-Left Gradient:
┌─────────────────────────────────────┐
│ ↗ radial-gradient(ellipse ...)       │
│   at 35% 40% (offset top-left)       │
│   - rgba(219,234,254,0.70) (bright)  │
│   - rgba(191,219,254,0.25) (medium)  │
│   - transparent (fade)               │
│   blur: 2px                          │
└─────────────────────────────────────┘

Bottom-Right Gradient:
┌─────────────────────────────────────┐
│ ↙ radial-gradient(ellipse ...)       │
│   at 65% 60% (offset bottom-right)   │
│   - rgba(254,243,199,0.55) (warm)    │
│   - rgba(253,230,138,0.15) (faded)   │
│   - transparent (fade)               │
│   blur: 2px                          │
└─────────────────────────────────────┘

Grid Overlay:
73×73px grid of light indigo lines
rgba(99,102,241,0.035) - very subtle

═══════════════════════════════════════

PAGE BACKGROUNDS APPLIED:

HOME PAGE (page.tsx):
├─ Main: #F8FAFF
├─ Component: <LightBackground />
├─ Renders: Light Aurora effect
└─ Result area: #F1F5F9 (slightly darker)

ITINERARY PAGE (ItineraryContent.tsx):
├─ Main: #020B18 (DARK) ⚠️
├─ Component: <DeepBackground />
├─ Renders: Light Aurora effect (covered!)
└─ Issue: Mismatch!

DESIGN SPEC SAYS:
├─ Home: #F8FAFF ✓
├─ Itinerary: #F0F9FF (not #020B18!) ✗
└─ Result on home: #F1F5F9 ✓
```

---

## 8. COLOR PALETTE QUICK REFERENCE

### Primary UI Colors
```
Sky Blue Primary:     #0EA5E9    ← Main interactive color
Sky Blue Primary Hover: #0284C7   ← Hover state
Light Sky Blue:       #38BDF8    ← Secondary
Go Orange:            #F97316    ← CTA buttons
Orange Hover:         #EA6C0A    ← CTA hover
```

### Text Colors (on light backgrounds)
```
Dark Text:            #0F172A    ← H1/strong text
Gray Text:            #64748B    ← body/normal text
Lighter Gray:         #94A3B8    ← hints/captions
Muted:                #475569    ← secondary text
```

### Background Colors
```
Home page:            #F8FAFF    ← Light sky
Result preview:       #F1F5F9    ← Gray
Itinerary page:       #F0F9FF    ← Design spec (but uses #020B18!)
Itinerary page dark:  #020B18    ← Actual (inconsistent!)
Card surfaces:        #FFFFFF    ← White cards
```

### Glass-morphism
```
Glass background:     rgba(255,255,255,0.12)
Glass border:         rgba(255,255,255,0.25)
Card light:           rgba(10,20,40,0.80)
Border subtle:        rgba(255,255,255,0.10)
```

### Semantic Colors
```
Success:              #16A34A or #10B981 (green)
Warning:              #F59E0B or #F97316 (orange)
Error:                #EF4444 (red)
Info:                 #0EA5E9 (blue)
```

---

## 9. BUTTON STYLE GUIDE

### Standard Button (ExportButton style)
```
Default State:
  Background: #F9FAFB or transparent
  Border: 1px solid #E5E7EB
  Color: #64748B
  Padding: 6px 12px
  BorderRadius: 8px
  FontSize: 13px
  FontWeight: 500
  Display: flex, gap: 6px
  Cursor: pointer
  Transition: 150ms

Hover State:
  (Define in inline handler or Tailwind)

Active/Success State:
  Background: #F0FDF4
  Border: 1px solid #BBF7D0
  Color: #16A34A
```

### Primary Button (CTA/Save)
```
Default State:
  Background: linear-gradient(135deg, #2563EB, #1D4ED8)
  Color: white
  Border: none
  Padding: 8px 16px
  BorderRadius: 8px
  FontSize: 14px
  FontWeight: 600
  BoxShadow: 0 4px 14px rgba(37,99,235,0.30)
  Cursor: pointer

Disabled State:
  Background: #F3F4F6
  Color: #9CA3AF
  Cursor: not-allowed
  Opacity: 0.5
```

---

## 10. RESPONSIVE BREAKPOINTS

```
Mobile (< 640px):
├─ Single column layout
├─ Portal size: 240px
├─ Full width cards
├─ Stacked timeline above map
└─ Form inputs: 100% width

Tablet (640px - 1024px):
├─ Portal size: 320px
├─ Grid columns: adjusting
└─ Timeline remains prominent

Desktop (1024px+):
├─ Portal size: 400px+
├─ Split layout: lg:grid-cols-5
│  ├─ Timeline: 3 columns
│  └─ Map: 2 columns (sticky)
├─ Horizontal scroll for XHS notes
└─ Full width available

Wide (1280px+):
├─ Max container: max-w-6xl
├─ Generous spacing
├─ Portal size: 480px
└─ Premium layout treatment
```

---

## 11. ANIMATION & TRANSITION GUIDE

```
Micro-interactions (150-300ms):
├─ Button hover states
├─ Card transitions
├─ Input focus rings
└─ Color transitions

Entrance Animations (400-600ms):
├─ Component fadeIn + slideUp
├─ Staggered children
├─ Easing: [0.16, 1, 0.3, 1]
└─ Using Framer Motion

Portal Animations (800ms):
├─ Open: clip-path circle expansion
├─ Close: reverse collapse
├─ One-shot (not infinite)
└─ Easing: cubic-bezier(0.16, 1, 0.3, 1)

Background Animations:
├─ Aurora flow: 10s, continuous (allowed)
├─ Grid shimmer: background only
└─ Portal pulse: loading state

❌ PROHIBITED:
├─ Infinite decorative element animations
├─ Width/height animations (use transform instead)
├─ Animations over 500ms (non-portal)
└─ Unintended layout shifts
```

---

## 12. ACCESSIBILITY FEATURES

```
Focus Indicators:
├─ All interactive elements: focus-visible:ring-2
├─ Ring color: var(--color-primary) / #0EA5E9
├─ Ring offset: 2px
└─ Visible even on color backgrounds

Touch Targets:
├─ Minimum 44×44px
├─ Buttons: padding ensures this
└─ Adequate spacing between targets

Color Contrast:
├─ Primary text on light: #0F172A on #F8FAFF ≥ 7:1
├─ Secondary text: #475569 on #F8FAFF ≥ 4.5:1
├─ Buttons: colors verified WCAG AA
└─ Icons: use SVG (lucide-react)

Motion Preferences:
├─ prefers-reduced-motion: all animations disabled
├─ Handled in globals.css
├─ Users see instant transitions
└─ Portal animation gets skipped

ARIA Labels:
├─ Buttons: aria-label or text content
├─ Forms: label elements
├─ Icon-only buttons: aria-label required
└─ Live regions: aria-live for status updates
```

