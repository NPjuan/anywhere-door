# Anywhere Door — Complete Component Analysis & Button Location Guide

**Date:** 2026-04-07
**Project:** AI Travel Itinerary Planner (Anywhere Door)
**Framework:** Next.js 14+ with React 18, TypeScript, Tailwind CSS, Framer Motion

---

## Executive Summary

The Anywhere Door project is a sophisticated AI-powered travel planning application with a three-step workflow:
1. **Search Form** (Homepage) — User inputs destination, dates, and preferences
2. **Prompt Preview** — AI generates and user previews the itinerary prompt
3. **Itinerary Display** — Full travel plan with map, timeline, and travel inspiration notes

---

## Part 1: Overall Project Structure

### Directory Layout
```
src/
├── app/
│   ├── page.tsx                    # Homepage (search form + result preview)
│   ├── itinerary/
│   │   └── ItineraryContent.tsx   # Full itinerary display page
│   └── layout.tsx
├── components/
│   ├── itinerary/
│   │   ├── DayTimeline.tsx         # Vertical timeline of daily activities
│   │   ├── RouteMap.tsx            # Amap (高德地图) integration
│   │   ├── XHSStyleNote.tsx        # Xiaohongshu-style travel notes
│   │   └── ExportButton.tsx        # Copy & Share buttons
│   ├── agents/
│   │   └── AgentStatusPanel.tsx    # Multi-agent status display
│   ├── portal/
│   │   └── AuroraBackground.tsx    # Light/dark background components
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       └── Skeleton.tsx
├── lib/
│   ├── stores/
│   │   ├── searchStore.ts          # Zustand: search params state
│   │   ├── itineraryStore.ts       # Zustand: itinerary results state
│   │   └── agentStore.ts           # Zustand: agent status & streaming
│   ├── agents/
│   │   └── types.ts                # Type definitions
│   ├── cities.ts                   # City database & search
│   └── utils/
│       └── cn.ts                   # classNames utility
└── design-system/
    └── anywhere-door/
        ├── MASTER.md               # Global design rules
        └── pages/
            ├── home.md             # Homepage specific rules
            └── itinerary.md        # Itinerary page rules
```

### Architecture Pattern
- **State Management:** Zustand (lightweight, TypeScript-friendly)
- **UI Framework:** React components with TypeScript
- **Styling:** Tailwind CSS + inline styles
- **Animations:** Framer Motion (motion divs, AnimatePresence)
- **Form Integration:** Ant Design (AutoComplete, DatePicker with Chinese locale)
- **Icons:** Lucide React (SVG icons)
- **Maps:** Amap (高德地图) JS API v2.0
- **Database:** API endpoints (`/api/plans` for saving)

---

## Part 2: The Four Key Buttons — Location & Styling

### Button 1: "保存计划" (Save Plan)
**Location:** `/src/app/page.tsx`, lines 530-555

**When it appears:** On the homepage result preview section (step === 'done')

**Styling Logic:**
```javascript
// Unsaved state (default)
background: '#EFF6FF'         // Light blue
border: '1px solid #BFDBFE'   // Blue border
color: '#2563EB'              // Blue text
icon: <Bookmark size={13} />  // Empty bookmark icon

// Saved state (after POST succeeds)
background: '#F0FDF4'         // Light green
border: '1px solid #BBF7D0'   // Green border
color: '#16A34A'              // Green text
icon: <BookmarkCheck size={13} /> // Filled checkmark icon
```

**Functionality:**
```typescript
onClick={async () => {
  if (savedId) return;  // Disable if already saved
  const deviceId = getDeviceId();
  try {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, itinerary }),
    });
    if (res.ok) {
      const { id } = await res.json();
      setSavedId(id);  // State updates to show saved UI
    }
  } catch { /* 静默失败 */ }
}}
```

**State Management:**
- `savedId` (useState hook) — Tracks if plan has been saved
- Changes color/icon when `savedId` becomes non-null
- Resets to null when user generates a new itinerary (`prevItineraryId.current` check)

---

### Button 2: "复制行程" (Copy Itinerary)
**Location:** `/src/components/itinerary/ExportButton.tsx`, lines 45-63

**When it appears:** 
- Homepage result preview (line 556 of page.tsx)
- Itinerary detail page (line 139 of ItineraryContent.tsx)

**Styling Logic:**
```javascript
// Default state
background: '#F9FAFB'         // Light gray
border: '1px solid #E5E7EB'   // Gray border
color: '#64748B'              // Gray text
icon: <Copy size={13} />

// Copied state (2 seconds after click)
background: '#F0FDF4'         // Light green
border: '1px solid #BBF7D0'   // Green border
color: '#16A34A'              // Green text
icon: <CheckCircle size={13} />
label: '已复制'               // Changes to show "Copied"
```

**Functionality:**
```typescript
const [copied, setCopied] = useState(false)

const handleCopy = async () => {
  const text = formatItineraryText(itinerary)  // Convert to text format
  try {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)   // Auto-reset after 2s
  } catch {
    /* clipboard not available */
  }
}
```

**Text Format:** (defined in lines 87-114)
```
🚀 {title}
━━━━━━━━━━━━━━━━━━
{summary}

💰 预算：¥{low}-{high}

📅 第{day}天：{title}
  {time} {name} · {duration}
  ...

🎒 打包建议：
  · {tip}
  ...

由 任意门 Anywhere Door AI 生成
https://anywhere-door.app
```

---

### Button 3: "分享" (Share)
**Location:** `/src/components/itinerary/ExportButton.tsx`, lines 64-82

**When it appears:** Same as Copy button (homepage preview + itinerary page)

**Styling:**
```javascript
background: 'transparent'
border: '1px solid #E5E7EB'
color: '#64748B'
icon: <Share2 size={13} />
label: '分享'

// Hover effect (via onMouseEnter/Leave on parent container)
transition: 'border-color 0.15s, background 0.15s'
```

**Functionality:**
```typescript
const handleShare = () => {
  if (navigator.share) {
    navigator.share({
      title: itinerary.title,
      text: itinerary.summary,
      url: window.location.href,
    })
  }
}
```

Uses **Web Share API** (native browser share dialog, available on mobile/modern browsers)

---

### Button 4: "重新规划" (Replan)
**Location:** `/src/app/page.tsx`, lines 557-563

**When it appears:** Homepage result preview section (step === 'done')

**Styling:**
```javascript
background: 'transparent' (hover: '#FFFFFF')
border: '1px solid #E2E8F0'
color: '#64748B'
padding: '4px 12px'        // py-2 px-4 in Tailwind
borderRadius: 8
fontSize: 13
fontWeight: 500
```

**Functionality:**
```typescript
onClick={goBack}  // Calls goBack() from useHomeFlow hook
```

This resets the state machine back to 'idle' step, clearing the itinerary and returning to the search form.

---

## Part 3: Background Styling Analysis

### Design Specification (from itinerary.md)
```
Background: #F0F9FF (LIGHT)
```

### Current Implementation Issues

#### Homepage (`/src/app/page.tsx`)
**Lines 167-168:**
```tsx
<main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
  <LightBackground />
```
- **Color:** #F8FAFF (off-white with slight blue tint) ✓ LIGHT
- **Component:** `TechBackground` alias (from AuroraBackground.tsx)
- **Status:** CORRECT — light, matches intent

**Result preview section (lines 479-481):**
```tsx
style={{
  background: '#F1F5F9',
  borderTop: '1px solid #E2E8F0',
}}
```
- **Color:** #F1F5F9 (cool gray) ✓ LIGHT but different shade
- **Purpose:** Subtle visual separation from main content
- **Status:** INTENTIONAL DESIGN CHOICE

#### Itinerary Page (`/src/app/itinerary/ItineraryContent.tsx`)
**Lines 73-77:**
```tsx
<main
  className="relative min-h-screen pb-16"
  style={{ background: '#020B18' }}  // ← DARK BACKGROUND
>
  <DeepBackground />  // ← Misleading name
```

- **Color:** #020B18 (deep dark blue) ❌ CONTRADICTS SPEC
- **Specification says:** #F0F9FF (light)
- **Status:** CRITICAL MISMATCH

**Why the names are misleading:**
All background component aliases (TechBackground, SkyBackground, AuroraBackground, DeepBackground) reference the exact same component, which renders a LIGHT background:
```tsx
// All these are identical:
export const TechBackground = AuroraBackground
export const SkyBackground = AuroraBackground
export const DeepBackground = AuroraBackground
```

The `DeepBackground` component name suggests "deep dark", but it actually renders the light Aurora pattern.

---

## Part 4: Design System & Color Palette

### Global Colors (from MASTER.md)
```javascript
--color-primary: '#0EA5E9'       // Cyan/Sky blue (button accents)
--color-secondary: '#38BDF8'     // Light blue
--color-cta: '#F97316'           // Orange (call-to-action)
--color-text-primary: '#0F172A'  // Dark navy
--color-text-muted: '#94A3B8'    // Medium gray
--color-bg-primary: '#F8FAFF'    // Off-white
```

### Component-Specific Colors

**Day Timeline (DayTimeline.tsx)**
```
Active day tab: linear-gradient(135deg, #0EA5E9, #38BDF8)
Day header: linear-gradient(135deg, #0EA5E9, #0284C7)
Day tabs inactive: #F1F5F9 (light gray)
Timeline connector: #E2E8F0 (subtle gray line)
Activity card border-left: 3px solid #0EA5E9
Activity time badge: rgba(56,189,248,0.12) background, #38BDF8 text
```

**Route Map (RouteMap.tsx)**
```
DAY_COLORS array: ['#0EA5E9', '#818CF8', '#10B981', '#F59E0B', '#EF4444']
Used for: POI marker borders, polyline stroke color
Fallback UI background: #F8FAFF
Fallback UI border: 1px solid #E2E8F0
```

**XHS Notes (XHSStyleNote.tsx)**
```
攻略 (Guide):  #EFF6FF bg, #2563EB text
清单 (Toplist): #F5F3FF bg, #7C3AED text
避坑 (Tips):   #FFFBEB bg, #D97706 text
点评 (Review): #ECFDF5 bg, #059669 text
日记 (Diary):  #FDF2F8 bg, #DB2777 text
```

**Warning Box (ItineraryContent.tsx)**
```
Background: rgba(249,115,22,0.08)  // Subtle orange
Border: 1px solid rgba(249,115,22,0.20)
Text color: #F97316 (orange)
```

### Button Style Patterns

**Primary Button (CTA)**
```
background: linear-gradient(135deg, #2563EB, #1D4ED8)
color: #FFFFFF
boxShadow: 0 4px 14px rgba(37,99,235,0.30)
Disabled: #F3F4F6 bg, #9CA3AF text, no shadow
```

**Secondary Button**
```
background: #FFFFFF
border: 1px solid #E5E7EB
color: #64748B
```

**Tertiary/Ghost Button**
```
background: transparent
border: 1px solid transparent (or #E5E7EB)
color: rgba(255,255,255,0.45) or #64748B
```

**Success/Saved State**
```
background: #F0FDF4 (light green)
border: 1px solid #BBF7D0 (green)
color: #16A34A (dark green)
icon: filled variant
```

---

## Part 5: Form Components

### CityField (lines 630-717)
- Uses Ant Design `AutoComplete` component
- Searchable city database with regex matching
- Displays city code + name + English name + airport code
- Styled with custom badge: blue (#2563EB) for cities, gray (#64748B) for airports
- Provides swap button to exchange origin/destination

### DateField (lines 719-764)
- Uses Ant Design `DatePicker` RangePicker (date range selection)
- Custom themed: primary blue #2563EB, borders #E5E7EB
- Locale: Chinese (zh-cn)
- Range selection with visual feedback

### PromptCard (lines 766-878)
- Display/edit card for the AI-generated itinerary prompt
- Textarea for prompt customization
- "Back" button (goBack()) and "Confirm" button (handleConfirm())
- Shows generating state with loading spinner

---

## Part 6: State Management (Zustand Stores)

### itineraryStore
```typescript
{
  itinerary: FullItinerary | null    // Parsed AI response
  activeDay: number                  // Current selected day (0-indexed)
  setItinerary: (it) => void
  setActiveDay: (day) => void
}
```

### searchStore
```typescript
{
  params: {
    origin: CityOption | null
    destination: CityOption | null
    startDate: string
    endDate: string
    prompt: string
  }
  setOrigin: (city) => void
  setDestination: (city) => void
  swapCities: () => void
  setDateRange: (start, end) => void
  setPrompt: (prompt) => void
  isValid: () => boolean
}
```

### agentStore
```typescript
{
  streamText: string                 // Accumulated AI response text
  status: AgentStatus[]              // Progress of each agent
  // ... streaming methods
}
```

---

## Part 7: Key Findings & Recommendations

### Critical Issues

1. **Background Color Mismatch (Itinerary Page)**
   - Current: `#020B18` (dark)
   - Specification: `#F0F9FF` (light)
   - Impact: Visual inconsistency across app
   - Fix: Change ItineraryContent.tsx line 75 from `#020B18` to `#F0F9FF`

2. **Misleading Component Names**
   - `DeepBackground` sounds dark but renders light
   - Suggestion: Rename to clarify intent (e.g., `LightAuroraBackground`)

3. **Homepage vs Itinerary Page Inconsistency**
   - Homepage: Light background #F8FAFF ✓
   - Itinerary page: Dark background #020B18 ✗
   - Result preview on homepage: Light gray #F1F5F9 ✓

### Design Observations

- **Glassmorphism heavy:** Both light and dark pages use `backdrop-filter: blur()` with semi-transparent layers
- **Gradient accents:** Primary color (#0EA5E9) used in gradients for active states
- **Responsive:** Mobile-first approach with breakpoints at `sm`, `lg`
- **Animations:** Framer Motion on page transitions, staggered delays for visual hierarchy
- **Typography:** Inter font throughout, clamp() for responsive sizing
- **Accessibility:** Focus rings for keyboard navigation, proper ARIA labels

---

## Part 8: File Dependencies

```
page.tsx (Homepage)
  ├── ExportButton
  ├── DayTimeline
  ├── RouteMap
  ├── XHSStyleNote
  ├── AgentStatusPanel
  ├── CityField (internal)
  ├── DateField (internal)
  └── PromptCard (internal)

ItineraryContent.tsx
  ├── ExportButton
  ├── DayTimeline
  ├── RouteMap
  ├── XHSStyleNote
  ├── AgentProgressSkeleton
  └── DeepBackground

DayTimeline.tsx
  ├── ActivityCard (internal)
  └── Badge

RouteMap.tsx
  └── (Amap JS API, external)

ExportButton.tsx
  └── formatItineraryText (internal utility)
```

---

## Summary

The Anywhere Door project is a well-architected AI travel planner with:
- Clean component hierarchy and state management
- Consistent design language (mostly)
- Three-step workflow with smooth transitions
- Integration with Amap for real-time route visualization
- Multiple export options (copy text, native share)

The main issue to address is the itinerary page background color mismatch. Everything else is intentional and well-designed.

