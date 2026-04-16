# Anywhere Door - UX Improvement Opportunities Analysis
## AI Travel Planning App (Next.js + React + Ant Design + Tailwind)

**Analysis Date:** April 14, 2026  
**Repository:** `/Users/ekkopan/Desktop/workspace/anywhere-door`

---

## Executive Summary

The Anywhere Door app has a **solid UX foundation** with smooth animations, clear visual hierarchy, and thoughtful state management. However, several opportunities exist to enhance clarity, reduce friction, and improve accessibility across the planning flow, itinerary display, and exploration features.

### Key Findings:
- ✅ **Strengths**: Smooth animations, comprehensive error handling, good accessibility baseline, clear loading states
- ⚠️ **Gaps**: Form input validation feedback, empty state guidance, mobile responsiveness edge cases, loading state consistency
- 🔴 **Issues**: Missing loading skeletons in some areas, unclear action sequencing, accessibility gaps in explore/discovery

---

## 1. HOME PAGE & PLANNING FORM (`src/app/page.tsx` + `src/components/home/HomeForm.tsx`)

### Current State
**File Locations:**
- Main page: `src/app/page.tsx` (lines 1-935)
- Form component: `src/components/home/HomeForm.tsx` (lines 1-825)

**What Works:**
- ✅ Beautiful hero section with tech background (line 365)
- ✅ Smooth page transitions with Framer Motion (lines 368-426)
- ✅ Travel style preset buttons with visual feedback (lines 265-300, HomeForm)
- ✅ Device ID badge & navigation links top-right (lines 305-360)
- ✅ Error messages clearly displayed (lines 509-521, HomeForm)
- ✅ Budget breakdown table with daily cost visualization (lines 526-593)

### UX Gaps & Improvements Needed

#### 1.1 Form Validation & Input Feedback
**Issue:** Limited real-time validation feedback during form interaction
- **Line 342-360 (HomeForm):** Textarea for prompt has no character count or suggestions
- **No inline validation** for date ranges (missing max trip duration reminder after max 6 days)
- **No visual feedback** when fields are incomplete - submit button just grays out

**Recommendations:**
- Add character counter for prompt textarea (e.g., "0/500 characters")
- Show inline validation hints (e.g., "Maximum 7 days" near date picker)
- Implement field-level error messages that appear as user types
- Add "optional" labels for hotel POI, must visit/avoid sections (currently says "(选填)" but could be more visual)

**Code Reference:**
```typescript
// HomeForm.tsx line 343
<textarea
  value={params.prompt}
  onChange={(e) => handlePromptChange(e.target.value)}
  placeholder="细节描述越多，任意门开的越准，向任意门许愿吧！"
  rows={2}
  // MISSING: character count display
  // MISSING: input validation feedback
/>
```

---

#### 1.2 Mobile Form Layout Issues
**Issue:** Form elements stack inconsistently on small screens
- **Lines 211-262 (HomeForm):** City swap button may obscure content on mobile
- **Lines 267-340:** Travel style tags horizontal scroll doesn't show "more" indicator
- **Grid layout (line 399):** "必去/不去" side-by-side on desktop but breaks on tablet

**Recommendations:**
- Add "swipe to see more" indicator for horizontal scrolling sections
- Ensure form stays accessible at breakpoints (320px, 375px, 414px)
- Add explicit "Loading..." state during form submission (currently disabled but no skeleton)

---

#### 1.3 Empty/Initial State Guidance
**Issue:** First-time users may not know what to fill in
- No helper tooltips on form fields
- No example preset prompts shown initially
- "任意门许愿吧" is cute but vague for new users

**Recommendations:**
- Add micro-help on hover/focus for each field
- Show 2-3 example prompts below the textarea
- Link to demo itinerary or case study
- **Line 345 placeholder could be more helpful:** Instead of just magical metaphor, add actual example: "e.g., 摄影打卡、美食探索..."

---

#### 1.4 Restore Session Clarity
**Issue:** "上次行程记录提示" (lines 380-401) is subtle and may be missed
- Only shows for 2 seconds or requires scrolling
- Status messages could be more explicit about what went wrong
- No retry guidance if previous plan failed

**Recommendations:**
- Make restore notification more prominent (slide in from top or use toast)
- Clearer differentiation: "Previous plan failed" vs "Previous plan interrupted"
- Add retry count or error details in tooltip
- Option to clear/dismiss permanently

---

### 1.5 Form Submission Feedback
**Issue:** No clear indication that submission is processing
- **Lines 164-196 (page.tsx):** Submit button click triggers preview generation but UX flow is fast
- No skeleton loading shown during preview generation (only spinner in navigation)
- User may click twice if feedback is not clear

**Recommendations:**
- Show brief loading skeleton while generating preview
- Add "Generating preview..." toast notification
- Disable form with visual indicator during submission
- Add keyboard shortcut hint (e.g., "Press Ctrl+Enter to submit")

---

## 2. FORM INPUTS & CONTROLS

### 2.1 City Selection (`HomeForm.tsx` CityField, lines 555-713)
**Current State:**
- ✅ Autocomplete with airport selection works well
- ✅ Visual differentiation for single vs. multiple airports
- ⚠️ **Issue:** No search results "no results found" state shown clearly
- ⚠️ **Issue:** Airport selection hidden inside field - not discoverable

**Recommendations:**
- Add empty state UI: "No cities found. Try another search"
- Highlight airport selector more prominently 
- Show airport emoji/icon earlier in the flow
- Add "Most popular" airports section

---

### 2.2 Date Range Picker (`HomeForm.tsx` DateField, lines 717-822)
**Current State:**
- ✅ 6-day max is enforced
- ✅ Past dates disabled
- ⚠️ **Issue:** Time picker UI is cramped (lines 783-807)
- ⚠️ **Issue:** No visual separation between date and time selection

**Recommendations:**
- Expand arrival/departure time pickers for better touch targets
- Add "Quick set: 09:00" / "20:00" shortcuts
- Show timezone indicator (local vs. destination)
- Display trip duration summary (e.g., "5 days, 4 nights")

---

### 2.3 Place Selection (`src/components/form/PlaceSelect.tsx`)
**Issue:** No loading skeleton during search
**Recommendations:**
- Add skeleton loaders while searching for places
- Show "Loading..." message in dropdown
- Display search result count

---

## 3. ITINERARY DISPLAY (`src/components/itinerary/DayTimeline.tsx`)

### Current State
**File:** `src/components/itinerary/DayTimeline.tsx` (276+ lines)

**What Works:**
- ✅ Timeline visualization with clear sections (morning/afternoon/evening)
- ✅ Activity cards show all critical info (time, description, cost, transport)
- ✅ Day tabs with weather integration (lines 118-145)
- ✅ Breathing animation for replan mode (lines 12-21, 303)
- ✅ Map pin button to link to map view (lines 333-347)
- ✅ Smooth day transitions with animation (lines 197-203)
- ✅ Daily cost summary (lines 252-271)

### UX Gaps

#### 3.1 Activity Card Density & Readability
**Issue:** Cards may feel cramped with multiple pieces of info
- **Lines 298-387:** Activity card shows 6+ data points (time, name, description, duration, cost, address, transport)
- No visual hierarchy or collapsible sections for less critical info
- Small text sizes (12px for description) may be hard to read on mobile

**Recommendations:**
- Add "expandable details" toggle to collapse optional fields
- Use consistent spacing/margins between sections
- Increase font sizes for mobile (use `clamp()`)
- Add visual indicators for "new" or "flagged" activities

---

#### 3.2 Empty Activity Sections
**Issue:** If a time slot (e.g., evening) has no activities, user sees nothing
- Sections with 0 activities are filtered out (line 79)
- No suggestion to add activities or explanation why section is empty

**Recommendations:**
- Show placeholder: "No evening activities planned. Add one?" 
- Link to "Refine" action to suggest additions
- Show related recommendations based on day theme

---

#### 3.3 Weather Integration UX
**Issue:** Weather display is great but could be more actionable
- **Lines 137-142:** Weather only shows on day tabs
- No context on how to adjust activities based on weather
- Severe weather alert is shown (lines 184-193) but no suggested adjustments

**Recommendations:**
- Add "Adjust plan for weather" quick action
- Show weather forecast for entire trip (mini calendar view)
- Link weather alerts to refine suggestions: "Rainy day? Suggest indoor activities?"
- Add packing hints based on weather

---

#### 3.4 Replan Day UX
**Issue:** Single-day replan is hidden in a button (lines 149-180)
- Button text is "重新规划第 X 天" which is clear, but interaction is buried
- Loading state uses spinner (line 169) but could show progress
- No feedback after successful replan except toast

**Recommendations:**
- Highlight replan button during onboarding first time
- Show "Before/After" comparison when replanning
- Add quick suggestions instead of just feedback input (lines 673-699)
- Scroll to the updated day after replan completes

---

#### 3.5 Accessibility Issues
**Issue:** Activity cards use custom keyboard interaction but may not be fully accessible
- **Lines 313-321:** Tab and enter/space to interact, but no aria-label
- Description is long-form text, no semantic structure
- Cost/duration/address not tagged as specific data types

**Recommendations:**
- Add `aria-label` to each activity card describing full details
- Use semantic HTML (`<time>`, `<address>`, etc.) or ARIA roles
- Ensure focus indicators are visible
- Add keyboard navigation for expanding/collapsing sections

---

## 4. PLAN DETAIL PAGE (`src/app/plans/[id]/PlanDetailClient.tsx`)

### Current State
**File:** `src/app/plans/[id]/PlanDetailClient.tsx` (150+ lines)

**What Works:**
- ✅ Public/private toggle for plan owners (lines 112-129)
- ✅ Favorite button for visitors (lines 132-150+)
- ✅ Replan day functionality for owners (lines 131-150)
- ✅ Weather integration fetched on mount (lines 85-101)

### UX Gaps

#### 4.1 Owner vs. Visitor State Clarity
**Issue:** It's not immediately clear if user owns the plan or is just viewing
- No badge/indicator showing "This is your plan" or "You're viewing a shared plan"
- Buttons appear but context is missing

**Recommendations:**
- Add top banner: "📌 This is your plan" (owner) or "👤 Shared by [user]" (visitor)
- Differentiate button colors/styles for owner vs visitor actions
- Show owner's device ID briefly on visitor view (with permission)

---

#### 4.2 Favorite Button Feedback
**Issue:** Favorite button (lines 56-58) has no clear loading state
- **`favLoading` state tracked** but unclear if visual feedback is shown
- Heart icon should have animation on like

**Recommendations:**
- Add heart-fill animation when favoriting
- Show "Added to favorites" toast
- Update count immediately with optimistic UI

---

#### 4.3 Access Control Clarity
**Issue:** Private plans should not be viewable by non-owners
- **Lines 66:** Check only happens at component level
- No error state for unauthorized access

**Recommendations:**
- Show clear error page if user tries to access private plan
- Suggest: "This plan is private. Ask the creator to share it."
- Link to explore page to discover shared plans

---

## 5. EXPLORE/DISCOVERY PAGE (`src/app/explore/page.tsx`)

### Current State
**File:** `src/app/explore/page.tsx` (150+ lines shown)

**What Works:**
- ✅ Infinite scroll with sentinel element (lines 121-131)
- ✅ Search with debounce (lines 133-140)
- ✅ Sort by latest/popular (lines 148-150)
- ✅ Style tag filtering (line 52)
- ✅ Loading and error states

### UX Gaps

#### 5.1 Empty State on First Load
**Issue:** Initial load state not clearly shown
- Loading spinner shown but no context about what's loading
- No "Featured plans" section on first visit

**Recommendations:**
- Show skeleton cards matching grid layout during initial load
- Display "Discovering shared plans..." message
- Show 2-3 recommended/featured plans initially
- Add onboarding: "Explore what others have created"

---

#### 5.2 Search UX
**Issue:** Search doesn't show "no results" state clearly
- **Line 50:** `searchInput` tracked but unclear if empty state is shown
- No suggestions for popular searches
- No search history

**Recommendations:**
- Add "No plans found for '[query]'" message
- Show "Popular searches" when input is focused
- Display search history (last 5 searches)
- Add search suggestions as user types

---

#### 5.3 Filter Clarity
**Issue:** Style tag filters (line 52) may be unclear to users
- Tags like "亲子" might not be discoverable
- No visual indication of applied filters

**Recommendations:**
- Show selected filters prominently
- Add "Clear all filters" button
- Show filter results count: "Showing 12 of 150 plans"
- Add filter presets (e.g., "Weekend", "Budget", "Adventure")

---

#### 5.4 Plan Card Density
**Issue:** Cards pack too much info in small space
- Multiple days shown in preview
- Highlights section might overflow

**Recommendations:**
- Show only top 2 highlights initially, "See more" expandable
- Limit days preview to 3 days with "..." indicator
- Add swipe/carousel for days preview
- Show mini map in card (already in DayPreview structure)

---

#### 5.5 Infinite Scroll UX
**Issue:** User may not realize there are more items to scroll
- Sentinel element works but no "Load more" prompt shown
- Loading indicator (line 45) may not be visible while scrolling

**Recommendations:**
- Show "Loading more plans..." message at bottom
- Add "Load more" button as fallback
- Smooth scroll-to-top button when many items loaded
- Save scroll position when returning to page

---

#### 5.6 Mobile Responsiveness
**Issue:** Grid may not adapt well to small screens
- Card size fixed, may be too large on mobile

**Recommendations:**
- Responsive columns: 1 on mobile, 2 on tablet, 3 on desktop
- Swipe gestures for favorites (heart swipe)
- Bottom sheet for filters on mobile

---

## 6. MAP COMPONENT (`src/components/itinerary/RouteMap.tsx`)

### Current State
**File:** `src/components/itinerary/RouteMap.tsx` (150+ lines)

**What Works:**
- ✅ Dual map support (AMap for China, Leaflet for international)
- ✅ Driving route visualization
- ✅ Info windows with activity details (lines 93-111)
- ✅ Marker click handling

### UX Gaps

#### 6.1 Map Loading States
**Issue:** Map loading process not clearly communicated
- **Lines 130-132:** `isLoaded` and `hasError` states tracked
- No loading skeleton or placeholder shown while map initializes

**Recommendations:**
- Show skeleton map container while loading
- Display "Loading map..." text in center
- Show error UI if map fails to load (network issue)
- Retry button for failed maps

---

#### 6.2 Map Interactivity
**Issue:** Unclear how to interact with map
- No zoom hints for first-time users
- Marker interaction not explained

**Recommendations:**
- Show zoom controls hint on mount: "Scroll to zoom"
- Add "Reset view" button to fit all markers
- Tooltip on hover: "Click to see details"
- Accessibility: Keyboard navigation for markers

---

#### 6.3 Route Visualization
**Issue:** Route lines may overlap or be hard to see
- **Line 19:** DAY_COLOR is hardcoded `#2563EB`
- No distinction between different route segments

**Recommendations:**
- Add color gradient or animation to route
- Show "Click for directions" on route
- Display estimated travel time between points
- Add turn-by-turn preview

---

## 7. LOADING STATES & SKELETONS

### Current Implementation
**Files:**
- Skeleton component: `src/components/ui/Skeleton.tsx` (81 lines)
- Agent status: `src/components/agents/AgentStatusPanel.tsx` (150+ lines)

**What Works:**
- ✅ Generic skeleton component with shimmer effect (line 21)
- ✅ Flight card skeleton (lines 31-56)
- ✅ Agent progress skeleton (lines 59-80)
- ✅ Agent status panel with rotating hints (lines 61-69, 78)
- ✅ Smooth transitions in agent status (lines 109-147)

### Missing Skeletons

#### 7.1 Activity Card Skeleton
**Issue:** DayTimeline may not show skeleton while loading
- No placeholder shown when activities are being fetched

**Recommendation:**
- Add ActivityCardSkeleton similar to FlightCardSkeleton
- Show 3-5 skeleton cards while loading

#### 7.2 Itinerary Header Skeleton
**Issue:** Header card has no loading state
- **Line 453-594 (page.tsx):** Header shows immediately, may cause layout shift

**Recommendation:**
- Add ItineraryHeaderSkeleton showing placeholder title/summary

#### 7.3 Map Skeleton
**Issue:** RouteMap has no loading indicator
- User sees blank container while AMap/Leaflet initializes

**Recommendation:**
- Add map skeleton showing grid pattern

---

## 8. ERROR HANDLING & EDGE CASES

### Current Implementation
**Files:**
- Error boundary: `src/components/ui/ErrorBoundary.tsx` (95 lines)
- Quota warning: `src/components/ui/QuotaWarningBanner.tsx`
- Home page error state: `src/app/page.tsx` (lines 829-904)

**What Works:**
- ✅ Global error boundary with friendly message (lines 40-94)
- ✅ Failed plan state shows clear UX (lines 829-904, page.tsx)
- ✅ Retry and reset buttons offered
- ✅ Error toast notifications

### Missing Error States

#### 8.1 Network Error on Form Submission
**Issue:** If network fails during preview generation
- Error message shown but no indication to retry
- Form state may be unclear

**Recommendation:**
- Show: "Failed to generate preview. Check your connection and try again."
- Add retry button
- Show estimated retry time

#### 8.2 Incomplete Itinerary
**Issue:** If AI generates partial itinerary (missing some days)
- No warning or incomplete state indicator

**Recommendation:**
- Show warning banner: "Incomplete plan detected. 2 of 5 days missing."
- Offer to regenerate or edit missing days

#### 8.3 Map Load Failure (China vs. International)
**Issue:** If AMap fails but Leaflet available (or vice versa)
- Fallback may not be obvious

**Recommendation:**
- Show fallback message: "Using simplified map view"
- Option to switch map providers manually

---

## 9. ANIMATIONS & TRANSITIONS

### Current Implementation
**Good:**
- ✅ Smooth page transitions (Framer Motion)
- ✅ Breathing animation for replan cards
- ✅ Day timeline animations
- ✅ Agent status text rotation animations
- ✅ Modal/popup animations

### Issues

#### 9.1 Reduced Motion Not Respected
**Issue:** No `prefers-reduced-motion` media query check
- Users with vestibular disorders may find animations uncomfortable

**Recommendation:**
- Add to global CSS: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }`
- Check in Framer Motion: `const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches`

#### 9.2 Animation Delays
**Issue:** Staggered animations may slow down perception of speed
- **Line 310 (page.tsx):** 0.3s delay for badge animations
- **Line 371:** 0.15s delay for form

**Recommendation:**
- Reduce delays to 0.1-0.15s
- Add "Skip animation" option in settings

---

## 10. ACCESSIBILITY GAPS

### Current Implementation
**Good:**
- ✅ Skip link implemented (`src/components/ui/SkipLink.tsx`)
- ✅ Semantic HTML structure mostly good
- ✅ ARIA labels on many interactive elements
- ✅ Error boundary with `role="alert"`
- ✅ Keyboard navigation for buttons

### Gaps

#### 10.1 Form Labels & ARIA
**Issue:** Some form fields may not have associated labels
- **Lines 342-360 (HomeForm):** Textarea label is text, not `<label>` with `for`
- Date picker may not announce selected dates to screen readers

**Recommendation:**
- Use proper `<label>` elements with `htmlFor`
- Add `aria-label` to all form controls
- Announce form errors with `aria-live="assertive"`

#### 10.2 Activity Card Accessibility
**Issue:** Custom interactive elements need better ARIA
- **Lines 313-321 (DayTimeline):** `role="button"` on div without name
- Activity details not announced as list

**Recommendation:**
- Add `aria-label` describing full activity (time, name, location)
- Use semantic HTML if possible (button instead of div)
- Announce to-do list structure: `role="list"` + `role="listitem"`

#### 10.3 Color Contrast
**Issue:** Some text may not meet WCAG AA contrast ratios
- **Line 87 (DayTimeline):** `color: '#2563EB'` on light background - check contrast
- **Line 138:** Gray text on light background

**Recommendation:**
- Test all color combinations with WCAG contrast checker
- Ensure minimum 4.5:1 ratio for text, 3:1 for UI components
- Provide non-color-based indicators (icons, patterns)

#### 10.4 Focus Management
**Issue:** Focus may not be managed properly on state changes
- No focus trap for modals
- Focus not moved to error messages when validation fails

**Recommendation:**
- Auto-focus error messages when form submission fails
- Use focus-visible for keyboard-only users: `button:focus-visible { outline: 2px solid #2563EB; }`
- Manage focus on modal open/close

---

## 11. STATE MANAGEMENT & DATA FLOW

### Current Implementation
**Files:**
- Home flow hook: `src/hooks/useHomeFlow.ts` (200+ lines)
- Search store: `src/lib/stores/searchStore.ts`
- Itinerary store: `src/lib/stores/itineraryStore.ts`

**What Works:**
- ✅ Clear state machine for planning flow (form → generating → prompt-preview → planning → done)
- ✅ Pending restoration for interrupted plans
- ✅ Error recovery with retry

### Issues

#### 11.1 Form State Persistence
**Issue:** If user navigates away from form, data is lost (unless in stores)
- No save-as-draft feature shown
- No warning before navigation

**Recommendation:**
- Auto-save form state to localStorage (client-side only)
- Show "Unsaved changes" warning on navigation
- Add draft recovery on page return: "Resume your draft?"

#### 11.2 Refine Feedback Clarity
**Issue:** Refine prompt construction is complex (page.tsx lines 248-265)
- User sees only simple text input but AI receives enriched JSON

**Recommendation:**
- Show what AI will receive: "Your feedback + current plan structure"
- Preview refined prompt before sending (like initial planning)
- Add suggested refinements based on current plan

---

## 12. MOBILE RESPONSIVENESS

### Current Implementation
- ✅ Responsive grid layout (1 col mobile, 3+ desktop)
- ✅ Touch-friendly button sizes (mostly)
- ✅ Horizontal scroll with overflow handling

### Issues

#### 12.1 Viewport Sizing
**Issue:** Some elements may not fit on small devices
- Form may have horizontal scrolling on 320px devices
- Activity cards may be cramped

**Recommendation:**
- Test on actual devices: iPhone SE (375px), iPhone 12 (390px), Android phones (360-414px)
- Use `clamp()` for responsive font sizes
- Ensure form inputs are at least 44x44px touch targets

#### 12.2 Sticky Elements
**Issue:** Map sticky positioning (line 769, page.tsx: `lg:sticky lg:top-6`)
- May break on small screens with dynamic toolbar

**Recommendation:**
- Test sticky behavior with bottom nav/mobile keyboard
- Adjust top offset based on viewport

---

## 13. PERFORMANCE & OPTIMIZATION

### Loading Performance

#### 13.1 Image Optimization
**Issue:** No lazy loading shown for explore page images/maps
**Recommendation:**
- Use `next/image` for responsive image loading
- Lazy load below-the-fold content
- Add `srcSet` for different screen sizes

#### 13.2 Code Splitting
**Issue:** All pages bundled together
**Recommendation:**
- Lazy load RouteMap (heavy Leaflet/AMap dependencies)
- Lazy load explore page infinite scroll
- Show loading skeleton during chunk load

---

## SUMMARY TABLE: QUICK WINS

| Priority | Area | Issue | Fix | Time |
|----------|------|-------|-----|------|
| 🔴 High | Form | No validation feedback | Add char counter, inline errors | 2h |
| 🔴 High | Explore | Empty state unclear | Add skeleton cards + message | 1h |
| 🟡 Medium | Timeline | Activity info cramped | Collapsible details, responsive sizing | 2h |
| 🟡 Medium | Accessibility | ARIA labels incomplete | Add aria-label to all interactive elements | 2h |
| 🟡 Medium | Mobile | Touch targets too small | Increase padding, min 44x44px | 1h |
| 🟢 Low | Animations | No prefers-reduced-motion | Add media query check | 30m |
| 🟢 Low | Map | No loading state | Add skeleton map loader | 1h |
| 🟢 Low | Replan | Interaction hidden | Highlight button, show before/after | 1.5h |

---

## RECOMMENDATIONS ROADMAP

### Phase 1 (High Priority - 1 week)
1. Add form validation feedback (character counter, inline errors)
2. Implement empty states for explore page
3. Add loading skeletons for activity cards and map
4. Improve ARIA labels across all interactive elements
5. Ensure 44x44px minimum touch targets on mobile

### Phase 2 (Medium Priority - 2 weeks)
6. Add prefers-reduced-motion support
7. Implement form draft auto-save
8. Improve replan day UX with before/after comparison
9. Add color contrast testing and fixes
10. Mobile responsiveness polish

### Phase 3 (Polish - 1 week)
11. Optimize images and add lazy loading
12. Code-split heavy dependencies (maps)
13. Add search history and suggestions
14. Implement filter presets on explore
15. Performance monitoring and optimization

---

## CONCLUSION

Anywhere Door has an excellent foundation with smooth UX flows, good error handling, and thoughtful features like weather integration and single-day replanning. The main opportunities lie in:

1. **Clarity**: Better feedback during interactions and state changes
2. **Accessibility**: Complete ARIA coverage and keyboard navigation
3. **Mobile**: Responsive design polish and touch target sizing
4. **Performance**: Loading state consistency and optimization
5. **Guidance**: Better onboarding and empty state messaging

These improvements would elevate the app from "good" to "great" while maintaining the clean, modern aesthetic and delightful Doraemon-themed animations.

