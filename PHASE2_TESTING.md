# Phase 2: Version Management — Test Plan & Documentation

## 📋 Overview

Phase 2 implements version history and rollback functionality. This enables users to:
- View all versions of their itineraries
- Rollback to previous versions
- Track what changed between versions
- Manage iteration history

---

## 🗄️ Database Schema Changes

### Migration SQL

```sql
-- Add current_version field to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;

-- Create plan_versions table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS plan_versions_plan_id_idx ON plan_versions(plan_id);
CREATE INDEX IF NOT EXISTS plan_versions_created_at_idx ON plan_versions(created_at DESC);
```

---

## 📝 API Endpoints Added

### 1. GET /api/plans/[id]/versions

**Purpose:** Retrieve all versions for a plan

**Request:**
```bash
GET /api/plans/plan-xxx/versions
```

**Response (200):**
```json
{
  "versions": [
    {
      "id": 42,
      "plan_id": "plan-xxx",
      "version_number": 3,
      "itinerary": { ... },
      "change_type": "refine",
      "change_description": "Adjusted Day 2 activities",
      "created_at": "2026-04-11T10:30:00Z"
    },
    {
      "id": 41,
      "plan_id": "plan-xxx",
      "version_number": 2,
      "itinerary": { ... },
      "change_type": "manual_edit",
      "change_description": null,
      "created_at": "2026-04-11T09:15:00Z"
    },
    {
      "id": 40,
      "plan_id": "plan-xxx",
      "version_number": 1,
      "itinerary": { ... },
      "change_type": "initial",
      "change_description": "初始版本",
      "created_at": "2026-04-11T08:00:00Z"
    }
  ]
}
```

**Error Cases:**
- 401: Missing or invalid deviceId
- 403: Unauthorized (not the owner)
- 500: Database error

---

### 2. POST /api/plans/[id]/versions

**Purpose:** Create a new version (automatically called when updating plan)

**Request:**
```bash
POST /api/plans/plan-xxx/versions
Content-Type: application/json

{
  "itinerary": { ... },
  "changeType": "refine",
  "changeDescription": "Updated Day 2 route",
  "userFeedback": "User feedback about refinement"
}
```

**Response (201):**
```json
{
  "versionNumber": 4
}
```

**Validation:**
- `itinerary` is required (non-null object)
- `changeType` must be one of: 'initial', 'refine', 'manual_edit'
- `changeDescription` and `userFeedback` are optional strings

---

### 3. POST /api/plans/[id]/revert

**Purpose:** Rollback to a specific version

**Request:**
```bash
POST /api/plans/plan-xxx/revert
Content-Type: application/json

{
  "versionNumber": 2
}
```

**Response (200):**
```json
{
  "versionNumber": 4
}
```

**Process:**
1. Fetch target version from plan_versions table
2. Create new version (v4) with itinerary from v2 (change_type = 'manual_edit', change_description = "Reverted from version 2")
3. Update plans table:
   - Set itinerary to rolled-back content
   - Update current_version to 4
   - Update status to 'done'
   - Clear planning_params
4. Return new version number (4, not the reverted one 2)

**Error Cases:**
- 400: Missing versionNumber parameter
- 403: Unauthorized (not the owner)
- 404: Version not found
- 500: Database error

---

## 🧪 Test Plan

### Test Suite 1: Version Creation on Plan Save

**Scenario:** Create a new plan and verify initial version is created

```javascript
test('Create plan → Creates v1 automatically', async () => {
  // 1. POST /api/plans with complete itinerary
  const planRes = await fetch('/api/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'test-device-1',
      itinerary: { title: '7天日本', days: [...] },
      status: 'done'
    })
  })
  const { id } = await planRes.json()

  // 2. GET /api/plans/[id]/versions
  const versionsRes = await fetch(`/api/plans/${id}/versions`)
  const { versions } = await versionsRes.json()

  // 3. Verify initial version exists
  expect(versions).toHaveLength(1)
  expect(versions[0]).toMatchObject({
    version_number: 1,
    change_type: 'initial',
    itinerary: { title: '7天日本' }
  })
})
```

---

### Test Suite 2: Version Listing

**Scenario:** Update plan multiple times and verify version history shows all updates

```javascript
test('Multiple plan updates → Creates multiple versions', async () => {
  // 1. Create plan (v1)
  const planRes = await fetch('/api/plans', { ... })
  const { id } = await planRes.json()

  // 2. Update plan with new itinerary (v2)
  await fetch(`/api/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ itinerary: { title: '新标题', days: [...] } })
  })

  // 3. Verify v2 created
  let versionsRes = await fetch(`/api/plans/${id}/versions`)
  let versions = await versionsRes.json()
  expect(versions).toHaveLength(2)

  // 4. Update again (v3)
  await fetch(`/api/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ itinerary: { title: '又改了', days: [...] } })
  })

  // 5. Verify v3 created, ordered newest first
  versionsRes = await fetch(`/api/plans/${id}/versions`)
  versions = await versionsRes.json()
  expect(versions).toHaveLength(3)
  expect(versions[0].version_number).toBe(3)
  expect(versions[1].version_number).toBe(2)
  expect(versions[2].version_number).toBe(1)
})
```

---

### Test Suite 3: Rollback to Previous Version

**Scenario:** Rollback to earlier version and verify content is restored

```javascript
test('Rollback to v2 → Creates v3 with v2 content', async () => {
  // 1. Create plan with 3 versions
  // ... (setup as above)

  // 2. Rollback to v2
  const revertRes = await fetch(`/api/plans/${id}/revert`, {
    method: 'POST',
    body: JSON.stringify({ versionNumber: 2 })
  })
  const { versionNumber } = await revertRes.json()
  expect(versionNumber).toBe(4)

  // 3. Verify plan now has 4 versions
  const versionsRes = await fetch(`/api/plans/${id}/versions`)
  const { versions } = await versionsRes.json()
  expect(versions).toHaveLength(4)

  // 4. Verify v4 is the rollback
  expect(versions[0]).toMatchObject({
    version_number: 4,
    change_type: 'manual_edit',
    change_description: 'Reverted from version 2'
  })

  // 5. Verify v4 has v2's content
  expect(versions[0].itinerary).toEqual(versions[2].itinerary)

  // 6. Verify current plan shows v4 content
  const planRes = await fetch(`/api/plans/${id}`)
  const { plan } = await planRes.json()
  expect(plan.current_version).toBe(4)
  expect(plan.itinerary).toEqual(versions[0].itinerary)
})
```

---

### Test Suite 4: Authorization

**Scenario:** Verify non-owners cannot access or modify version history

```javascript
test('Non-owner cannot access versions', async () => {
  // 1. Create plan with deviceId 'device-1'
  const planRes = await fetch('/api/plans', {
    method: 'POST',
    body: JSON.stringify({
      deviceId: 'device-1',
      itinerary: { ... }
    })
  })
  const { id } = await planRes.json()

  // 2. Try to access versions as 'device-2'
  // (Simulate by clearing device cookie and accessing)
  const versionsRes = await fetch(`/api/plans/${id}/versions`)
  expect(versionsRes.status).toBe(403)
  expect(await versionsRes.json()).toEqual({ error: 'Unauthorized' })
})

test('Non-owner cannot revert', async () => {
  // Similar setup as above
  const revertRes = await fetch(`/api/plans/${id}/revert`, {
    method: 'POST',
    body: JSON.stringify({ versionNumber: 1 })
  })
  expect(revertRes.status).toBe(403)
})
```

---

### Test Suite 5: UI Integration

**Scenario:** Verify VersionHistory component renders and functions

```javascript
test('VersionHistory component displays versions', async () => {
  // 1. Render PlanDetailClient with plan that has versions
  const { getByText, getByRole } = render(
    <PlanDetailClient id={planId} it={itinerary} {...props} />
  )

  // 2. Verify header is visible
  expect(getByText('版本历史')).toBeInTheDocument()

  // 3. Click to expand
  fireEvent.click(getByRole('button', { name: /版本历史/i }))

  // 4. Verify versions list appears
  await waitFor(() => {
    expect(getByText(/版本 [0-9]+/)).toBeInTheDocument()
  })

  // 5. Verify rollback button is clickable
  const revertButtons = getAllByText('回滚到此版本')
  expect(revertButtons).toHaveLength(2) // v2 and v1, not v3 (current)
})

test('Clicking rollback button updates plan', async () => {
  // 1. Render component and expand
  // ... (setup as above)

  // 2. Click rollback button for v2
  const revertButton = getByText('回滚到此版本')
  fireEvent.click(revertButton)

  // 3. Verify loading state
  expect(getByText('回滚中...')).toBeInTheDocument()

  // 4. Wait for completion
  await waitFor(() => {
    expect(queryByText('回滚中...')).not.toBeInTheDocument()
  })

  // 5. Verify plan content updated
  // (Would need to check itinerary or trigger re-render)
})
```

---

## ✅ Success Criteria

- [ ] Initial version created automatically when plan is saved
- [ ] Multiple updates create new versions with incrementing version_number
- [ ] Versions list endpoint returns all versions ordered by version_number DESC
- [ ] Rollback creates new version (not modifying existing)
- [ ] Rollback correctly restores content from target version
- [ ] Current plan's itinerary updated after rollback
- [ ] Plans table current_version field updated after rollback
- [ ] Non-owners cannot access version endpoints (403)
- [ ] Invalid version numbers return 404
- [ ] VersionHistory component renders for plan owners
- [ ] Rollback button triggers API correctly
- [ ] Change type and description stored correctly

---

## 📝 Database Verification Queries

### Verify initial version created:
```sql
SELECT * FROM plan_versions 
WHERE plan_id = 'plan-xxx' 
ORDER BY version_number ASC;
```

### Verify rollback created new version:
```sql
SELECT 
  version_number, 
  change_type, 
  change_description,
  created_at 
FROM plan_versions 
WHERE plan_id = 'plan-xxx' 
ORDER BY version_number DESC 
LIMIT 5;
```

### Check current_version consistency:
```sql
SELECT 
  p.id,
  p.current_version,
  MAX(pv.version_number) as max_version,
  COUNT(*) as total_versions
FROM plans p
LEFT JOIN plan_versions pv ON p.id = pv.plan_id
GROUP BY p.id
HAVING p.current_version != MAX(pv.version_number);
```

---

## 🚀 Deployment Checklist

- [ ] Run schema migration to create plan_versions table
- [ ] Run migration to add current_version field to plans
- [ ] Deploy updated src/app/api/plans/route.ts
- [ ] Deploy new src/app/api/plans/[id]/versions/route.ts
- [ ] Deploy new src/app/api/plans/[id]/revert/route.ts
- [ ] Deploy updated src/app/plans/[id]/PlanDetailClient.tsx
- [ ] Deploy new src/components/itinerary/VersionHistory.tsx
- [ ] Run all test suites against staging environment
- [ ] Verify existing plans don't break (current_version defaults to 1)
- [ ] Monitor API response times (should be <100ms)
- [ ] Verify cascade delete works (delete plan → versions deleted)

---

## 📊 Performance Considerations

- **Version listing:** O(log n) with index on plan_id, typically <50ms
- **Rollback operation:** O(log n) reads + O(log n) writes, typically <100ms
- **Storage:** Each version stores full itinerary (JSONB), typically 50-200KB per version
- **Batch operations:** Recommend limiting to 100 versions per plan

---

## 🔒 Security Notes

- All operations require deviceId verification (owner-only access)
- No changes to sharing permissions during rollback
- Version history follows plan deletion (cascade)
- No sensitive data in change_description field
