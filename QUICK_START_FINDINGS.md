# Anywhere Door - Quick Start Findings Summary

## 🎯 Your Questions Answered

### 1️⃣ OVERALL PROJECT STRUCTURE
✅ **Framework:** Next.js 14+ (App Router) + React + TypeScript
✅ **Styling:** Tailwind CSS + inline styles + Framer Motion
✅ **State:** Zustand stores (itineraryStore, searchStore, agentStore)
✅ **Design System:** ui-ux-pro-max (Glassmorphism + Spatial UI + Kawaii Futurism)

**Key Folders:**
- `src/app/` → Pages & routes
- `src/components/itinerary/` → **Main output components** ⭐
- `src/components/portal/` → **Background styling** ⭐
- `design-system/` → **Design specifications** ⭐

---

### 2️⃣ TRAVEL ITINERARY RESULT/OUTPUT COMPONENT
✅ **Main File:** `src/app/itinerary/ItineraryContent.tsx` (262 lines)

**What it displays:**
- Trip title, destination, dates, budget
- Daily itinerary timeline with activities grouped by time period
- Interactive Amap map showing POIs and route
- Xiaohongshu-style travel inspiration cards
- Travel warnings/notes
- Export buttons (copy, share)

**Component Tree:**
```
ItineraryContent
├── Header (title, destination, back button)
├── ExportButton (copy & share)
├── Main Grid (5 columns)
│   ├── DayTimeline (3 cols) - Daily activities
│   └── RouteMap (2 cols) - Amap integration
├── XHSStyleNote section - Travel tips
└── Warnings section - Important notices
```

---

### 3️⃣ BUTTON LOCATIONS
✅ **"保存计划" (Save Plan)**
- Location: `page.tsx` lines 530-555
- Style: Blue button with Bookmark icon
- Action: POST to `/api/plans`

✅ **"复制行程" (Copy Itinerary)**
- Location: `ExportButton.tsx` lines 45-62
- Style: Gray button, turns green when copied
- Action: Format itinerary text and use clipboard API

✅ **"分享" (Share)**
- Location: `ExportButton.tsx` lines 64-82
- Style: Transparent button with Share2 icon
- Action: Uses `navigator.share()` API

✅ **"重新规划" (Replan)**
- Location: `page.tsx` line 557-563
- Style: Gray outline button
- Action: Calls `goBack()` to reset form

---

### 4️⃣ BACKGROUND STYLING (CRITICAL FINDING ⚠️)

#### Current Implementation:
```
HOME PAGE (page.tsx):
  Background: #F8FAFF (light sky blue)
  Component: <LightBackground /> 
  Renders: Subtle gradients + grid overlay

RESULT SECTION (bottom of home):
  Background: #F1F5F9 (slightly darker gray)
  Renders: Itinerary preview

ITINERARY PAGE (ItineraryContent.tsx):
  Inline style: #020B18 (DARK THEME)
  Component: <DeepBackground /> (light gradients - covered!)
  Issue: Inconsistent! ⚠️
```

#### Design Specification Says:
```
From design-system/pages/itinerary.md:
  Background: #F0F9FF (light, not dark!)
```

#### Background Component:
**File:** `src/components/portal/AuroraBackground.tsx`

**What it renders (light mode):**
- Base: `#F8FAFF` (very light blue)
- Top-left gradient: Light blue with blur
- Bottom-right gradient: Warm yellow with blur  
- Grid overlay: Subtle indigo lines (73px spacing)

**Export aliases:**
- `TechBackground` (original)
- `SkyBackground`
- `AuroraBackground`
- `DeepBackground` (same code, different name!)
- `DoraemonBackground`

#### CSS of Aurora Background:
```css
background: #F8FAFF;

/* Top-left radial gradient */
radial-gradient(ellipse at 35% 40%, 
  rgba(219,234,254,0.70) 0%,    /* bright blue */
  rgba(191,219,254,0.25) 45%,   /* faded blue */
  transparent 75%)
filter: blur(2px);

/* Bottom-right radial gradient */
radial-gradient(ellipse at 65% 60%,
  rgba(254,243,199,0.55) 0%,    /* warm yellow */
  rgba(253,230,138,0.15) 50%,   /* faded yellow */
  transparent 75%)
filter: blur(2px);

/* Subtle grid overlay */
linear-gradient(rgba(99,102,241,0.035) 1px, transparent 1px),
linear-gradient(90deg, rgba(99,102,241,0.035) 1px, transparent 1px)
backgroundSize: 72px 72px;
```

---

### 5️⃣ MAIN PAGE & FORM COMPONENT

#### Main Page: `src/app/page.tsx` (627 lines)
**Sections:**
1. Hero - Tagline + branding
2. Search form - 5 fields
3. Prompt preview - AI generates plan
4. Agent status - Shows progress
5. Result preview - Itinerary preview (when done)

#### Search Form Fields:
```tsx
<CityField />          // Departure city
<ArrowLeftRight />     // Swap button
<CityField />          // Destination
<DateField />          // Date range picker
<Textarea />           // Travel style prompt
<SubmitButton />       // "生成行程计划"
```

#### Form Component Styling:
- **Container:** White, rounded-2xl, shadow
- **Background:** `#FFFFFF`
- **Border:** `1px solid #E5E7EB`
- **Shadow:** `0 2px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.10)`

#### CityField Component:
- Uses Ant Design AutoComplete
- Searches from city database
- Shows airport code + city type
- Custom styling with blue accent

#### DateField Component:
- Uses Ant Design DatePicker.RangePicker
- Format: "M月D日" (April 7th)
- Separator: "→"
- Disables past dates

#### Prompt Input:
- Textarea with 3-row default
- Preset buttons (Photography, Foodie, Adventure, Culture, Relaxation)
- Green submit button with gradient: `#2563EB → #1D4ED8`
- Disabled state: gray background `#F3F4F6`

---

## 📐 DESIGN SYSTEM REFERENCE

### Colors
```
Primary:      #0EA5E9 (Sky blue)
Primary Dark: #0284C7 (Hover)
Secondary:    #38BDF8 (Light blue)
CTA:          #F97316 (Orange)
Text Dark:    #0F172A (Headings)
Text Gray:    #64748B (Body)
Text Muted:   #94A3B8 (Hints)
Background:   #F8FAFF (Home) / #F0F9FF (Itinerary spec)
```

### Typography
- **Font:** Inter (unified)
- **H1:** clamp(2rem, 5vw, 3.5rem)
- **Body:** 1rem (16px)
- **Small:** 0.875rem (14px)

### Spacing
- **Base:** 4px (Tailwind default)
- **Common:** p-4 (16px), p-6 (24px), p-8 (32px)

### Border Radius
- **sm:** 6px (small buttons)
- **md:** 12px (cards)
- **lg:** 20px (panels)
- **xl:** 28px (modals)

### Shadows
- **sm:** Subtle layering
- **md:** Card default
- **lg:** Elevated hover
- **card:** Activity cards

### Animations
- **Micro:** 150-300ms (button hover)
- **Standard:** 400-600ms (entrance)
- **Portal:** 800ms (one-shot)
- **❌ NO** infinite animations on elements
- **✅ YES** Aurora background 10s flow (allowed)

---

## 🗂️ COMPONENT FILES QUICK LOOKUP

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| ItineraryContent | `src/app/itinerary/ItineraryContent.tsx` | 262 | Main itinerary output |
| ExportButton | `src/components/itinerary/ExportButton.tsx` | 115 | Copy & Share buttons |
| DayTimeline | `src/components/itinerary/DayTimeline.tsx` | 231 | Daily activities |
| ActivityCard | ` src/components/itinerary/DayTimeline.tsx` | 138-230 | Single activity |
| RouteMap | `src/components/itinerary/RouteMap.tsx` | 197 | Amap map |
| XHSStyleNote | `src/components/itinerary/XHSStyleNote.tsx` | 83 | Travel tips card |
| AuroraBackground | `src/components/portal/AuroraBackground.tsx` | 59 | Background styling |
| HomePage | `src/app/page.tsx` | 627 | Main landing page |
| CityField | `src/app/page.tsx` | 629-717 | City autocomplete |
| DateField | `src/app/page.tsx` | 719-764 | Date picker |
| PromptCard | `src/app/page.tsx` | 766-878 | Prompt preview |

---

## 🎨 COLOR PALETTE QUICK COPY

```
// Primary Actions
const PRIMARY = '#0EA5E9'
const PRIMARY_HOVER = '#0284C7'
const SECONDARY = '#38BDF8'

// CTA
const CTA = '#F97316'
const CTA_HOVER = '#EA6C0A'

// Text
const TEXT_DARK = '#0F172A'
const TEXT_GRAY = '#64748B'
const TEXT_MUTED = '#94A3B8'
const TEXT_LIGHT = '#475569'

// Backgrounds
const BG_HOME = '#F8FAFF'
const BG_RESULT = '#F1F5F9'
const BG_ITINERARY = '#F0F9FF'  // Spec
const BG_ITINERARY_ACTUAL = '#020B18'  // Current (inconsistent!)
const BG_CARD = '#FFFFFF'

// Success/Error
const SUCCESS = '#16A34A'
const ERROR = '#EF4444'
const WARNING = '#F59E0B'

// Glass-morphism
const GLASS_BG = 'rgba(255,255,255,0.12)'
const GLASS_BORDER = 'rgba(255,255,255,0.25)'
```

---

## 📱 RESPONSIVE BEHAVIOR

```
Mobile (< 640px):
  ├─ Single column layout
  ├─ Timeline above map (stacked)
  └─ Form inputs full width

Tablet (640px - 1024px):
  ├─ Grid columns adjusting
  └─ Timeline still prominent

Desktop (1024px+):
  ├─ Split layout: lg:grid-cols-5
  ├─ Timeline: 3 columns
  ├─ Map: 2 columns (sticky)
  └─ XHS notes: horizontal scroll

Wide (1280px+):
  ├─ Max width: 1152px (max-w-6xl)
  └─ Premium spacing
```

---

## 🔍 KEY FINDINGS & ISSUES

### ✅ Well-Designed:
- Clean component structure
- Consistent color usage (mostly)
- Glassmorphism aesthetic applied correctly
- Type-safe with TypeScript
- Accessibility features (focus rings, ARIA labels)

### ⚠️ Issues to Note:
1. **Background Mismatch:** Itinerary page uses `#020B18` (dark) but should use `#F0F9FF` (light per spec)
2. **DeepBackground Confusion:** Component exports same code with multiple names
3. **No dark theme for itinerary:** Design system specifies light, but implementation is dark
4. **Animation rules violation risk:** Ensure no infinite animations on decorative elements

### 📋 To-Do for Consistency:
1. Fix ItineraryContent background color to match spec
2. Create separate dark/light background components
3. Audit all animations for infinite loops
4. Document color overrides in component comments

---

## 🚀 USEFUL COMMANDS

```bash
# Search for component usage
grep -r "ExportButton" src/

# Find all background references
grep -r "background.*#0" src/

# List all components
find src/components -name "*.tsx" -type f

# Check TypeScript types
grep -r "interface.*Itinerary" src/

# Find color definitions
grep -r "#0EA5E9" src/
```

---

## 📚 DESIGN SYSTEM FILES

**MASTER.md** - Global rules
- Color system
- Typography
- Spacing
- Border radius
- Shadows
- Animation rules
- Accessibility

**home.md** - Homepage specific
- Dark background required (#0A0E27)
- Portal as visual center
- Glass-morphism search form
- 5-field form layout

**itinerary.md** - Itinerary page specific
- **Light background** (#F0F9FF) ← Current code doesn't match!
- Split layout (timeline + map)
- Agent status panel
- Activity cards with timeline
- Amap required
- XHS style notes

---

## 💾 STATE MANAGEMENT

```typescript
// itineraryStore
const { itinerary, activeDay, setItinerary, setActiveDay } = useItineraryStore()

// searchStore
const { params, setOrigin, setDestination, setDateRange, setPrompt } = useSearchStore()

// agentStore
const { streamText } = useAgentStore()
```

---

## 🔗 FILE RELATIONSHIPS

```
page.tsx (home)
  └─ Uses: SearchStore, ItineraryStore, AgentStore
     ├─ Renders: CityField, DateField, PromptCard
     ├─ Renders: ExportButton, DayTimeline, RouteMap
     └─ Renders: XHSStyleNote

ItineraryContent.tsx (dedicated page)
  ├─ Uses: ItineraryStore
  ├─ Renders: ExportButton
  ├─ Renders: DayTimeline (which contains ActivityCard)
  ├─ Renders: RouteMap
  ├─ Renders: XHSStyleNote
  └─ Uses: DeepBackground

ExportButton.tsx
  ├─ Copy action: navigator.clipboard
  └─ Share action: navigator.share

DayTimeline.tsx
  └─ Contains: ActivityCard component

RouteMap.tsx
  └─ Uses: Amap JS API (dynamic load)
```

---

## ✨ DESIGN PHILOSOPHY

"Kawaii Futurism" inspired by Doraemon's Anywhere Door
- Round forms
- Freedom & openness
- Sky & cloud aesthetics
- Glassmorphism interface
- Friendly, approachable tone
- Scientific/tech undertones

**Color Palette Source:** Travel/Tourism theme
- Sky blue for exploration
- Orange for excitement/go
- Purple for magic

