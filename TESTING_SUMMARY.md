# Anywhere Door — 测试规划快速参考

> 🎯 **执行概要**: 从零到完整测试覆盖的可行方案

---

## 📌 一页纸总结

### 现状
- ✅ TypeScript 全覆盖，类型安全
- ❌ 零测试覆盖
- ❌ 无 CI/CD 测试集成

### 目标
- 70% 代码覆盖率（P0/P1 模块）
- 8 个 E2E 关键场景
- 完整的单元测试套件

### 方案
| 层级 | 框架 | 数量 | 工作量 |
|------|------|------|-------|
| 单元测试 | Vitest | 8 个模块组 | 20h |
| E2E 测试 | Playwright | 8 个场景 | 24h |
| 配置 & 文档 | - | - | 8h |
| **总计** | - | **16 个测试套** | **52h** |

---

## 🎬 快速开始（5分钟）

### Step 1: 安装
```bash
cd /Users/ekkopan/Desktop/workspace/anywhere-door

# 安装单元测试框架
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/jest-dom

# 安装 E2E 框架
pnpm add -D @playwright/test
```

### Step 2: 创建配置
```bash
# 创建 vitest 配置
cat > vitest.config.ts << 'EOC'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
EOC

# 创建 playwright 配置
pnpm exec playwright --init
```

### Step 3: 第一个测试
```bash
mkdir -p src/__tests__/lib

cat > src/__tests__/lib/deviceId.test.ts << 'EOT'
import { describe, it, expect, beforeEach } from 'vitest'
import { getDeviceId } from '@/lib/deviceId'

describe('deviceId', () => {
  beforeEach(() => localStorage.clear())

  it('should generate a device ID', () => {
    const id = getDeviceId()
    expect(id).toMatch(/^\d+-[a-z0-9]{8}$/)
  })

  it('should persist ID', () => {
    const id1 = getDeviceId()
    const id2 = getDeviceId()
    expect(id1).toBe(id2)
  })
})
EOT
```

### Step 4: 运行测试
```bash
# 单元测试
pnpm exec vitest src/__tests__/lib/deviceId.test.ts

# UI 可视化
pnpm exec vitest --ui
```

---

## 📊 E2E 测试矩阵

### P0 (高优先级 - 必做)

| ID | 用例 | 验证内容 | 预计时间 |
|----|------|---------|---------|
| E2E-1 | 完整规划流程 | 从表单→预览→规划→结果 | 6h |
| E2E-2 | 表单验证 | 必填项检查 + 错误提示 | 4h |
| E2E-5 | 计划列表 | 搜索、分页、删除 | 5h |

### P1 (中优先级 - 建议做)

| ID | 用例 | 验证内容 | 预计时间 |
|----|------|---------|---------|
| E2E-3 | Prompt 编辑 | 修改后的 Prompt 被应用 | 3h |
| E2E-4 | 中断恢复 | 状态回退 + 参数恢复 | 4h |
| E2E-6 | 分享链接 | 访客保存计划流程 | 4h |
| E2E-7 | 设备识别 | deviceId 持久化 | 2h |

### P2 (低优先级)

| ID | 用例 | 验证内容 | 预计时间 |
|----|------|---------|---------|
| E2E-8 | 导出 PNG | 文件下载 + 质量验证 | 4h |

---

## 🔬 单元测试矩阵

### P0 模块 (100% 覆盖必须)

```
✅ deviceId.ts
   ├─ getDeviceId() - 生成、持久化、SSR
   ├─ 3-4 个测试用例
   └─ 预计 2h

✅ rateLimit.ts
   ├─ rateLimit() - 限流、窗口重置、降级
   ├─ memoryRateLimit() - 内存实现
   ├─ 6-8 个测试用例
   └─ 预计 4h

✅ useHomeFlow.ts (reducer 部分)
   ├─ 状态转移: form → generating → prompt-preview → planning → done
   ├─ 8-10 个测试用例
   └─ 预计 4h
```

### P1 模块 (80%+ 覆盖)

```
⭐ runners.ts
   ├─ withRetry() - 重试逻辑
   ├─ 4-6 个测试用例
   └─ 预计 3h

⭐ itineraryCanvas.ts
   ├─ downloadDayAsImage() - 单天导出
   ├─ downloadAllDays() - 全部导出
   ├─ 4-5 个测试用例
   └─ 预计 2h
```

---

## 📁 项目文件树

创建完成后的结构：

```
anywhere-door/
├── vitest.config.ts ........................ ✨ 新建
├── playwright.config.ts ................... ✨ 新建
├── package.json (更新 scripts) ........... 🔄 修改
│
├── src/
│   ├── __tests__/ ......................... ✨ 新建目录
│   │   ├── setup.ts ....................... 初始化
│   │   ├── lib/
│   │   │   ├── deviceId.test.ts
│   │   │   ├── rateLimit.test.ts
│   │   │   └── agents/
│   │   │       └── runners.test.ts
│   │   ├── hooks/
│   │   │   └── useHomeFlow.reducer.test.ts
│   │   └── utils/
│   │       └── testHelpers.ts
│   │
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── ...（原有结构不变）
│
└── e2e/ ................................. ✨ 新建目录
    ├── fixtures/
    │   └── test-data.ts
    ├── utils/
    │   └── helpers.ts
    ├── complete-flow.spec.ts
    ├── form-validation.spec.ts
    ├── plans-list.spec.ts
    ├── prompt-editing.spec.ts
    ├── interruption-recovery.spec.ts
    ├── sharing.spec.ts
    ├── device-persistence.spec.ts
    └── export.spec.ts
```

---

## 🛠️ package.json 脚本更新

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

---

## 🎯 分阶段执行计划

### Week 1: 基础设施 (8h)
- [ ] 安装依赖和配置
- [ ] 创建 setup.ts 和 helpers
- [ ] 完成 E2E fixtures 和 utils
- [ ] 文档编写

### Week 2-3: 单元测试 (20h)
- [ ] deviceId + rateLimit (4h)
- [ ] useHomeFlow reducer (4h)
- [ ] runners withRetry (3h)
- [ ] itineraryCanvas (2h)
- [ ] 边界情况和完善 (7h)

### Week 4-5: E2E 测试 (24h)
- [ ] P0 场景: E2E-1, 2, 5 (15h)
- [ ] P1 场景: E2E-3, 4, 6, 7 (8h)
- [ ] P2 场景: E2E-8 (1h)

### Week 6: CI/CD & 清理 (4h)
- [ ] GitHub Actions 集成
- [ ] 覆盖率报告配置
- [ ] 文档最终化

---

## ✅ 验收标准

### 代码覆盖率
- 线条覆盖率: ≥ 70%
- 分支覆盖率: ≥ 60%
- 函数覆盖率: ≥ 75%
- P0 模块: 100%

### E2E 测试
- ✅ 所有 P0 场景可运行
- ✅ 至少 1 个 P1 场景
- ✅ 无 flaky 测试（失败率 < 5%）

### CI/CD
- ✅ 提交前自动运行
- ✅ 覆盖率报告生成
- ✅ 失败时阻止合并

---

## 🔗 关键文件位置

| 文件 | 路径 | 优先级 |
|------|------|-------|
| deviceId 源码 | `src/lib/deviceId.ts` | P0 |
| rateLimit 源码 | `src/lib/rateLimit.ts` | P0 |
| useHomeFlow 源码 | `src/hooks/useHomeFlow.ts` | P0 |
| 首页 | `src/app/page.tsx` | E2E |
| 计划列表 | `src/app/plans/page.tsx` | E2E |
| 计划详情 | `src/app/plans/[id]/PlanDetailClient.tsx` | E2E |
| Runners | `src/lib/agents/runners.ts` | P1 |
| Canvas 导出 | `src/lib/itineraryCanvas.ts` | P2 |

---

## 📚 参考资源

### 官方文档
- [Vitest](https://vitest.dev/) — 快速 Unit 测试
- [Playwright](https://playwright.dev/) — 自动化 E2E 测试
- [Testing Library](https://testing-library.com/) — React 组件测试

### 相关示例
- [Next.js Testing Guide](https://nextjs.org/docs/testing)
- [Jest to Vitest Migration](https://vitest.dev/guide/migration.html)

---

## ❓ 常见问题

**Q: 为什么选 Vitest 而不是 Jest?**  
A: Vitest 与 Vite 原生集成，比 Jest 快 10-100 倍，且 TypeScript 支持更好。

**Q: 为什么选 Playwright 而不是 Cypress?**  
A: Playwright 支持多浏览器（Chrome/Firefox/Safari），网络拦截更强大。

**Q: 如何处理 AI API 调用?**  
A: 在测试中 mock 所有 fetch 调用，使用 MSW 或 vitest 的 `vi.mock()`。

**Q: 测试数据如何管理?**  
A: 创建 `e2e/fixtures/` 存储静态数据，通过 factory pattern 生成动态测试数据。

---

## 📞 需要帮助?

- 查看完整报告: `TEST_STRATEGY.md`
- 查看代码示例: 同报告内
- 问题反馈: 提交 Issue

---

**Last Updated**: 2026-04-11  
**Status**: 🟢 Ready to Start  
**Next Step**: 安装依赖 (`pnpm add -D vitest ...`)
