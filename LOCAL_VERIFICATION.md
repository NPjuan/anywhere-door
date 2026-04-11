# Local Verification Checklist — Phase 2

**Purpose:** Verify all Phase 2 features work correctly in local development before production deployment

**Time Required:** 10-15 minutes  
**Prerequisites:**
- `pnpm dev` running on http://localhost:3000
- Local Supabase with Phase 2 schema applied
- Browser Developer Tools available

---

## 📋 Pre-Test Verification

### Step 1: Verify Build Success

```bash
# Check that build passes with zero errors
pnpm build

# Expected output:
# ✓ Compiled successfully in X.Xs
# ✓ Generating static pages using workers (X/X) in XXXms
# ✓ No TypeScript errors
```

**✓ PASS** if: Build completes with 0 errors, 0 warnings

---

### Step 2: Verify Dev Server Running

```bash
# Check if dev server is running
curl -s http://localhost:3000 | head -20

# Or open http://localhost:3000 in browser
# Should see the home page load without errors
```

**✓ PASS** if: Server responds with HTML, home page loads

---

### Step 3: Verify Database Connection

```bash
# Check that Supabase is accessible
curl -s "http://localhost:3000/api/plans?deviceId=test-device" | head -50
```

**✓ PASS** if: Response is valid JSON (not a 500 error about missing columns)

---

## 🧪 Feature Tests

### Feature Test 1: Create a New Plan

1. **Navigate to home page:** http://localhost:3000
2. **Fill in plan details:**
   - From: 北京 (Beijing)
   - To: 上海 (Shanghai)
   - Days: 3
   - Budget: 5000-10000
   - Style: 文艺青年 (Artsy)
3. **Click:** "生成行程" (Generate Itinerary)
4. **Wait for:** Planning to complete (2-3 minutes)
5. **Expected result:**
   - Plan title, summary displayed
   - Timeline shows 3 days
   - No console errors (F12 → Console tab)

**✓ PASS** if: Plan generates successfully with complete itinerary

---

### Feature Test 2: Verify Version Created Automatically

1. **From previous test:** Plan should be visible in `/plans` list
2. **Navigate to:** `/plans` (or click "我的计划" in header)
3. **Click:** On the plan card to open details
4. **Expected result:**
   - Plan loads successfully
   - No 500 errors about `current_version`

**✓ PASS** if: Plan detail page loads without schema errors

---

### Feature Test 3: Check Version History Visible

1. **Still on plan detail page**
2. **Scroll down to find:** "版本历史" (Version History) section
3. **Expected:**
   - Section shows "v1 (初始版本)" - Initial Version
   - Shows timestamp when created
   - May show "回滚" button (disabled for v1)

**✓ PASS** if: Version history section displays with v1 entry

---

### Feature Test 4: Verify Phase 1 Sharing Still Works

1. **Navigate to:** `/plans` list page
2. **Find any plan card**
3. **Click:** "分享" button (Share button with Share2 icon)
4. **ShareSettingsModal opens:** Should see:
   - "启用分享" toggle
   - Text about enabling sharing
5. **Enable sharing:**
   - Check the toggle
   - Should show green checkmark
   - Share URL should appear
6. **Click:** "复制" button
   - Should show "已复制" (Copied) message
   - URL copied to clipboard
7. **Click:** "保存" button
   - Modal closes
   - Plan list refreshes

**✓ PASS** if: Share settings modal works and sharing can be enabled

---

### Feature Test 5: Verify Sharing with Expiration

1. **Open ShareSettingsModal for a plan**
2. **Enable sharing** (if not already enabled)
3. **Set expiration date:**
   - Click on "过期时间（可选）" field
   - Pick a future date/time
   - Should show confirmation: "✓ 将在 ... 过期"
4. **Click:** "保存"
5. **Expected:**
   - Settings saved
   - Modal closes

**✓ PASS** if: Expiration date can be set and saved

---

### Feature Test 6: Test Access Control

**Test 6a: Owner Can Always Access Own Plan**
1. Create a plan (Device A)
2. Open browser DevTools (F12)
3. Navigate to `/plans/[plan-id]`
4. Plan should load
5. Check console: `getDeviceId()` should return device ID

**✓ PASS** if: Owner can access their plan

**Test 6b: Visitor Access (In Same Browser, Different Device ID)**
1. Open DevTools Console
2. Run: `localStorage.setItem('device_id', 'visitor-device-' + Date.now())`
3. Refresh page
4. Same plan URL should show 403 error (if sharing is disabled)

**✓ PASS** if: Access control is enforced based on device_id

---

### Feature Test 7: Verify API Endpoints

Open browser DevTools → Network tab and test these endpoints:

**Test /api/plans/[id]/versions GET endpoint:**
```bash
# In browser console:
fetch('/api/plans/[YOUR-PLAN-ID]/versions')
  .then(r => r.json())
  .then(d => console.log(d))
```

Expected response:
```json
{
  "versions": [
    {
      "version_number": 1,
      "change_type": "initial",
      "created_at": "2026-04-11T...",
      "itinerary": {...}
    }
  ]
}
```

**✓ PASS** if: Returns version array with at least v1

---

### Feature Test 8: TypeScript Compilation

```bash
# Run TypeScript compiler
pnpm type-check

# Expected: No errors
```

**✓ PASS** if: 0 TypeScript errors

---

### Feature Test 9: ESLint Check

```bash
# Run ESLint
pnpm lint

# Expected: No errors (warnings may exist)
```

**✓ PASS** if: No critical ESLint errors

---

## 📊 Console Inspection

### Check Browser Console (F12 → Console)

When you:
- Create a plan
- Open plan details
- Enable sharing
- Open ShareSettingsModal

**Expected:**
- ✓ No red error messages
- ✓ No warnings about missing columns
- ✓ No 500 responses
- ✓ API calls complete successfully

**✓ PASS** if: Console is clean with no errors

---

## 🗄️ Database Verification

### Verify Database Schema (Local/Dev Supabase)

In Supabase Dashboard → SQL Editor:

```sql
-- Check plans table has current_version
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'plans' AND column_name = 'current_version';
-- Should return: current_version | integer | 1

-- Check plan_versions table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'plan_versions';
-- Should return: plan_versions

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename = 'plan_versions';
-- Should return: 2+ indexes
```

**✓ PASS** if: All schema elements exist

---

## 🔍 Performance Check

### Monitor Network Tab (DevTools → Network)

When loading a plan with version history:
- **GET /api/plans/[id]:** Should be < 50ms
- **GET /api/plans/[id]/versions:** Should be < 100ms
- **POST /api/plans/[id]/revert:** Should be < 100ms

**✓ PASS** if: All API calls complete in < 100ms

---

## 📱 Responsive Design Check

### Test on Different Screen Sizes

1. **Desktop (1920px):** 
   - Version history panel visible
   - All buttons clickable
   - No overflow

2. **Tablet (768px):**
   - Version history responsive
   - No layout breaking
   - Touch targets adequate

3. **Mobile (375px):**
   - Modal responsive
   - Share settings mobile-friendly
   - No horizontal scroll

**✓ PASS** if: Responsive across all breakpoints

---

## ✅ Final Verification Checklist

Before declaring ready for production deployment, verify:

- [ ] Build passes with 0 errors
- [ ] Dev server running and responding
- [ ] New plan can be created
- [ ] Version history visible in plan details
- [ ] Share button works on plans list
- [ ] Share settings modal functions correctly
- [ ] Sharing can be enabled and expiration set
- [ ] Phase 1 features (sharing) still work
- [ ] All API endpoints responding correctly
- [ ] TypeScript compilation: 0 errors
- [ ] ESLint: 0 critical errors
- [ ] Browser console: Clean, no errors
- [ ] Database schema verified
- [ ] API response times < 100ms
- [ ] Responsive design verified on 3 screen sizes

---

## 🚀 Ready for Production?

If all items above are ✓ PASS, then:

1. **Run database migration in production Supabase**
   - See: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) Step 1

2. **Deploy to Vercel**
   - See: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) Step 2

3. **Verify production deployment**
   - See: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) Step 3

---

## 🐛 Troubleshooting

### Issue: Version History Not Visible

**Possible causes:**
1. Database migration not applied
   - Check: `SELECT * FROM information_schema.tables WHERE table_name = 'plan_versions'`
   - Fix: Run migration SQL

2. Plan doesn't have itinerary
   - Check: Plan status should be 'done'
   - Fix: Create a new complete plan

### Issue: Share Settings Modal Won't Open

**Possible causes:**
1. API endpoint not working
   - Check: `curl http://localhost:3000/api/plans/[id]`
   - Fix: Check Supabase connection

2. Browser cache issue
   - Fix: Hard refresh (Ctrl+Shift+R)
   - Fix: Clear browser cache

### Issue: API Returns 500 Error

**Possible causes:**
1. Database columns missing
   - Check: Run schema verification queries
   - Fix: Apply database migration

2. Supabase not connected
   - Check: `.env.local` has correct credentials
   - Fix: Verify Supabase project URL and keys

---

## 📞 Getting Help

1. Check error messages in browser console (F12)
2. Check Supabase logs: Project → Logs
3. Review [PHASE2_TESTING.md](./PHASE2_TESTING.md) for detailed test procedures
4. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) troubleshooting section

---

**Created:** April 11, 2026  
**Purpose:** Local verification before production deployment  
**Next:** Run [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) after ✓ PASS

