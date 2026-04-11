# Phase 2 Deployment Guide

**Date:** April 11, 2026  
**Status:** Ready for Production Deployment  
**Estimated Time:** 15-20 minutes

---

## ⚠️ CRITICAL: Database Migration Required

The Phase 2 code has been implemented and committed, but **the database schema must be updated** before deploying to production. Without this migration, the application will crash with schema errors.

---

## 📋 Pre-Deployment Checklist

- [x] Code is implemented and tested locally
- [x] Build passes: `npm run build` (0 errors, 0 warnings)  
- [x] All commits are on main branch (ac3783c and 19b6c66)
- [ ] Database migration applied to Supabase
- [ ] Code deployed to Vercel
- [ ] Post-deployment verification completed

---

## 🗄️ Step 1: Database Migration (CRITICAL)

### Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **Anywhere Door** (cugqwqjmdxgihtdyqbhh)
3. Navigate to: **SQL Editor** (left sidebar)
4. Click: **New query** button

### Run Phase 2 Migration SQL

Copy and paste the entire SQL block below into the SQL editor, then click **Run**:

```sql
-- ============================================================
-- Phase 2: Version Management — Database Migration
-- ============================================================

-- 1. Add current_version field to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;

-- 2. Create plan_versions table for version history
CREATE TABLE IF NOT EXISTS plan_versions (
  id              BIGSERIAL PRIMARY KEY,
  plan_id         TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  version_number  INT NOT NULL,
  itinerary       JSONB NOT NULL,
  change_type     TEXT NOT NULL,  -- 'initial' | 'refine' | 'manual_edit'
  change_description TEXT,
  user_feedback   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, version_number)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS plan_versions_plan_id_idx 
  ON plan_versions(plan_id);
  
CREATE INDEX IF NOT EXISTS plan_versions_created_at_idx 
  ON plan_versions(created_at DESC);

-- ============================================================
-- Verification Queries (run after migration)
-- ============================================================

-- Check that current_version column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'plans' AND column_name = 'current_version';

-- Check that plan_versions table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'plan_versions';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'plan_versions';
```

### Verify Migration Success

After running the SQL, you should see:
- ✅ Current Version column exists on plans table (default: 1)
- ✅ plan_versions table created with all columns
- ✅ Two indexes created: plan_versions_plan_id_idx and plan_versions_created_at_idx

If you see any errors, check:
1. Are you in the correct Supabase project?
2. Do you have sufficient permissions?
3. Is the database connection active?

---

## 🚀 Step 2: Deploy Code to Production

### Option A: Automatic Deployment (Recommended)

The code is already committed to `main` branch:

```bash
# From your local machine
git log --oneline -5
# Should show: ac3783c feat: Phase 2 - Version Management and plan history

# Push to main (if not already pushed)
git push origin main
```

**Vercel will automatically deploy** when you push to main. Monitor deployment:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select **Anywhere Door** project
3. Watch the build progress in real-time
4. Should complete in 1-2 minutes

### Option B: Manual Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select **Anywhere Door** project
3. Click **Deployments** tab
4. Find the latest deployment from main branch
5. If not yet deployed, click **Deploy** button (if available)

---

## ✅ Step 3: Post-Deployment Verification

### Test 1: Verify API Endpoints Available

```bash
# Replace DOMAIN with your Vercel domain (e.g., anywhere-door.vercel.app)
DOMAIN="https://anywhere-door.vercel.app"

# Test version history endpoint (should return empty array or 403 if no auth)
curl -X GET "$DOMAIN/api/plans/test-id/versions"

# You should NOT see a 500 error about missing 'current_version' column
```

### Test 2: Create a New Plan and Verify Version Created

1. Go to your app: https://anywhere-door.vercel.app (or your domain)
2. Click **+ 新建计划** to create a new plan
3. Fill in details and generate itinerary
4. Once generated, plan should appear in **/plans** list
5. Open the plan details page
6. Scroll down to find **版本历史** (Version History) section
7. Should show **v1 (初始版本)** in the history

### Test 3: Test Rollback Functionality

1. From the **版本历史** section, click the **回滚** (Rollback) button if available
2. Should show loading state, then confirm success
3. Verify the itinerary content is intact

### Test 4: Test Existing Plans Still Work

1. Verify that all existing plans in your **/plans** list still load
2. Opening an old plan should not cause errors
3. The version history should show **v1 (初始版本)** for existing plans

### Test 5: Monitor Response Times

Check Vercel analytics:
1. Vercel Dashboard → Anywhere Door → Analytics
2. Verify API response times are **< 100ms**
3. Check for any 5xx errors

---

## 🔍 Troubleshooting

### Error: "Could not find the 'current_version' column of 'plans' in the schema cache"

**Cause:** Database migration not applied  
**Solution:** Run the SQL migration in Supabase SQL Editor (Step 1)

### Error: "relation plan_versions does not exist"

**Cause:** plan_versions table not created  
**Solution:** Re-run the entire migration SQL block

### Error: "401 Unauthorized" on API calls

**Cause:** Supabase API keys issue  
**Solution:** 
1. Verify .env.local has correct SUPABASE_URL and PUBLISHABLE_KEY
2. Check Supabase project settings for correct credentials
3. Clear browser cache and retry

### Version History Not Showing

**Cause:** Database migration incomplete or plan not yet refetched  
**Solution:**
1. Confirm database migration ran successfully
2. Create a new plan (automatic version creation)
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console for errors

---

## 📊 Deployment Verification Checklist

After completing steps 1-3, verify all items:

- [ ] Database migration completed successfully
- [ ] Supabase shows plan_versions table exists
- [ ] Code deployed to Vercel (no build errors)
- [ ] API endpoints responding (no 500 errors)
- [ ] New plan creation works
- [ ] Version history visible on plan detail page
- [ ] Rollback functionality works
- [ ] Existing plans still load correctly
- [ ] Response times < 100ms
- [ ] No JavaScript errors in browser console

---

## 🔄 Rollback Plan

If issues occur after deployment:

### Option 1: Quick Rollback (Revert to Phase 1)
```bash
git log --oneline | grep "Phase 1"
# Find commit 19b6c66
git reset --hard 19b6c66
git push origin main -f  # Force push to revert
```

Then delete the Phase 2 tables in Supabase:
```sql
DROP TABLE IF EXISTS plan_versions;
ALTER TABLE plans DROP COLUMN IF EXISTS current_version;
```

### Option 2: Fix and Redeploy (Recommended)
1. Identify the issue in logs
2. Create a fix commit
3. Push and redeploy

---

## 📞 Support

### Database Issues
- Check Supabase dashboard logs: Project → Database → Logs
- Verify table structure matches schema.sql

### API/Application Issues
- Check Vercel logs: Dashboard → Anywhere Door → Deployments → Latest
- Check browser console (F12) for client errors
- Review PHASE2_TESTING.md for expected behavior

### Version History Not Working
- Confirm plan has a `current_version` value (should be 1)
- Check that plan_versions table has entries
- Verify user device_id matches plan.device_id

---

## 📈 Expected Outcome

After successful deployment:
- ✅ Users can view version history for all plans
- ✅ Users can rollback to any previous version instantly
- ✅ Each change creates a new version automatically
- ✅ Version metadata includes timestamp and change type
- ✅ Visitor access (Phase 1 sharing) still works normally
- ✅ No breaking changes to existing functionality

---

## 🎯 Next Steps After Deployment

1. **Monitor for 24 hours:**
   - Check error logs daily
   - Verify no user complaints
   - Monitor database query times

2. **Gather User Feedback:**
   - Ask users about version history usefulness
   - Collect feature requests
   - Identify pain points

3. **Prepare Phase 3 (Optional):**
   - Advanced Sharing: Share version history with collaborators
   - Version Comments: Add annotations to versions
   - Email Notifications: Notify on shared plan updates

---

**Deployment Guide Created:** April 11, 2026  
**Phase:** 2 - Version Management  
**Status:** Ready for Production Deployment

