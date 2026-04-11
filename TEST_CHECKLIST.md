# Anywhere Door — 测试实施清单

**生成日期**: 2026-04-11  
**项目**: Anywhere Door (Next.js 旅行规划应用)  
**目标**: 完整的单元测试 + E2E 测试覆盖

---

## ✅ 前置检查

- [x] 项目使用 TypeScript（便于测试编写）
- [x] 使用 Zustand 状态管理（易于单元测试）
- [x] 使用 React Hook Form（便于表单测试）
- [x] 使用 Supabase（需要 mock）
- [x] 使用 Next.js 16.2（官方支持测试）
- [x] 无现存测试框架（干净的空白画布）

**结论**: ✅ 项目条件理想，适合快速建立测试体系

---

## 🚀 实施路线图

### Phase 1️⃣: 基础设施搭建 (Week 1)

#### 1.1 依赖安装
```bash
# 执行以下命令
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event @vitest/coverage-c8

pnpm add -D @playwright/test
```

**验证**:
```bash
# 检查是否安装成功
pnpm ls vitest
pnpm ls @playwright/test
```

#### 1.2 配置文件创建

**创建 `vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '.next/',
        '*.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**创建 `playwright.config.ts`**:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'pnpm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

#### 1.3 Setup 文件

**创建 `src/__tests__/setup.ts`**:
```typescript
import { expect, afterEach, vi } from 'vitest'
import '@testing-library/jest-dom'

// 全局 localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// 清理
afterEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})
```

#### 1.4 package.json 更新

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "pnpm run test:coverage && pnpm run test:e2e"
  }
}
```

**检查清单**:
- [ ] `vitest.config.ts` 创建完成
- [ ] `playwright.config.ts` 创建完成
- [ ] `src/__tests__/setup.ts` 创建完成
- [ ] `package.json` scripts 已更新
- [ ] 运行 `pnpm test` 无错误

---

### Phase 2️⃣: 单元测试编写 (Week 2-3)

#### 2.1 P0 模块: deviceId

**文件**: `src/__tests__/lib/deviceId.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getDeviceId } from '@/lib/deviceId'

describe('lib/deviceId', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('getDeviceId()', () => {
    it('should generate a new device ID on first call', () => {
      const id = getDeviceId()
      expect(id).toMatch(/^\d+-[a-z0-9]{8}$/)
      expect(id.length).toBeGreaterThan(10)
    })

    it('should return the same ID on subsequent calls', () => {
      const id1 = getDeviceId()
      const id2 = getDeviceId()
      expect(id1).toBe(id2)
    })

    it('should persist ID to localStorage', () => {
      getDeviceId()
      const stored = localStorage.getItem('anywhere-door-device-id')
      expect(stored).toBeTruthy()
      expect(stored).toMatch(/^\d+-[a-z0-9]{8}$/)
    })

    it('should return empty string when window is undefined (SSR)', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window
      try {
        const id = getDeviceId()
        expect(id).toBe('')
      } finally {
        global.window = originalWindow
      }
    })
  })
})
```

**验证**:
```bash
pnpm test deviceId.test.ts
# 应显示: 4 passed
```

**清单**:
- [ ] `deviceId.test.ts` 创建并通过
- [ ] 覆盖率 > 95%

---

#### 2.2 P0 模块: rateLimit

**文件**: `src/__tests__/lib/rateLimit.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit } from '@/lib/rateLimit'

describe('lib/rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  describe('rateLimit()', () => {
    it('should allow requests within limit', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await rateLimit('test-key', { limit: 5, windowMs: 60000 })
        expect(result.ok).toBe(true)
        expect(result.used).toBe(i + 1)
        expect(result.remaining).toBe(5 - i - 1)
      }
    })

    it('should reject requests exceeding limit', async () => {
      for (let i = 0; i < 5; i++) {
        await rateLimit('test-key', { limit: 5, windowMs: 60000 })
      }
      const result = await rateLimit('test-key', { limit: 5, windowMs: 60000 })
      expect(result.ok).toBe(false)
    })

    it('should reset counter after time window expires', async () => {
      const key = 'test-key-2'
      
      // 达到限制
      for (let i = 0; i < 5; i++) {
        await rateLimit(key, { limit: 5, windowMs: 1000 })
      }
      
      // 第 6 次应被拒绝
      let result = await rateLimit(key, { limit: 5, windowMs: 1000 })
      expect(result.ok).toBe(false)
      
      // 快进时间超过窗口
      vi.advanceTimersByTime(1100)
      
      // 现在应该被允许
      result = await rateLimit(key, { limit: 5, windowMs: 1000 })
      expect(result.ok).toBe(true)
      expect(result.used).toBe(1)
    })

    it('should use custom limit and windowMs', async () => {
      const result1 = await rateLimit('custom-key', { limit: 3, windowMs: 500 })
      expect(result1.ok).toBe(true)
      
      const result2 = await rateLimit('custom-key', { limit: 3, windowMs: 500 })
      expect(result2.ok).toBe(true)
      
      const result3 = await rateLimit('custom-key', { limit: 3, windowMs: 500 })
      expect(result3.ok).toBe(true)
      
      const result4 = await rateLimit('custom-key', { limit: 3, windowMs: 500 })
      expect(result4.ok).toBe(false)
    })
  })
})
```

**验证**:
```bash
pnpm test rateLimit.test.ts
# 应显示: 4 passed
```

**清单**:
- [ ] `rateLimit.test.ts` 创建并通过
- [ ] 覆盖率 > 90%

---

#### 2.3 P0 模块: useHomeFlow reducer

**文件**: `src/__tests__/hooks/useHomeFlow.reducer.test.ts`

```typescript
import { describe, it, expect } from 'vitest'

// 从 useHomeFlow.ts 导出 reducer 函数进行测试
// 需要先在 useHomeFlow.ts 中 export reducer 函数

describe('hooks/useHomeFlow - reducer', () => {
  // 测试用例...
  // (详见 TEST_STRATEGY.md 中的完整代码)
})
```

**清单**:
- [ ] `useHomeFlow.reducer.test.ts` 创建
- [ ] 覆盖率 > 85%

---

#### 2.4 P1 模块: runners.withRetry

**文件**: `src/__tests__/lib/agents/runners.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('lib/agents/runners', () => {
  // 需要从 runners.ts 导出 withRetry 供测试
  // 或创建 wrapper 函数
  
  // 测试用例...
  // (详见 TEST_STRATEGY.md 中的完整代码)
})
```

**清单**:
- [ ] `runners.test.ts` 创建
- [ ] 覆盖率 > 80%

---

#### 2.5 汇总

**执行验证**:
```bash
pnpm test:coverage

# 输出应显示类似:
# ✓ src/__tests__/lib/deviceId.test.ts (4)
# ✓ src/__tests__/lib/rateLimit.test.ts (4)
# ✓ src/__tests__/hooks/useHomeFlow.reducer.test.ts (8)
# ✓ src/__tests__/lib/agents/runners.test.ts (4)
#
# Test Files  4 passed (4)
#      Tests  20 passed (20)
#
# Coverage:
# Lines: 68.5%
# Statements: 68.2%
# Functions: 72.1%
# Branches: 61.3%
```

**清单**:
- [ ] 单元测试总数 ≥ 20
- [ ] 代码覆盖率 ≥ 60%
- [ ] 所有 P0 模块覆盖率 ≥ 95%

---

### Phase 3️⃣: E2E 测试编写 (Week 4-5)

#### 3.1 P0: 完整规划流程 (E2E-1)

**文件**: `e2e/complete-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Complete itinerary planning flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 清除 localStorage 模拟首次访问
    await page.evaluate(() => localStorage.clear())
  })

  test('should plan a complete itinerary from form to result', async ({ page }) => {
    // 1. 等待表单加载
    await expect(page.locator('input[name="origin"]')).toBeVisible()

    // 2. 填表
    await page.fill('input[name="origin"]', '北京')
    await page.fill('input[name="destination"]', '杭州')
    await page.fill('input[name="startDate"]', '2026-05-01')
    await page.fill('input[name="endDate"]', '2026-05-05')
    await page.fill('textarea[name="prompt"]', '文艺青年，喜欢咖啡馆和美术馆')

    // 3. 提交生成预览
    await page.click('button:has-text("生成行程")')
    
    // 等待预览出现
    await expect(page.locator('text=行程方案')).toBeVisible({ timeout: 10000 })
    const previewText = await page.textContent('[data-testid="prompt-preview"]')
    expect(previewText).toContain('文艺青年')

    // 4. 确认规划
    await page.click('button:has-text("开始规划")')
    
    // 验证规划中状态
    await expect(page.locator('text=规划中')).toBeVisible()

    // 5. 等待结果
    await expect(page.locator('[data-testid="itinerary-header"]')).toBeVisible({ timeout: 30000 })
    
    // 6. 验证结果
    const title = await page.textContent('h2[data-testid="itinerary-title"]')
    expect(title).toBeTruthy()
    
    const dayCards = await page.locator('[data-testid="day-card"]').count()
    expect(dayCards).toBe(5)
  })

  test('should display map for each day', async ({ page }) => {
    // ... (填表和等待结果的代码同上)
    
    // 验证地图加载
    const map = page.locator('[data-testid="route-map"]')
    await expect(map).toBeVisible()
  })
})
```

**验证**:
```bash
pnpm test:e2e complete-flow.spec.ts
```

**清单**:
- [ ] E2E-1 测试创建并通过
- [ ] 至少 2 个测试用例

---

#### 3.2 P0: 表单验证 (E2E-2)

**文件**: `e2e/form-validation.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should show validation error for missing origin', async ({ page }) => {
    // 只填目的地
    await page.fill('input[name="destination"]', '杭州')
    await page.fill('input[name="startDate"]', '2026-05-01')
    await page.fill('input[name="endDate"]', '2026-05-05')

    // 尝试提交
    await page.click('button:has-text("生成行程")')
    
    // 应显示验证错误
    await expect(page.locator('text=请选择出发地')).toBeVisible()
  })

  test('should show validation error for missing destination', async ({ page }) => {
    await page.fill('input[name="origin"]', '北京')
    await page.click('button:has-text("生成行程")')
    await expect(page.locator('text=请选择目的地')).toBeVisible()
  })

  test('should disable submit button when form invalid', async ({ page }) => {
    const submitButton = page.locator('button:has-text("生成行程")')
    await expect(submitButton).toBeDisabled()
  })
})
```

**清单**:
- [ ] E2E-2 测试创建并通过
- [ ] 至少 3 个测试用例

---

#### 3.3 P0: 计划列表 (E2E-5)

**文件**: `e2e/plans-list.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Plans list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/plans')
  })

  test('should display empty state when no plans', async ({ page }) => {
    await expect(page.locator('text=还没有保存的计划')).toBeVisible()
  })

  test('should search plans by destination', async ({ page }) => {
    // 填充一些测试数据
    // ... (setup 代码)
    
    // 搜索
    await page.fill('input[placeholder="搜索目的地或行程名称..."]', '杭州')
    
    // 等待搜索结果
    await expect(page.locator('text=搜索「杭州」找到')).toBeVisible({ timeout: 5000 })
  })

  test('should delete plan with confirmation', async ({ page }) => {
    // ... (setup 代码)
    
    // 点击删除
    await page.click('button:has-text("删除")')
    
    // 应显示确认按钮
    await expect(page.locator('button:has-text("确认删除")')).toBeVisible()
    
    // 确认删除
    await page.click('button:has-text("确认删除")')
    
    // 验证删除
    await expect(page.locator('text=已删除')).toBeVisible()
  })

  test('should paginate plans list', async ({ page }) => {
    // ... (setup 多个计划)
    
    // 验证分页控件
    const paginationNext = page.locator('[aria-label="next page"]')
    await expect(paginationNext).toBeVisible()
  })
})
```

**清单**:
- [ ] E2E-5 测试创建并通过
- [ ] 至少 4 个测试用例

---

#### 3.4 P1: 其他场景

**创建以下文件**:
- `e2e/prompt-editing.spec.ts` — E2E-3
- `e2e/interruption-recovery.spec.ts` — E2E-4
- `e2e/sharing.spec.ts` — E2E-6
- `e2e/device-persistence.spec.ts` — E2E-7
- `e2e/export.spec.ts` — E2E-8

**清单**:
- [ ] E2E-3 测试创建
- [ ] E2E-4 测试创建
- [ ] E2E-6 测试创建
- [ ] E2E-7 测试创建
- [ ] E2E-8 测试创建

---

### Phase 4️⃣: CI/CD & 优化 (Week 6)

#### 4.1 GitHub Actions 集成

**创建 `.github/workflows/test.yml`**:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

**清单**:
- [ ] `.github/workflows/test.yml` 创建
- [ ] 工作流在 PR 时触发

---

#### 4.2 覆盖率报告

**配置 Codecov** (可选):
```bash
# 在 GitHub 上安装 Codecov App
# 覆盖率报告会自动发到 PR
```

**清单**:
- [ ] Codecov 集成（可选）

---

#### 4.3 文档更新

**更新 README.md**:
```markdown
## 测试

运行所有测试:
\`\`\`bash
pnpm test:all
\`\`\`

单元测试:
\`\`\`bash
pnpm test                  # 运行一次
pnpm test:watch            # 监听模式
pnpm test:coverage         # 生成覆盖率报告
pnpm test:ui              # UI 模式
\`\`\`

E2E 测试:
\`\`\`bash
pnpm test:e2e             # 运行所有 E2E 测试
pnpm test:e2e:ui          # UI 模式
\`\`\`
```

**清单**:
- [ ] README.md 更新

---

## 📊 最终验收标准

### 代码覆盖率
```
目标:
- 总体行数覆盖率: ≥ 70%
- 总体分支覆盖率: ≥ 60%
- 总体函数覆盖率: ≥ 75%

P0 模块: 100%
- deviceId.ts
- rateLimit.ts
- useHomeFlow.ts (reducer)

P1 模块: ≥ 85%
- runners.ts
- itineraryCanvas.ts
```

### 单元测试
- [ ] 至少 20 个单元测试
- [ ] 所有 P0 函数 100% 覆盖
- [ ] 所有测试通过

### E2E 测试
- [ ] 3 个 P0 场景完全通过
- [ ] 4 个 P1 场景完全通过
- [ ] 无 flaky 测试（成功率 > 95%）
- [ ] 所有测试在 CI 上通过

### 文档
- [ ] TEST_STRATEGY.md 完成
- [ ] TESTING_SUMMARY.md 完成
- [ ] TEST_CHECKLIST.md 完成
- [ ] README.md 更新
- [ ] 代码注释充分

---

## 🎯 成功指标

| 指标 | 目标 | 完成情况 |
|------|------|---------|
| 单元测试数 | ≥ 20 | ☐ |
| E2E 测试数 | ≥ 8 | ☐ |
| 代码覆盖率 | ≥ 70% | ☐ |
| P0 覆盖率 | 100% | ☐ |
| CI 集成 | ✓ | ☐ |
| 文档完整性 | 100% | ☐ |

---

## 📞 支持与问题

遇到问题？查看：
- `TEST_STRATEGY.md` — 完整规划
- `TESTING_SUMMARY.md` — 快速参考
- Vitest 文档: https://vitest.dev
- Playwright 文档: https://playwright.dev

---

**开始日期**: 2026-04-11  
**预计完成**: 2026-05-22 (6 周)  
**状态**: 🟢 就绪可开始
