# Anywhere Door — 测试规划报告

**生成时间**: 2026-04-11  
**项目**: Next.js 旅行规划应用 (AI 驱动的行程规划系统)  
**分析范围**: 核心用户流程、状态机、限流、设备识别、导出功能

---

## 📊 项目现状总结

### 技术栈
- **框架**: Next.js 16.2.2 + React 19.2.4
- **UI**: Ant Design 6.3.5 + Tailwind CSS 4
- **状态管理**: Zustand 5.0.12
- **表单**: React Hook Form 7.72.0 + Zod 4.3.6
- **AI**: Vercel AI SDK (@ai-sdk/anthropic, @ai-sdk/deepseek)
- **数据库**: Supabase (PostgreSQL)
- **缓存/限流**: Upstash Redis (降级到内存)
- **动画**: Framer Motion 12.38.0

### 测试基础设施现状
❌ **无任何测试框架配置**
- ❌ 没有 Jest/Vitest 配置
- ❌ 没有 Playwright/Cypress E2E 测试配置
- ❌ 没有单元测试或集成测试
- ❌ 没有测试脚本（npm run test）
- ✅ 项目使用 TypeScript，类型系统完善，便于测试编写

### package.json 现状
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.2",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 🎯 核心用户流程分析

### 1. **首页规划流程** (`src/app/page.tsx` + `useHomeFlow.ts`)

**步骤**:
1. 用户填写表单（出发地、目的地、日期、偏好等）
2. 生成 Prompt 预览（流式）— `/api/agents/preview-prompt`
3. 用户确认或编辑 Prompt
4. 启动规划 Agent — `/api/agents/orchestrate` (SSE 流式)
5. 显示行程结果
6. 支持调整行程功能

**关键状态**:
- `form` → `generating` → `prompt-preview` → `planning` → `done`
- 支持中断、错误恢复、上次规划恢复

### 2. **计划列表流程** (`src/app/plans/page.tsx`)

**步骤**:
1. 获取设备 ID（localStorage）
2. 列表页加载所有计划 — `/api/plans?deviceId=xxx`
3. 搜索/分页
4. 删除计划（带二次确认）
5. 复制分享链接
6. 进入计划详情

### 3. **计划详情流程** (`src/app/plans/[id]/PlanDetailClient.tsx`)

**步骤**:
1. 读取行程数据（SSR 预取）
2. 显示完整行程（天数 + 地图）
3. 本人看到"返回列表"，访客看到"保存到我的计划"
4. 导出图片功能

### 4. **设备识别流程** (`src/lib/deviceId.ts`)

**步骤**:
1. 首次访问：生成 `Date.now()-Random` 格式 UUID
2. 存入 localStorage
3. 所有请求都带上 deviceId
4. 跨页面、跨标签页一致

### 5. **限流保护** (`src/lib/rateLimit.ts`)

**策略**:
- 生产环境：Upstash Redis 限流（跨实例共享）
- 本地开发：内存限流（单进程）
- 配置：5 请求/60秒 (可配置)

### 6. **行程导出** (`src/lib/itineraryCanvas.ts`)

**步骤**:
1. 基于 snapdom 库
2. 截取 DOM 为高清 PNG (3x 超清)
3. 支持单天导出和全部导出

---

## 🧪 推荐的 E2E 测试场景 (8个)

| # | 场景 | 优先级 | 关键步骤 | 验证点 |
|----|------|-------|--------|--------|
| **E2E-1** | 完整规划流程 | P0 | 1. 填表 2. 生成预览 3. 确认规划 4. 查看结果 | ✓ 行程正确显示 ✓ 所有天数存在 ✓ 地图加载 |
| **E2E-2** | 表单验证 | P0 | 1. 清空必填项 2. 提交 | ✓ 显示错误提示 ✓ 无法提交 |
| **E2E-3** | Prompt 预览编辑 | P1 | 1. 生成预览 2. 编辑文本 3. 确认修改后的 Prompt | ✓ 编辑内容被保存 ✓ 新规划基于修改后的 Prompt |
| **E2E-4** | 规划中断与恢复 | P1 | 1. 开始规划 2. 点击中断 3. 返回表单并重新提交 | ✓ 状态正确回退 ✓ 上次参数可恢复 |
| **E2E-5** | 计划列表与搜索 | P0 | 1. 导航到 /plans 2. 搜索目的地 3. 分页 4. 删除 | ✓ 搜索结果正确 ✓ 分页正常 ✓ 删除后更新 |
| **E2E-6** | 访客分享链接流程 | P1 | 1. 复制计划分享链接 2. 新标签页打开 3. 以访客身份查看 4. 保存到我的计划 | ✓ 链接可访问 ✓ 显示"保存"按钮 ✓ 保存后出现在列表 |
| **E2E-7** | 设备识别持久化 | P1 | 1. 首次访问 2. 创建计划 3. 刷新页面 4. 验证列表仍属于同一设备 | ✓ deviceId 一致 ✓ 计划列表不变 |
| **E2E-8** | 行程导出 (PNG) | P2 | 1. 生成行程 2. 点击导出按钮 3. 验证 PNG 下载 | ✓ 文件下载 ✓ 文件名正确 ✓ 图片质量高清 |

---

## 🔬 推荐的单元测试场景 (8个)

| # | 模块 | 函数/类 | 测试用例 | 优先级 |
|----|------|--------|--------|--------|
| **U1** | `deviceId.ts` | `getDeviceId()` | • 首次调用生成 UUID ✓ localStorage 无值时生成新 ID<br>• 再次调用返回相同 ID ✓ 已有值直接返回<br>• SSR 环境返回空字符串 ✓ window 不存在时 | P0 |
| **U2** | `rateLimit.ts` | `rateLimit()` | • 正常限流 ✓ 5 次后返回 ok:false<br>• 时间窗口重置 ✓ 60s 后计数器清零<br>• Redis 不可用时降级到内存 ✓ 返回正确结果<br>• 并发请求处理 ✓ 原子性 | P0 |
| **U3** | `rateLimit.ts` | `memoryRateLimit()` | • 初始化新 bucket ✓ count=0, resetAt 正确<br>• 超过限制返回 ok:false ✓ used/remaining 正确<br>• 时间窗口过期清理 ✓ setInterval 删除过期 bucket | P1 |
| **U4** | `useHomeFlow.ts` | `reducer()` | • START_GENERATING ✓ step=generating, 清空旧 prompt<br>• APPEND_PROMPT ✓ 追加文本<br>• PROMPT_READY ✓ step=prompt-preview, finalPrompt 设置<br>• SET_ERROR ✓ step 回到 form, error 消息设置 | P0 |
| **U5** | `useHomeFlow.ts` | 状态转移 | • 正常流程: form → generating → prompt-preview → planning → done ✓ 所有步骤可达<br>• 错误场景: 任何步骤可跳转回 form (SET_ERROR)<br>• 中断场景: planning 可回到 prompt-preview | P1 |
| **U6** | `runners.ts` | `withRetry()` | • 成功一次返回结果 ✓ attempt=1<br>• 失败 2 次后重试 ✓ 延迟递增 (3s, 6s)<br>• 超过 MAX_RETRIES 抛异常 ✓ 最终错误被 throw<br>• 日志记录结构正确 ✓ JSON 格式的 console | P1 |
| **U7** | `itineraryCanvas.ts` | `downloadDayAsImage()` | • DOM 元素存在时成功 ✓ snapdom 调用 + download<br>• DOM 元素不存在时警告 ✓ console.warn<br>• 等待时间正确 ✓ setTimeout 延迟 | P2 |
| **U8** | `itineraryCanvas.ts` | `downloadAllDays()` | • 遍历所有天数 ✓ 循环 N 次<br>• 天数间隔延迟 ✓ 300ms 间隔<br>• 恢复原始 day ✓ 最后 setActiveDay(original) | P2 |

---

## 📋 按优先级排序的测试任务清单

### Phase 1: 基础设施搭建 (必做)

- [ ] **安装 Vitest** + **Vitest UI**（轻量、快速、TypeScript 友好）
  ```bash
  pnpm add -D vitest @vitest/ui @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
  ```

- [ ] **安装 Playwright**（E2E，跨浏览器）
  ```bash
  pnpm add -D @playwright/test
  ```

- [ ] **创建基本配置文件**
  - `vitest.config.ts` — 单元测试配置
  - `playwright.config.ts` — E2E 测试配置

- [ ] **添加测试脚本到 package.json**
  ```json
  {
    "scripts": {
      "test": "vitest",
      "test:ui": "vitest --ui",
      "test:e2e": "playwright test",
      "test:coverage": "vitest --coverage"
    }
  }
  ```

### Phase 2: 单元测试 (P0+P1)

- [ ] **deviceId 模块** (`src/__tests__/lib/deviceId.test.ts`)
  - 测试生成、持久化、SSR 环境

- [ ] **rateLimit 模块** (`src/__tests__/lib/rateLimit.test.ts`)
  - 测试内存限流、时间窗口、并发

- [ ] **useHomeFlow reducer** (`src/__tests__/hooks/useHomeFlow.reducer.test.ts`)
  - 测试所有 action 处理

- [ ] **runners.ts withRetry** (`src/__tests__/lib/agents/runners.test.ts`)
  - 测试重试逻辑

### Phase 3: E2E 测试 (P0)

- [ ] **E2E-1: 完整规划流程** (`e2e/complete-flow.spec.ts`)
- [ ] **E2E-2: 表单验证** (`e2e/form-validation.spec.ts`)
- [ ] **E2E-5: 计划列表** (`e2e/plans-list.spec.ts`)

### Phase 4: 扩展测试 (P1+P2)

- [ ] **E2E-3 至 E2E-8** 按优先级完成
- [ ] **集成测试**: API 路由 (`/api/plans`, `/api/agents/orchestrate`)

---

## 🔧 测试框架推荐

### 单元测试: **Vitest**

**优势**:
- ✅ Vite 原生支持，速度极快
- ✅ TypeScript 零配置
- ✅ Jest 兼容 API，迁移成本低
- ✅ 内置 UI 和覆盖率报告
- ✅ 支持模拟（mocking）、spying

**劣势**:
- 需要 jsdom 配置支持 DOM

**配置示例**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/__tests__/'],
    },
  },
})
```

### E2E 测试: **Playwright**

**优势**:
- ✅ 支持 Chromium, Firefox, WebKit
- ✅ 网络拦截、断点调试
- ✅ 代码生成工具
- ✅ 原生支持 Next.js

**劣势**:
- 配置相对复杂

**配置示例**:
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: { baseURL: 'http://localhost:3000' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 📁 推荐的目录结构

```
src/
├── __tests__/                    # 单元测试
│   ├── setup.ts                  # 测试环境初始化
│   ├── lib/
│   │   ├── deviceId.test.ts
│   │   ├── rateLimit.test.ts
│   │   └── agents/
│   │       └── runners.test.ts
│   ├── hooks/
│   │   └── useHomeFlow.reducer.test.ts
│   └── utils/
│       └── testHelpers.ts
│
e2e/                              # E2E 测试
├── fixtures/
│   └── test-data.ts              # 测试数据
├── complete-flow.spec.ts
├── form-validation.spec.ts
├── plans-list.spec.ts
└── shared.ts                     # 共享 Helper
```

---

## 🎬 测试编写示例

### 示例 1: 单元测试 — deviceId

```typescript
// src/__tests__/lib/deviceId.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getDeviceId } from '@/lib/deviceId'

describe('deviceId', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should generate a new device ID on first call', () => {
    const id = getDeviceId()
    expect(id).toMatch(/^\d+-[a-z0-9]{8}$/)
  })

  it('should return the same ID on subsequent calls', () => {
    const id1 = getDeviceId()
    const id2 = getDeviceId()
    expect(id1).toBe(id2)
  })

  it('should persist ID in localStorage', () => {
    getDeviceId()
    expect(localStorage.getItem('anywhere-door-device-id')).toBeTruthy()
  })

  it('should return empty string in SSR (window undefined)', () => {
    const originalWindow = global.window
    // @ts-ignore
    delete global.window
    const id = getDeviceId()
    expect(id).toBe('')
    global.window = originalWindow
  })
})
```

### 示例 2: 单元测试 — rateLimit

```typescript
// src/__tests__/lib/rateLimit.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit } from '@/lib/rateLimit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow requests within limit', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit('test-key', { limit: 5, windowMs: 1000 })
      expect(result.ok).toBe(true)
    }
  })

  it('should reject requests exceeding limit', async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimit('test-key', { limit: 5, windowMs: 1000 })
    }
    const result = await rateLimit('test-key', { limit: 5, windowMs: 1000 })
    expect(result.ok).toBe(false)
  })

  it('should return correct used/remaining counts', async () => {
    const r1 = await rateLimit('test-key', { limit: 10, windowMs: 1000 })
    expect(r1.used).toBe(1)
    expect(r1.remaining).toBe(9)

    const r2 = await rateLimit('test-key', { limit: 10, windowMs: 1000 })
    expect(r2.used).toBe(2)
    expect(r2.remaining).toBe(8)
  })
})
```

### 示例 3: E2E 测试 — 完整规划流程

```typescript
// e2e/complete-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Complete itinerary planning flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 清除 localStorage 模拟首次访问
    await page.context().clearCookies()
  })

  test('should plan a complete itinerary from form to result', async ({ page }) => {
    // 1. 填表
    await page.fill('input[name="origin"]', '北京')
    await page.fill('input[name="destination"]', '杭州')
    await page.fill('input[name="startDate"]', '2026-05-01')
    await page.fill('input[name="endDate"]', '2026-05-05')
    await page.fill('textarea[name="prompt"]', '文艺青年，喜欢咖啡馆和美术馆')

    // 2. 提交生成预览
    await page.click('button:has-text("生成行程")')
    
    // 验证预览步骤
    await expect(page.locator('text=行程方案')).toBeVisible({ timeout: 5000 })
    const previewText = await page.textContent('[data-testid="prompt-preview"]')
    expect(previewText).toContain('文艺青年')

    // 3. 确认规划
    await page.click('button:has-text("开始规划")')
    
    // 验证规划中状态
    await expect(page.locator('text=规划中')).toBeVisible()

    // 4. 等待结果
    await expect(page.locator('[data-testid="itinerary-header"]')).toBeVisible({ timeout: 30000 })
    
    // 验证结果
    const title = await page.textContent('h2[data-testid="itinerary-title"]')
    expect(title).toBeTruthy()

    // 验证天数显示
    const dayCards = await page.locator('[data-testid="day-card"]').count()
    expect(dayCards).toBe(5) // 5 天行程
  })

  test('should show error when required fields are empty', async ({ page }) => {
    await page.click('button:has-text("生成行程")')
    
    // 应该显示验证错误
    await expect(page.locator('text=请选择出发地')).toBeVisible()
  })
})
```

---

## 🚀 快速启动指南

### 1. 初始化测试环境

```bash
# 安装依赖
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
pnpm add -D @playwright/test

# 生成配置文件
pnpm exec vitest --init
pnpm exec playwright install
```

### 2. 创建第一个单元测试

```bash
mkdir -p src/__tests__/lib
touch src/__tests__/lib/deviceId.test.ts
```

### 3. 创建第一个 E2E 测试

```bash
mkdir -p e2e
touch e2e/smoke.spec.ts
```

### 4. 运行测试

```bash
# 运行单元测试
pnpm test

# UI 模式
pnpm test:ui

# 覆盖率报告
pnpm test:coverage

# E2E 测试
pnpm test:e2e
```

---

## 📈 测试覆盖率目标

| 模块 | 目标 | 优先级 |
|-----|------|-------|
| `lib/deviceId.ts` | 100% | P0 |
| `lib/rateLimit.ts` | 95% | P0 |
| `lib/itineraryCanvas.ts` | 80% | P2 |
| `hooks/useHomeFlow.ts` (reducer) | 90% | P1 |
| `lib/agents/runners.ts` | 85% | P1 |
| **整体** | **70%** | **目标** |

---

## 🔐 安全与隐私考虑

- ✅ 单元测试中 mock Supabase、AI 服务
- ✅ E2E 测试使用测试用 API key，不使用生产密钥
- ✅ 测试数据不包含真实用户信息
- ✅ deviceId 测试避免真实 localStorage 污染（使用 beforeEach 清理）

---

## 📚 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Playwright 官方文档](https://playwright.dev/)
- [Next.js 测试指南](https://nextjs.org/docs/testing)
- [Testing Library 最佳实践](https://testing-library.com/)

---

## 总结

| 维度 | 现状 | 建议 | 优先级 |
|------|------|------|-------|
| **测试框架** | 无 | Vitest + Playwright | P0 |
| **单元测试** | 0% | 70% 覆盖率 | P0 |
| **E2E 测试** | 0% | 8 个关键场景 | P0 |
| **CI/CD 集成** | 无 | 提交前运行测试 | P1 |
| **覆盖率报告** | 无 | HTML 报告生成 | P1 |

**预计工作量**: 40-60 小时（包括配置 + 编写）

