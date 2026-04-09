# Anywhere Door Project - Complete Structure & Components Analysis

## Overview
**Project:** 任意门 (Anywhere Door) - AI Travel Itinerary Planner
**Stack:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Framer Motion
**Design System:** ui-ux-pro-max (Glassmorphism + Spatial UI)
**Theme:** Kawaii Futurism (inspired by Doraemon's Anywhere Door)

---

## 1. PROJECT STRUCTURE

```
/Users/ekkopan/Desktop/workspace/anywhere-door/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # 🏠 HOME PAGE (Main Landing)
│   │   ├── itinerary/
│   │   │   ├── page.tsx              # Itinerary page wrapper
│   │   │   └── ItineraryContent.tsx  # ⭐ MAIN ITINERARY OUTPUT COMPONENT
│   │   ├── plan/
│   │   │   ├── page.tsx
│   │   │   └── PlanContent.tsx
│   │   ├── plans/
│   │   │   ├── page.tsx              # Saved plans gallery
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── search/page.tsx
│   │   ├── layout.tsx
│   │   └── api/                      # Backend routes
│   │       ├── plans/route.ts        # Save/fetch itineraries
│   │       ├── flights/route.ts
│   │       └── agents/               # Multi-agent orchestration
│   │
│   ├── components/
│   │   ├── itinerary/                # 🎯 ITINERARY RESULT COMPONENTS
│   │   │   ├── DayTimeline.tsx       # Vertical timeline of daily activities
│   │   │   ├── ExportButton.tsx      # ⭐ "保存计划", "复制行程", "分享", buttons
│   │   │   ├── RouteMap.tsx          # Amap integration
│   │   │   ├── XHSStyleNote.tsx      # Xiaohongshu-style travel notes
│   │   │   └── FlightSummary.tsx
│   │   │
│   │   ├── portal/                   # Background & transitions
│   │   │   ├── AuroraBackground.tsx  # ⭐ BACKGROUND STYLING (Light & Dark modes)
│   │   │   ├── PortalDoor.tsx
│   │   │   └── PortalTransition.tsx
│   │   │
│   │   ├── layout/                   # Layout components
│   │   ├── ui/                       # Reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   │
│   │   ├── agents/
│   │   │   └── AgentStatusPanel.tsx  # Shows AI generation progress
│   │   │
│   │   └── search/
│   │
│   ├── lib/
│   │   ├── stores/
│   │   │   ├── itineraryStore.ts     # Zustand store for itinerary data
│   │   │   ├── searchStore.ts
│   │   │   └── agentStore.ts
│   │   ├── agents/types.ts           # TypeScript types
│   │   ├── utils/
│   │   └── cities.ts
│   │
│   └── hooks/
│       └── useHomeFlow.ts
│
├── design-system/
│   └── anywhere-door/
│       ├── MASTER.md                 # ⭐ GLOBAL DESIGN RULES
│       └── pages/
│           ├── home.md               # ⭐ HOME PAGE design specs
│           └── itinerary.md          # ⭐ ITINERARY PAGE design specs
│
├── public/                           # Static assets
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 2. DESIGN LANGUAGE & COLOR SYSTEM

### Primary Colors (Global)
```typescript
--color-primary:        #0EA5E9    // Travel sky blue (main interactive)
--color-primary-hover:  #0284C7    // Darker sky blue (hover)
--color-secondary:      #38BDF8    // Light sky blue
--color-cta:           #F97316    // Go orange (CTAs)
--color-cta-hover:     #EA6C0A    // Darker orange (hover)
```

### Background Colors (Page-Specific)
```typescript
// HOME PAGE (Deep dark theme)
#020B18  or  #0A0E27    // Deep space background
#F8FAFF                  // Light base (not used on homepage)

// ITINERARY PAGE (Light theme)
#F8FAFF                  // Light sky background (main)
#F1F5F9                  // Slightly darker variant
#F0F9FF                  // Slightly lighter variant

// RESULT SECTION (within homepage)
#F1F5F9                  // Gray background for result preview
```

### Typography
- **Font Family:** Inter (unified across all UI)
- **H1:** clamp(2rem, 5vw, 3.5rem) - Orbitron-inspired heavy
- **Body:** 1rem (16px) - Inter Regular

### Border Radius System
```typescript
--radius-sm:   6px      // Small buttons, badges
--radius-md:   12px     // Inputs, cards
--radius-lg:   20px     // Large cards, panels
--radius-xl:   28px     // Modals, drawers
--radius-portal: 50%    // Portal circles
```

---

## 3. ⭐ ITINERARY RESULT COMPONENT (KEY FINDINGS)

### Main File: `ItineraryContent.tsx`
**Location:** `/src/app/itinerary/ItineraryContent.tsx`
**Purpose:** The main travel itinerary output display component

#### Key Features:
1. **Dark background theme** - Uses `#020B18` (deep dark)
2. **Glass-morphism cards** - Semi-transparent with backdrop blur
3. **Three main sections:**
   - **Header Section** - Destination, trip dates, budget, back button
   - **Main Content** - Split layout: Timeline (left) + Map (right)
   - **Travel Notes** - Xiaohongshu-style inspiration cards
   - **Warnings Section** - Important travel notices

#### Component Structure:
```tsx
ItineraryContent (main wrapper)
├── DeepBackground (dark aurora background)
├── Header Section (Title area with buttons)
│   └── ExportButton (保存计划/复制行程/分享 buttons)
├── Main Grid (lg:grid-cols-5)
│   ├── DayTimeline (lg:col-span-3)
│   │   ├── Day tabs navigation
│   │   ├── Day header (gradient background)
│   │   └── ActivityCard list (with timeline connector)
│   │
│   └── RouteMap (lg:col-span-2, sticky)
│       └── Amap integration
├── XHSStyleNote section (horizontal scroll)
└── Warnings section (orange accent)
```

---

## 4. 🎯 KEY COMPONENTS BREAKDOWN

### A. ExportButton Component
**File:** `/src/components/itinerary/ExportButton.tsx`
**Finds:** Contains the "保存计划", "复制行程", "分享" buttons!

**Buttons in this component:**
1. **复制行程** (Copy Itinerary)
   - Icon: Copy (changes to CheckCircle when copied)
   - Label: "复制行程" → "已复制" (on success)
   - Style: White background, gray border, blue text when active
   - Action: Copies formatted itinerary to clipboard

2. **分享** (Share)
   - Icon: Share2
   - Label: "分享"
   - Style: Transparent background, gray border
   - Action: Uses native `navigator.share()` API

**Color Scheme:**
- Default: `#F9FAFB` (very light gray background)
- Copied state: `#F0FDF4` (light green)
- Border: `#E5E7EB`
- Text: `#64748B` (gray) / `#16A34A` (green when copied)

### B. DayTimeline Component
**File:** `/src/components/itinerary/DayTimeline.tsx`
**Purpose:** Vertical timeline showing daily activities

**Sub-components:**
- **Day tabs** - Day 1, Day 2, etc. (gradient blue background when active)
- **Day header** - Day date and title (linear gradient: `#0EA5E9` → `#0284C7`)
- **Activity cards** - Individual activities with:
  - Time badge (sky blue background)
  - Activity name (dark text)
  - Description (gray text)
  - Duration, cost, address tags
  - Transport badge
  - Left border accent (sky blue)

**Card Styling:**
```tsx
background: '#FFFFFF'
border: '1px solid #E2E8F0'
borderLeft: '3px solid #0EA5E9'  // Left accent
boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
```

### C. RouteMap Component
**File:** `/src/components/itinerary/RouteMap.tsx`
**Purpose:** Amap (高德地图) integration

**Features:**
- Dynamically loads Amap JS API
- Displays POI markers with numbered labels
- Draws polyline connecting activities
- Color-coded by day (5 different colors)
- Fallback UI if map unavailable
- Sticky positioning on desktop

**Marker Styling:**
```tsx
background: white
border: '2px solid #0EA5E9'
borderRadius: 8
padding: '2px 8px'
fontSize: 12
color: '#0C4A6E'
```

### D. XHSStyleNote Component
**File:** `/src/components/itinerary/XHSStyleNote.tsx`
**Purpose:** Xiaohongshu-style travel inspiration cards

**Note Types:**
- 攻略 (Guide) - Blue
- 清单 (Checklist) - Purple
- 避坑 (Tips) - Orange
- 点评 (Review) - Green
- 日记 (Diary) - Pink

**Card Layout:**
```
[Type Badge] [Title] [View Link →]
```

**Styling:**
```tsx
background: '#FFFFFF'
border: '1px solid #E5E7EB'
borderRadius: 8
padding: '12px 14px'
width: 288px (w-72)
```

---

## 5. ⭐ BACKGROUND STYLING ANALYSIS

### FILE: `AuroraBackground.tsx`
**Location:** `/src/components/portal/AuroraBackground.tsx`

**Current Implementation (Light Mode):**
```tsx
// Base background
background: '#F8FAFF'  // Very light blue

// Left top gradient
radial-gradient(ellipse at 35% 40%, 
  rgba(219,234,254,0.70) 0%,      // Light blue
  rgba(191,219,254,0.25) 45%,     // Lighter blue
  transparent 75%)

// Right bottom gradient
radial-gradient(ellipse at 65% 60%,
  rgba(254,243,199,0.55) 0%,      // Light yellow
  rgba(253,230,138,0.15) 50%,     // Lighter yellow
  transparent 75%)

// Grid overlay
backgroundImage: linear-gradient(rgba(99,102,241,0.035) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(99,102,241,0.035) 1px, transparent 1px)
backgroundSize: '72px 72px'
```

**Export Names (Aliases):**
- `TechBackground` (original)
- `SkyBackground`
- `AuroraBackground`
- `DeepBackground`
- `DoraemonBackground`

### CRITICAL FINDING: Mismatch in ItineraryContent!
```tsx
// In ItineraryContent.tsx line 7:
import { DeepBackground } from '@/components/portal/AuroraBackground';

// But it uses dark background style:
style={{ background: '#020B18' }}  // Deep dark!

// This is different from the AuroraBackground component itself!
```

The DeepBackground import gets the light blue background, but ItineraryContent overrides it with inline dark styling.

---

## 6. PAGE-SPECIFIC BACKGROUNDS

### HOME PAGE (`/src/app/page.tsx`)
```tsx
<main className="relative min-h-screen" style={{ background: '#F8FAFF' }}>
  <LightBackground />  // Uses TechBackground/AuroraBackground
  // Hero, search form, results preview
</main>
```

### ITINERARY OUTPUT (bottom section of home when done)
```tsx
<motion.div
  style={{
    background: '#F1F5F9',  // ⭐ Gray background (lighter than home)
    borderTop: '1px solid #E2E8F0',
  }}
  className="pb-20"
>
  {/* Itinerary preview content */}
</motion.div>
```

### ITINERARY PAGE (`/src/app/itinerary/ItineraryContent.tsx`)
```tsx
<main
  className="relative min-h-screen pb-16"
  style={{ background: '#020B18' }}  // ⭐ DARK BACKGROUND!
>
  <DeepBackground />  // But this is light blue!
```

**Issue:** Itinerary page uses DARK background (`#020B18`), not light!

---

## 7. BUTTON LOCATIONS & STYLES

### In HomePage (Step 4: Itinerary Preview - `page.tsx` lines 528-563):
```tsx
<button>  // 保存计划 (Save Plan)
  background: savedId ? '#F0FDF4' : '#EFF6FF'
  border: savedId ? '1px solid #BBF7D0' : '1px solid #BFDBFE'
  color: savedId ? '#16A34A' : '#2563EB'
  Bookmark or BookmarkCheck icon
</button>

<ExportButton itinerary={itinerary} />  // 复制行程 + 分享

<button>  // 重新规划 (Replan)
  border: '1px solid #E2E8F0'
  color: '#64748B'
  onClick: goBack()
</button>
```

### In Itinerary Page (ItineraryContent.tsx - top area):
```tsx
<ExportButton itinerary={itinerary} />  // Only this component
// No save/replan buttons in dedicated page
```

---

## 8. DESIGN SYSTEM FILES

### MASTER.md
**Key Sections:**
- Color system (primary, secondary, backgrounds)
- Typography (Inter font, sizing scale)
- Spacing system (Tailwind 4px base)
- Border radius (sm, md, lg, xl)
- Shadow system
- Animation rules (prohibited infinite animations on elements)
- Portal component specs
- Breakpoints

**Critical Rules:**
- ❌ NO infinite animations on decorative elements
- ✅ Only background animations allowed (Aurora flow)
- ✅ Micro-interactions: 150-300ms

### home.md
**Key Rules for Homepage:**
- Background: `#0A0E27` (deep dark, forced)
- Search form: Glass-morphism with backdrop blur
- Portal as visual center
- 5-field form
- CTA: Orange button `#F97316`

### itinerary.md
**Key Rules for Itinerary Page:**
- Background: `#F0F9FF` (light blue)
- Split layout: Timeline (40%) + Map (60%)
- Agent status panel with progress bars
- Activity cards with left border accent
- Amap integration required
- XHS style notes below timeline

---

## 9. RESULT SECTION BACKGROUND MATCHING

### Current State:
- **Home page background:** `#F8FAFF` (light sky blue)
- **Result section on home:** `#F1F5F9` (slightly darker gray)
- **Itinerary page background:** `#020B18` (dark!)

### Design System Spec:
From `itinerary.md` line 67:
```
- **背景 Background:** `--color-bg-base`（`#F0F9FF`）
```

So the itinerary page SHOULD use `#F0F9FF`, not `#020B18`!

---

## 10. KEY FILES SUMMARY

| File | Purpose | Key Finding |
|------|---------|------------|
| `ItineraryContent.tsx` | Main itinerary output | Uses DARK background `#020B18` (inconsistent!) |
| `ExportButton.tsx` | Export buttons | Contains 复制行程 + 分享 buttons ✓ |
| `DayTimeline.tsx` | Daily activities | White cards with sky blue left border |
| `RouteMap.tsx` | Map display | Amap integration |
| `XHSStyleNote.tsx` | Travel tips | Xiaohongshu style |
| `AuroraBackground.tsx` | Background | Light theme, but used for dark pages |
| `page.tsx` (home) | Homepage | Has 保存计划, 复制行程, 分享, 重新规划 buttons |
| `MASTER.md` | Global design | Color system + animation rules |
| `home.md` | Home design | Dark background (#0A0E27) required |
| `itinerary.md` | Itinerary design | Light background (#F0F9FF) specified |

---

## 11. BACKGROUND COLOR INCONSISTENCY ISSUE

### Problem:
The itinerary output page (`ItineraryContent.tsx`) uses:
- Inline style: `#020B18` (dark)
- But imported: `DeepBackground` (which renders light blue)
- Design spec says: `#F0F9FF` (light)

### The Mismatch:
```tsx
// Line 75 - ItineraryContent.tsx
<main style={{ background: '#020B18' }}>
  <DeepBackground />  {/* Renders #F8FAFF + gradients! */}
</main>
```

This creates a dark background that covers the light gradient layers.

---

## 12. NEXT.JS ROUTING MAP

```
/                          → HomePage (ItineraryContent preview at bottom)
/itinerary                 → Dedicated ItineraryContent page (DARK)
/plan                      → Alternative plan view
/plans                     → Saved plans gallery
/plans/[id]               → Individual saved plan detail
/search                    → Search results
/api/plans                 → Save/fetch itineraries
/api/agents/*             → Multi-agent orchestration
```

---

## 13. ZUSTAND STORES (State Management)

```typescript
// itineraryStore.ts
useItineraryStore() → {
  itinerary: FullItinerary
  activeDay: number
  setItinerary()
  setActiveDay()
}

// searchStore.ts
useSearchStore() → {
  params: SearchParams
  setOrigin()
  setDestination()
  swapCities()
  setDateRange()
  setPrompt()
}

// agentStore.ts
useAgentStore() → {
  streamText: string
}
```

---

## 14. TYPE DEFINITIONS

**Key types from `lib/agents/types.ts`:**
```typescript
interface FullItinerary {
  id?: string
  title: string
  summary: string
  destination: string
  budget: { low: number; high: number }
  days: DayPlan[]
  warnings?: string[]
  xhsNotes?: XHSNote[]  // Travel inspiration notes
}

interface DayPlan {
  day: number
  date: string
  title: string
  morning: Activity[]
  afternoon: Activity[]
  evening: Activity[]
}

interface Activity {
  time: string
  name: string
  description: string
  duration?: string
  cost?: string
  transport?: string
  poi?: POI
}

interface POI {
  id: string
  name: string
  address: string
  latLng: { lat: number; lng: number }
}

interface XHSNote {
  noteType: 'guide' | 'toplist' | 'tips' | 'review' | 'diary'
  title: string
}
```

---

## QUICK REFERENCE: WHAT YOU ASKED FOR ✓

### 1. Overall Project Structure ✓
- Next.js App Router with organized component structure
- Multi-agent backend for AI generation
- Zustand stores for state management

### 2. Travel Itinerary Result/Output Component ✓
- **Main:** `ItineraryContent.tsx`
- Shows: Title, destination, dates, budget, daily timeline, map, travel tips

### 3. Button Locations ✓
- **保存计划** (Save) - `page.tsx` line 530-555
- **复制行程** (Copy) - `ExportButton.tsx` line 45-62
- **分享** (Share) - `ExportButton.tsx` line 64-82
- **重新规划** (Replan) - `page.tsx` line 557-563

### 4. Background Styling ✓
- **Home:** `#F8FAFF` (light)
- **Result preview on home:** `#F1F5F9` (gray)
- **Itinerary page:** `#020B18` (DARK - inconsistent!)
- **Design spec says:** `#F0F9FF` (light)

### 5. Main Page & Form Component ✓
- **Main:** `page.tsx` (home page)
- **Form:** CityField, DateField, PromptCard subcomponents
- **Theme:** Glassmorphism, sky blue primary, orange CTAs

