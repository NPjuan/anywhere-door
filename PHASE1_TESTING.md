# Phase 1: Basic Sharing — Test Plan & Documentation

## 📋 Overview

Phase 1 implements basic itinerary sharing with time-based expiration. This document covers:
1. Database schema changes
2. API modifications
3. UI components added
4. End-to-end testing procedures
5. Manual verification checklist

---

## 🗄️ Database Schema Changes

### Migration SQL

```sql
-- Add three new columns to the plans table
alter table plans add column if not exists share_enabled   boolean     default false;
alter table plans add column if not exists share_token     text;
alter table plans add column if not exists share_expires_at timestamptz;

-- Add indexes for performance
create index if not exists plans_share_token_idx on plans (share_token) where share_token is not null;
create index if not exists plans_share_enabled_idx on plans (share_enabled) where share_enabled = true;
```

### Field Specifications

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `share_enabled` | BOOLEAN | `false` | Enable/disable sharing |
| `share_token` | TEXT | NULL | Share token (currently for future use) |
| `share_expires_at` | TIMESTAMPTZ | NULL | Expiration timestamp (optional) |

---

## 📝 TypeScript Types Added

### File: `src/lib/db/types.ts` (NEW)

```typescript
export interface Plan {
  id: string
  device_id: string
  status: 'pending' | 'done' | 'error' | 'interrupted'
  title: string
  summary?: string
  destination?: string
  start_date?: string
  end_date?: string
  days_count: number
  budget_low: number
  budget_high: number
  itinerary: FullItinerary | null
  planning_params?: Record<string, unknown> | null
  agent_progress?: Record<string, unknown> | null
  saved_at: string
  // Phase 1: Basic Sharing
  share_enabled: boolean
  share_token?: string | null
  share_expires_at?: string | null
}

export interface PlanShareSettings {
  id: string
  share_enabled: boolean
  share_token?: string | null
  share_expires_at?: string | null
}
```

---

## 🔌 API Changes

### File: `src/app/api/plans/[id]/route.ts` (MODIFIED)

#### New Function: `checkShareAccess()`

```typescript
function checkShareAccess(
  ownerDeviceId: string,
  currentDeviceId: string,
  shareEnabled: boolean | null,
  shareExpiresAt: string | null,
): boolean {
  // Owner always has access
  if (currentDeviceId === ownerDeviceId) return true
  
  // Visitor: check if sharing is enabled
  if (!shareEnabled) return false
  
  // Visitor: check expiration
  if (shareExpiresAt) {
    const expiresAt = new Date(shareExpiresAt)
    if (new Date() > expiresAt) return false
  }
  
  return true
}
```

#### Modified GET Handler

**Before:**
```typescript
export async function GET(_req: NextRequest, { params }) {
  // ... fetch plan
  return NextResponse.json({ plan: data })
}
```

**After:**
```typescript
export async function GET(_req: NextRequest, { params }) {
  // ... fetch plan
  const currentDeviceId = getDeviceId()
  const hasAccess = checkShareAccess(
    data.device_id,
    currentDeviceId,
    data.share_enabled ?? false,
    data.share_expires_at,
  )
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Access denied: Plan is not shared or sharing has expired' },
      { status: 403 },
    )
  }
  
  return NextResponse.json({ plan: data })
}
```

#### New PATCH Case: Share Settings Update

```typescript
// PATCH /api/plans/[id]?deviceId=xxx
// Body: { shareEnabled: boolean, shareExpiresAt: string | null }

if ((shareEnabled !== undefined || shareExpiresAt !== undefined) && !itinerary && !status) {
  // Verify owner only
  const deviceId = req.nextUrl.searchParams.get('deviceId')
  const { data: plan } = await supabase.from('plans').select('device_id').eq('id', id).single()
  
  if (plan.device_id !== deviceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  const patch: Record<string, unknown> = {}
  if (shareEnabled !== undefined) patch.share_enabled = shareEnabled
  if (shareExpiresAt !== undefined) patch.share_expires_at = shareExpiresAt
  
  await supabase.from('plans').update(patch).eq('id', id)
  return NextResponse.json({ ok: true })
}
```

---

## 🎨 UI Components Added

### File: `src/components/plans/ShareSettingsModal.tsx` (NEW)

**Purpose:** Modal for configuring share settings

**Props:**
```typescript
interface ShareSettingsModalProps {
  open: boolean
  onClose: () => void
  planId: string
  deviceId: string
  onSave?: () => void
}
```

**Features:**
- ✅ Toggle share enable/disable
- ✅ Display and copy share URL
- ✅ Set optional expiration date
- ✅ Show expiration status (active/expired)
- ✅ Error handling and feedback
- ✅ Animated transitions (Framer Motion)

### File: `src/app/plans/page.tsx` (MODIFIED)

**Changes:**
1. Import `ShareSettingsModal` component
2. Import `Share2` icon from lucide-react
3. Add state for modal: `shareModalOpen`, `selectedPlanId`
4. Add handler: `handleOpenShareSettings(planId)`
5. Add "分享" button to each plan card
6. Add modal instance at bottom of page
7. Call `fetchPlans(page)` on save to refresh list

**New Button UI:**
```
┌─────────────┬──────────┬────────┐
│ 分享 (Share)│ 复制/已复制 │ 删除  │
└─────────────┴──────────┴────────┘
```

---

## ✅ Manual Testing Checklist

### Test 1: Enable Sharing

**Steps:**
1. Navigate to `/plans` page
2. Find any plan card
3. Click "分享" button → ShareSettingsModal opens
4. Check "启用分享" toggle → turns blue, displays share URL
5. Click "复制" button → displays "已复制" confirmation
6. Paste URL somewhere → verify it matches `/plans/[id]`
7. Click "保存" → modal closes, plan list refreshes

**Expected Results:**
- ✅ Modal opens without errors
- ✅ Share URL is correctly formatted
- ✅ Copy functionality works
- ✅ Settings persist after page refresh

**Database Verification:**
```sql
SELECT id, share_enabled, share_expires_at FROM plans WHERE id = 'plan-xxx' LIMIT 1;
-- Should show: share_enabled = true, share_expires_at = NULL
```

---

### Test 2: Share with Expiration

**Steps:**
1. Open ShareSettingsModal for a plan
2. Enable sharing (if not already)
3. Set expiration date to **tomorrow 10:00 AM**
4. Click "保存" → modal closes
5. Verify status message: "✓ 将在 ... 过期"
6. Visit the share URL in a new device/incognito tab
7. Plan should load successfully

**Expected Results:**
- ✅ Expiration time is set correctly
- ✅ Status message shows green checkmark
- ✅ Plan is accessible before expiration
- ✅ PATCH request includes `share_expires_at` timestamp

**Database Verification:**
```sql
SELECT id, share_enabled, share_expires_at FROM plans WHERE id = 'plan-xxx' LIMIT 1;
-- Should show: share_enabled = true, share_expires_at = '2026-04-12T10:00:00Z'
```

---

### Test 3: Access Expired Plan

**Steps:**
1. Open ShareSettingsModal
2. Set expiration to **1 minute ago** (hack: use browser console if needed)
3. In another device/incognito, visit the share URL
4. Observe response

**Expected Results:**
- ✅ Page shows 403 error
- ✅ Error message: "Access denied: Plan is not shared or sharing has expired"
- ✅ Plan content not displayed

**API Verification:**
```bash
curl -X GET "https://anywhere-door.vercel.app/api/plans/plan-xxx"
# Response: { "error": "Access denied: Plan is not shared or sharing has expired" }
# Status: 403
```

---

### Test 4: Disable Sharing

**Steps:**
1. Open ShareSettingsModal for a shared plan
2. Uncheck "启用分享" toggle
3. Status message changes: "分享已关闭。其他人无法通过分享链接访问您的行程。"
4. Click "保存"
5. In another device/incognito, try to access the plan URL

**Expected Results:**
- ✅ Toggle turns gray
- ✅ Share URL disappears
- ✅ Expiration date input disappears
- ✅ Plan becomes inaccessible to visitors (403)
- ✅ Owner can still access plan normally

**Database Verification:**
```sql
SELECT id, share_enabled FROM plans WHERE id = 'plan-xxx' LIMIT 1;
-- Should show: share_enabled = false
```

---

### Test 5: Owner Always Has Access

**Steps:**
1. Create a plan on Device A (localStorage device_id = A)
2. Disable sharing (share_enabled = false)
3. Visit the plan URL `/plans/plan-xxx` on Device A
4. Plan should load successfully (owner access)

**Expected Results:**
- ✅ Plan loads for owner even with `share_enabled = false`
- ✅ No 403 error
- ✅ Full plan details displayed
- ✅ Share settings button available

**Verification:**
- Check browser console: `getDeviceId()` should match the owner device

---

### Test 6: Visitor Access

**Scenario A: Shared Plan (Enabled)**
1. Create plan on Device A
2. Enable sharing (share_enabled = true, no expiration)
3. Copy share URL
4. Open URL on Device B (different browser/incognito)
5. Verify plan loads successfully

**Expected Results:**
- ✅ Visitor can access plan
- ✅ "Save to My Plans" button appears
- ✅ Owner's name/device not exposed
- ✅ Edit controls not visible to visitor

**Scenario B: Disabled Sharing**
1. Same setup but with sharing disabled
2. Open URL on Device B
3. Should see 403 error

**Expected Results:**
- ✅ 403 Access Denied error
- ✅ Plan content not displayed

---

### Test 7: Save Visitor Plan to Own Device

**Steps:**
1. Access a shared plan as visitor (Device B)
2. See "Save to My Plans" button (specific to visitors)
3. Click button → spinner appears
4. After save → button changes to "✓ Already Saved"
5. Navigate to `/plans` page on Device B
6. New plan should appear in list

**Expected Results:**
- ✅ Visitor can save the itinerary
- ✅ New plan created on Device B with status='done'
- ✅ Plan is now owned by Device B
- ✅ Device B can edit sharing settings for this plan
- ✅ Spinner shows during save

---

### Test 8: Pagination & Search

**Steps:**
1. Have multiple plans in `/plans` page
2. Pagination and search should work normally with new "分享" button
3. Button should appear on all plan cards
4. Clicking button should work for each plan independently

**Expected Results:**
- ✅ Share button visible on all cards
- ✅ Each plan can be configured independently
- ✅ No layout issues from adding new button
- ✅ Pagination still works

---

## 🐛 Error Cases to Test

### Error 1: API Call Fails

**Scenario:** Network error during save

**Steps:**
1. Open ShareSettingsModal
2. Disable network (DevTools → Network tab → Offline)
3. Click "保存"

**Expected Results:**
- ✅ Error message displayed: "保存失败" or network error
- ✅ Retry button available
- ✅ Modal stays open

---

### Error 2: Unauthorized Access to Settings

**Scenario:** Attempt to change sharing settings without authorization

**Steps:**
1. Create plan on Device A
2. Copy plan ID
3. On Device B, make API call:
```bash
curl -X PATCH "http://localhost:3000/api/plans/plan-xxx" \
  -H "Content-Type: application/json" \
  -d '{"shareEnabled": true, "deviceId": "device-B"}'
```

**Expected Results:**
- ✅ 403 Unauthorized error returned
- ✅ Sharing settings not changed
- ✅ Database unchanged

---

### Error 3: Invalid Expiration Date

**Scenario:** Set expiration to past date

**Steps:**
1. Open ShareSettingsModal
2. Enable sharing
3. Set expiration to yesterday
4. Click "保存"
5. Warning appears: "⚠️ 分享链接已过期，不允许访问"

**Expected Results:**
- ✅ Warning shows in red
- ✅ Save still succeeds (user's choice)
- ✅ Plan immediately inaccessible to visitors

---

## 📊 Performance Considerations

### Database Indexes
- ✅ `plans_share_token_idx` - for potential token lookups (Phase 2)
- ✅ `plans_share_enabled_idx` - filters active shares (Phase 2)

### Query Optimization
- `GET /api/plans/[id]` - uses existing `select('*')`, adds access check in app code (no N+1)
- `PATCH /api/plans/[id]` - single update query with owner verification

### Caching Strategy
- Share settings can be cached client-side for 5-10 minutes (Phase 2)
- No server-side caching needed for Phase 1

---

## 🔒 Security Considerations

### Current Implementation
- ✅ Device-based isolation verified server-side
- ✅ Owner-only modification enforced
- ✅ Expiration enforced at API layer
- ✅ No SQL injection (Supabase parameterization)

### NOT Implemented (Phase 2+)
- ❌ Rate limiting on API calls
- ❌ Share token-based auth (currently unused)
- ❌ Audit logging for share events
- ❌ Share link generation tokens

---

## 📋 Deployment Checklist

- [ ] Database migration applied to production
- [ ] Environment variables set (if any)
- [ ] TypeScript build passes: `npm run build`
- [ ] No console errors in browser dev tools
- [ ] API endpoints respond correctly
- [ ] Modal displays and closes properly
- [ ] Share settings persist after page refresh
- [ ] Expiration date is correctly stored and validated

---

## 🚀 Success Criteria

All tests pass if:
1. ✅ Plans can be shared by owner
2. ✅ Sharing can be disabled at any time
3. ✅ Expiration dates are enforced
4. ✅ Expired plans return 403
5. ✅ Owners always have access
6. ✅ Visitors cannot modify share settings
7. ✅ UI is responsive and intuitive
8. ✅ No TypeScript errors on build
9. ✅ Database schema matches specification
10. ✅ All buttons/modals appear correctly

---

## 📞 Known Limitations (Phase 1)

- ⚠️ No share token display/management (generated internally)
- ⚠️ No granular permissions (all-or-nothing sharing)
- ⚠️ No share analytics or view counting
- ⚠️ No password-protected sharing
- ⚠️ No rate limiting on shared links
- ⚠️ No revocation of past shares (design: new expiration is immediate)

**See IMPLEMENTATION_SUMMARY.md for Phase 2+ roadmap**

---

## 🔗 Related Documentation

- `FEATURE_ANALYSIS.md` - Full technical analysis
- `IMPLEMENTATION_SUMMARY.md` - Multi-phase roadmap
- `supabase/schema.sql` - Database schema (includes Phase 1 migration)
- `src/lib/db/types.ts` - TypeScript type definitions
- `src/app/api/plans/[id]/route.ts` - API implementation

---

**Document Updated:** 2026-04-11  
**Phase:** 1 - Basic Sharing  
**Status:** ✅ Implementation Complete - Ready for Testing
