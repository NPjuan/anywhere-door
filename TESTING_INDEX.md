# Anywhere Door — 测试规划文档索引

**项目**: Anywhere Door (Next.js 旅行规划应用)  
**生成日期**: 2026-04-11  
**文档版本**: 1.0

---

## 📚 文档导航

本测试规划包含 4 个核心文档，按用途分类：

### 1️⃣ **TEST_STRATEGY.md** — 完整规划文档
**📖 长度**: ~800 行 | **⏱️ 阅读时间**: 40-60 分钟  
**👥 适合**: 项目经理、技术负责人、测试人员

**包含内容**:
- ✅ 项目现状完整分析
- ✅ 8 个 E2E 测试场景详细表格
- ✅ 8 个单元测试场景详细表格
- ✅ 框架选择（Vitest + Playwright）的完整论证
- ✅ 配置示例代码（可直接复制）
- ✅ 测试编写示例（3 个完整示例）
- ✅ 测试覆盖率目标
- ✅ 参考资源链接

**何时查看**:
- 需要理解完整的测试战略
- 需要理解为什么选择特定框架
- 需要看测试代码示例

---

### 2️⃣ **TESTING_SUMMARY.md** — 快速参考指南
**📖 长度**: ~300 行 | **⏱️ 阅读时间**: 15-20 分钟  
**👥 适合**: 开发人员、QA 工程师

**包含内容**:
- ✅ 一页纸项目现状总结
- ✅ 快速开始 5 分钟指南
- ✅ E2E 测试优先级矩阵
- ✅ 单元测试优先级矩阵
- ✅ 6 周分阶段执行计划
- ✅ 验收标准清单
- ✅ 常见问题解答

**何时查看**:
- 需要快速了解整体计划
- 需要了解工作量和时间投入
- 需要参考优先级和里程碑

---

### 3️⃣ **TEST_CHECKLIST.md** — 实施操作指南
**📖 长度**: ~600 行 | **⏱️ 阅读时间**: 45-60 分钟  
**👥 适合**: 开发人员、DevOps 工程师

**包含内容**:
- ✅ 前置检查清单
- ✅ Phase 1: 基础设施搭建（完整代码）
- ✅ Phase 2: 单元测试编写（完整代码）
- ✅ Phase 3: E2E 测试编写（完整代码）
- ✅ Phase 4: CI/CD 集成（完整代码）
- ✅ 每个阶段的验证步骤
- ✅ 最终验收标准

**何时查看**:
- 开始实施测试体系
- 需要复制粘贴的代码
- 需要逐步执行指导

---

### 4️⃣ **TESTING_INDEX.md** — 本文档
**📖 长度**: 本文件 | **⏱️ 阅读时间**: 5-10 分钟  
**👥 适合**: 所有人

**包含内容**:
- ✅ 文档导航和快速查找
- ✅ 按场景的建议阅读顺序
- ✅ 关键决策汇总

---

## 🎯 快速查找

### 按角色查找

#### 👨‍💼 项目经理/技术负责人
**目标**: 理解整体计划、工作量、风险

**推荐阅读顺序**:
1. 本文档的"项目快照"部分
2. `TESTING_SUMMARY.md` — 工作量和时间表
3. `TEST_STRATEGY.md` — E2E 和单元测试场景（表格部分）

**关键输出**:
- 52 小时工作量
- 6 周时间表
- 70% 覆盖率目标

---

#### 👨‍💻 开发工程师
**目标**: 实施测试、编写代码、集成 CI/CD

**推荐阅读顺序**:
1. `TESTING_SUMMARY.md` — 快速了解方案
2. `TEST_CHECKLIST.md` Phase 1-2 — 依赖和配置
3. `TEST_CHECKLIST.md` Phase 3-4 — 测试编写和 CI/CD
4. `TEST_STRATEGY.md` 的代码示例 — 参考实现

**关键输出**:
- 完整的 vitest/playwright 配置
- 可复用的测试代码示例

---

#### 🧪 QA/测试工程师
**目标**: 设计和执行 E2E 测试

**推荐阅读顺序**:
1. `TESTING_SUMMARY.md` — E2E 测试矩阵
2. `TEST_STRATEGY.md` — E2E-1 至 E2E-8 完整描述
3. `TEST_CHECKLIST.md` Phase 3 — E2E 测试实施

**关键输出**:
- 8 个 E2E 测试场景
- 验收标准
- 优先级指导

---

### 按任务查找

**"我要设置测试框架"**
→ `TEST_CHECKLIST.md` Phase 1（第 40-120 行）

**"我要写单元测试"**
→ `TEST_CHECKLIST.md` Phase 2（第 120-280 行）
→ `TEST_STRATEGY.md` 代码示例部分

**"我要写 E2E 测试"**
→ `TEST_CHECKLIST.md` Phase 3（第 280-400 行）
→ `TEST_STRATEGY.md` E2E-1 完整例子

**"我需要 CI/CD 配置"**
→ `TEST_CHECKLIST.md` Phase 4（第 400-450 行）

**"我需要了解测试框架为什么选这个"**
→ `TEST_STRATEGY.md` 测试框架推荐部分（P308）

**"我需要快速汇报进度"**
→ `TESTING_SUMMARY.md` 快速参考（所有地方）

---

## 📊 项目快照

### 现状
```
框架:      Next.js 16.2.2 + React 19.2.4
测试覆盖:  0% ❌
测试框架:  无 ❌
文档:      无 ❌
```

### 目标
```
框架:      Vitest + Playwright ✅
覆盖率:    70% ✅
单元测试:  20+ 个 ✅
E2E 测试:  8 个 ✅
CI/CD:     集成 ✅
文档:      完整 ✅
```

### 工作量
```
基础设施:  8h
单元测试:  20h
E2E 测试:  24h
CI/CD:     4h
───────────────
总计:      56h ≈ 6-8 周
```

### 优先级分布
```
P0 (高) — 必做
├─ E2E-1: 完整规划流程
├─ E2E-2: 表单验证
├─ E2E-5: 计划列表
├─ U1: deviceId
├─ U2: rateLimit
└─ U4: useHomeFlow reducer

P1 (中) — 建议做
├─ E2E-3 至 E2E-7
├─ U5 至 U6

P2 (低) — 可选
└─ E2E-8 等
```

---

## 🔄 推荐阅读顺序

### 场景 1: 刚接手项目，无测试经验
```
1. 本文档 — 建立基本概念
2. TESTING_SUMMARY.md — 了解工作量和框架
3. TEST_STRATEGY.md — 学习为什么选这些框架
4. TEST_CHECKLIST.md Phase 1 — 开始设置
5. TEST_STRATEGY.md 代码示例 — 学习怎么写
```

### 场景 2: 技术负责人，需要规划
```
1. 本文档 — 项目快照
2. TESTING_SUMMARY.md — 工作量、时间表、成本
3. TEST_STRATEGY.md — 完整技术细节
4. TEST_CHECKLIST.md — 转给团队执行
```

### 场景 3: 开发人员，要开始实施
```
1. TESTING_SUMMARY.md — 快速了解
2. TEST_CHECKLIST.md Phase 1 — 按步骤做配置
3. TEST_CHECKLIST.md Phase 2 — 实施单元测试
4. TEST_STRATEGY.md 代码示例 — 参考实现
5. TEST_CHECKLIST.md Phase 3-4 — 完成 E2E 和 CI/CD
```

### 场景 4: QA/测试，要设计 E2E
```
1. TESTING_SUMMARY.md E2E 矩阵 — 了解场景
2. TEST_STRATEGY.md E2E 完整描述 — 理解需求
3. TEST_CHECKLIST.md Phase 3 — 实施
4. TEST_STRATEGY.md 完整示例 — 参考实现
```

---

## 💡 关键决策汇总

### 为什么选 Vitest？
✅ 速度快 10-100 倍（vs Jest）  
✅ TypeScript 零配置  
✅ Next.js 原生支持  
✅ 内置 UI 和覆盖率  

**对比 Jest**: Jest 更成熟，但 Vitest 够用且更快。

### 为什么选 Playwright？
✅ 多浏览器支持（Chrome/Firefox/Safari）  
✅ 网络拦截更强大  
✅ 调试工具更好  
✅ 原生 Next.js 支持  

**对比 Cypress**: Cypress 用户体验更好，但 Playwright 多浏览器。

### 测试框架不选 Jest + Cypress 的原因？
- Jest: 比 Vitest 慢 10-100 倍，TypeScript 配置复杂
- Cypress: 不支持 Safari，不支持多标签页，仅 Chromium

### 为什么目标是 70% 而不是 100%？
- 100% 覆盖率投入回报递减
- 70% 已覆盖所有关键路径
- 剩下 30% 多是 UI 细节，ROI 低

---

## 🔍 关键指标速查表

### 单元测试
| 模块 | 函数 | 用例数 | 覆盖率目标 | 优先级 |
|------|------|--------|-----------|--------|
| deviceId | getDeviceId() | 4 | 100% | P0 |
| rateLimit | rateLimit() | 4 | 95% | P0 |
| rateLimit | memoryRateLimit() | 4 | 95% | P1 |
| useHomeFlow | reducer | 8 | 90% | P0 |
| useHomeFlow | 状态转移 | 4 | 85% | P1 |
| runners | withRetry | 4 | 85% | P1 |
| itineraryCanvas | downloadDayAsImage | 3 | 80% | P2 |
| itineraryCanvas | downloadAllDays | 2 | 80% | P2 |

### E2E 测试
| ID | 用例 | 验证点数 | 优先级 | 预计工时 |
|----|----|---------|--------|----------|
| E2E-1 | 完整规划流程 | 5 | P0 | 6h |
| E2E-2 | 表单验证 | 4 | P0 | 4h |
| E2E-5 | 计划列表 | 4 | P0 | 5h |
| E2E-3 | Prompt 编辑 | 3 | P1 | 3h |
| E2E-4 | 中断恢复 | 3 | P1 | 4h |
| E2E-6 | 分享链接 | 4 | P1 | 4h |
| E2E-7 | 设备识别 | 2 | P1 | 2h |
| E2E-8 | 导出 PNG | 3 | P2 | 4h |

---

## ✅ 验收清单

### 基础设施 (Week 1)
- [ ] Vitest 安装和配置
- [ ] Playwright 安装和配置
- [ ] package.json 脚本更新
- [ ] 测试可运行

### 单元测试 (Week 2-3)
- [ ] P0 模块 100% 覆盖
- [ ] P1 模块 80% 覆盖
- [ ] 总覆盖率 ≥ 60%
- [ ] 所有单元测试通过

### E2E 测试 (Week 4-5)
- [ ] 3 个 P0 场景通过
- [ ] 4 个 P1 场景通过
- [ ] 无 flaky 测试
- [ ] 全部测试平均运行时间 < 20 分钟

### CI/CD (Week 6)
- [ ] GitHub Actions 工作流配置
- [ ] 覆盖率报告生成
- [ ] PR 前自动运行测试
- [ ] 失败时阻止合并

---

## 📞 获取帮助

### 文档问题
- 查看相应文档的"Q&A"部分（如有）
- 参考文档末尾的参考资源链接

### 技术问题
- **Vitest**: https://vitest.dev/
- **Playwright**: https://playwright.dev/
- **Testing Library**: https://testing-library.com/

### 项目相关
- 查看 `TEST_STRATEGY.md` 的"常见问题"部分
- 参考具体代码示例

---

## 📈 进度追踪

创建一个 `TESTING_PROGRESS.md` 文件来跟踪进度：

```markdown
# 测试实施进度

## Phase 1: 基础设施 (Week 1)
- [x] Vitest 安装
- [x] Playwright 安装
- [ ] vitest.config.ts
- [ ] playwright.config.ts
- [ ] setup.ts

## Phase 2: 单元测试 (Week 2-3)
- [ ] deviceId.test.ts
- [ ] rateLimit.test.ts
- [ ] useHomeFlow.reducer.test.ts
- [ ] runners.test.ts

...
```

---

## 🎓 学习资源

### 推荐的学习路径
1. **Vitest 入门** (2h)
   - 官方指南
   - 编写第一个测试

2. **React 单元测试** (3h)
   - React 组件测试
   - Hooks 测试

3. **Playwright 基础** (2h)
   - 选择器和导航
   - 断言和等待

4. **E2E 最佳实践** (2h)
   - 可靠的测试设计
   - Flaky 测试排查

### 推荐书籍/文章
- "Testing JavaScript" by Kent C. Dodds
- "Learning React Testing Library" by Hannah Lim
- Playwright 官方 Blog

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-04-11 | 初始版本 |

---

**文档维护者**: Claude Sonnet  
**最后更新**: 2026-04-11  
**状态**: ✅ 完成并就绪

---

## 快速链接

| 文档 | 用途 | 长度 |
|------|------|------|
| [TEST_STRATEGY.md](./TEST_STRATEGY.md) | 完整规划 | 800 行 |
| [TESTING_SUMMARY.md](./TESTING_SUMMARY.md) | 快速参考 | 300 行 |
| [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) | 实施指南 | 600 行 |
| [TESTING_INDEX.md](./TESTING_INDEX.md) | 本文档 | 当前 |

