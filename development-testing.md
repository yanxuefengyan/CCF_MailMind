# MailMind Assistant - 开发测试文档

## 1. 开发环境搭建

### 1.1 系统要求

- **操作系统：** Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
- **Node.js：** 20.x LTS
- **npm：** 10.x+
- **浏览器：** Chrome 120+ 或 Edge 120+
- **内存：** 至少 8GB RAM
- **磁盘空间：** 至少 2GB 可用空间

### 1.2 环境准备

#### 安装 Node.js

```bash
# 使用 nvm 安装 (推荐)
nvm install 20
nvm use 20

# 验证安装
node --version  # 应显示 v20.x.x
npm --version   # 应显示 10.x.x
```

#### 克隆项目

```bash
git clone https://github.com/your-org/mailmind-assistant.git
cd mailmind-assistant
```

#### 安装依赖

```bash
npm install
```

### 1.3 配置文件

创建 `.env.development` 文件：

```env
# API配置
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WENXIN_API_KEY=your_wenxin_api_key
VITE_WENXIN_SECRET_KEY=your_wenxin_secret_key

# 功能开关
VITE_ENABLE_ZULU=true
VITE_ENABLE_LOCAL_CACHE=true
VITE_ENABLE_DEBUG_MODE=true

# 日志级别
VITE_LOG_LEVEL=debug

# 测试配置
VITE_TEST_MODE=false
```

---

## 2. 项目结构

```
mailmind-assistant/
├── src/
│   ├── popup/              # 插件弹窗页面
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── index.html
│   ├── content/            # 内容脚本（注入到邮件页面）
│   │   ├── EmailAnalyzer.ts
│   │   ├── UIInjector.tsx
│   │   └── index.ts
│   ├── background/         # 后台服务脚本
│   │   ├── ZuluAgent.ts
│   │   ├── ModelService.ts
│   │   └── index.ts
│   ├── shared/             # 共享代码
│   │   ├── types/
│   │   ├── utils/
│   │   └── constants/
│   ├── services/           # API服务
│   │   ├── email.service.ts
│   │   ├── model.service.ts
│   │   └── storage.service.ts
│   └── styles/             # 全局样式
├── tests/                  # 测试文件
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── public/                 # 静态资源
│   ├── icons/
│   └── manifest.json
├── docs/                   # 文档
├── scripts/                # 构建和工具脚本
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 3. 开发工作流

### 3.1 启动开发服务器

```bash
# 启动前端开发服务器（带热更新）
npm run dev

# 启动后端API服务器
npm run dev:backend

# 同时启动前后端
npm run dev:all
```

### 3.2 构建插件

```bash
# 开发构建（包含 source maps）
npm run build:dev

# 生产构建（优化和压缩）
npm run build

# 构建并监听文件变化
npm run build:watch
```

### 3.3 加载插件到浏览器

1. 打开 Chrome/Edge 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录

### 3.4 代码规范检查

```bash
# 运行 ESLint
npm run lint

# 自动修复可修复的问题
npm run lint:fix

# 运行 Prettier 格式化
npm run format

# 类型检查
npm run type-check
```

---

## 4. 测试策略

### 4.1 测试金字塔

```
         /\
        /  \  E2E测试 (10%)
       /────\
      /      \  集成测试 (30%)
     /────────\
    /          \  单元测试 (60%)
   /────────────\
```

### 4.2 单元测试

使用 **Vitest** 进行单元测试。

#### 配置文件 (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
});
```

#### 示例测试

```typescript
// tests/unit/services/email.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { EmailService } from '@/services/email.service';

describe('EmailService', () => {
  describe('analyzeEmail', () => {
    it('应该正确分析邮件优先级', async () => {
      const emailService = new EmailService();
      const result = await emailService.analyzeEmail({
        content: '紧急：需要立即处理',
        sender: 'boss@company.com',
      });

      expect(result.priority).toBe('high');
      expect(result.urgency_score).toBeGreaterThan(0.8);
    });

    it('应该处理空邮件内容', async () => {
      const emailService = new EmailService();
      
      await expect(
        emailService.analyzeEmail({ content: '', sender: 'test@test.com' })
      ).rejects.toThrow('邮件内容不能为空');
    });
  });
});
```

#### 运行单元测试

```bash
# 运行所有单元测试
npm run test:unit

# 监听模式（文件变化时自动运行）
npm run test:unit:watch

# 生成覆盖率报告
npm run test:unit:coverage
```

### 4.3 集成测试

测试多个模块之间的交互。

#### 示例测试

```typescript
// tests/integration/zulu-model.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { ZuluAgent } from '@/background/ZuluAgent';
import { ModelService } from '@/background/ModelService';

describe('Zulu与文心大模型集成', () => {
  let zuluAgent: ZuluAgent;
  let modelService: ModelService;

  beforeAll(() => {
    modelService = new ModelService({
      apiKey: process.env.VITE_WENXIN_API_KEY!,
    });
    zuluAgent = new ZuluAgent(modelService);
  });

  it('应该能够通过Zulu生成邮件草稿', async () => {
    const result = await zuluAgent.processRequest(
      '帮我写一封感谢信给客户'
    );

    expect(result.type).toBe('email_draft');
    expect(result.content).toContain('感谢');
    expect(result.metadata.model_used).toBe('ernie-bot-4');
  });

  it('应该能够分析邮件并返回结构化结果', async () => {
    const emailContent = '尊敬的团队，本周五下午3点需要召开紧急会议...';
    const result = await zuluAgent.analyzeEmail(emailContent);

    expect(result.priority).toBeDefined();
    expect(result.action_items).toBeInstanceOf(Array);
    expect(result.action_items.length).toBeGreaterThan(0);
  });
});
```

#### 运行集成测试

```bash
npm run test:integration
```

### 4.4 端到端测试 (E2E)

使用 **Playwright** 进行端到端测试。

#### 安装 Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

#### 示例测试

```typescript
// tests/e2e/email-draft.spec.ts
import { test, expect } from '@playwright/test';

test.describe('邮件起草功能', () => {
  test('用户应该能够生成邮件草稿', async ({ page }) => {
    // 1. 打开Gmail页面
    await page.goto('https://mail.google.com');

    // 2. 点击撰写按钮
    await page.click('[gh="cm"]');

    // 3. 在邮件正文中输入触发命令
    await page.fill('[aria-label="邮件正文"]', '//写一封感谢信');

    // 4. 等待AI生成内容
    await page.waitForSelector('[data-testid="ai-generated-content"]');

    // 5. 验证生成的内容包含关键词
    const content = await page.textContent('[data-testid="ai-generated-content"]');
    expect(content).toContain('感谢');
  });
});
```

#### 运行E2E测试

```bash
# 运行所有E2E测试
npm run test:e2e

# 以 headless 模式运行
npm run test:e2e:headless

# 指定浏览器
npm run test:e2e -- --project=chromium
```

### 4.5 性能测试

#### 使用 Lighthouse 进行性能测试

```bash
# 安装 Lighthouse
npm install -g lighthouse

# 运行性能测试
lighthouse https://your-extension-popup.html --output=html --output-path=./reports/lighthouse.html
```

#### 性能基准

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| First Contentful Paint | < 1.0s | 0.8s |
| Time to Interactive | < 2.5s | 2.1s |
| Total Blocking Time | < 200ms | 150ms |
| Cumulative Layout Shift | < 0.1 | 0.05 |

---

## 5. 调试技巧

### 5.1 前端调试

#### Chrome DevTools

1. 在插件页面右键 → 检查
2. 使用 Console 查看日志
3. 使用 Network 面板监控API请求
4. 使用 React DevTools 检查组件状态

#### 日志调试

```typescript
// 使用分级日志
import { logger } from '@/shared/utils/logger';

logger.debug('详细调试信息', { data });
logger.info('一般信息');
logger.warn('警告信息');
logger.error('错误信息', error);
```

### 5.2 后台脚本调试

```bash
# 访问扩展程序管理页面
chrome://extensions/

# 点击"Service Worker"或"背景页"链接
# 打开 DevTools 进行调试
```

### 5.3 内容脚本调试

在注入的页面上右键 → 检查，然后在 Console 中执行：

```javascript
// 查看 MailMind 注入的全局对象
console.log(window.__MAILMIND__);

// 手动触发功能测试
window.__MAILMIND__.triggerAnalysis();
```

---

## 6. Mock数据

### 6.1 Mock API响应

使用 **MSW (Mock Service Worker)** 模拟API响应。

```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/v1/email/draft', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'success',
        data: {
          draft_id: 'mock_draft_123',
          content: '这是模拟生成的邮件内容',
        },
      })
    );
  }),

  rest.post('/api/v1/email/analyze', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'success',
        data: {
          priority: { level: 'high', score: 0.9 },
          sentiment: { overall: 'positive' },
        },
      })
    );
  }),
];
```

### 6.2 Mock文心大模型

```typescript
// tests/mocks/wenxin.mock.ts
export class MockWenxinService {
  async createCompletion(params: any) {
    return {
      result: '这是模拟的文心大模型响应',
      usage: { total_tokens: 100 },
    };
  }
}
```

---

## 7. 持续集成 (CI)

### 7.1 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test and Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          VITE_WENXIN_API_KEY: ${{ secrets.WENXIN_API_KEY }}
      
      - name: Build extension
        run: npm run build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

---

## 8. 代码质量检查

### 8.1 SonarQube 集成

```yaml
# sonar-project.properties
sonar.projectKey=mailmind-assistant
sonar.sources=src
sonar.tests=tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.spec.ts
```

### 8.2 代码覆盖率目标

| 类型 | 目标覆盖率 |
|------|------------|
| 行覆盖率 | ≥ 80% |
| 分支覆盖率 | ≥ 75% |
| 函数覆盖率 | ≥ 85% |
| 语句覆盖率 | ≥ 80% |

---

## 9. 常见问题排查

### 9.1 构建失败

**问题：** TypeScript编译错误

**解决：**
```bash
# 清理缓存
rm -rf node_modules dist
npm install
npm run build
```

### 9.2 测试失败

**问题：** 模块无法找到

**解决：**
```bash
# 检查 tsconfig.json 的路径别名配置
# 确保 vitest.config.ts 中也配置了相同的别名
```

### 9.3 插件加载失败

**问题：** manifest.json 格式错误

**解决：**
- 检查 manifest.json 语法
- 确保所有必需字段都存在
- 验证权限配置正确

---

## 10. 开发最佳实践

### 10.1 代码提交规范

使用 **Conventional Commits** 规范：

```bash
# 功能开发
git commit -m "feat: 添加邮件摘要功能"

# Bug修复
git commit -m "fix: 修复优先级计算错误"

# 文档更新
git commit -m "docs: 更新API文档"

# 性能优化
git commit -m "perf: 优化大模型调用性能"

# 重构
git commit -m "refactor: 重构存储服务"
```

### 10.2 分支管理策略

- `main`: 生产环境代码
- `develop`: 开发环境代码
- `feature/xxx`: 功能开发分支
- `bugfix/xxx`: Bug修复分支
- `hotfix/xxx`: 紧急修复分支

### 10.3 代码审查清单

- [ ] 代码符合项目规范
- [ ] 添加了必要的单元测试
- [ ] 所有测试通过
- [ ] 代码覆盖率达标
- [ ] 更新了相关文档
- [ ] 没有遗留的console.log
- [ ] 处理了边缘情况
- [ ] 性能满足要求

---

**文档版本：** 1.0  
**更新日期：** 2025-11-23  
**维护团队：** MailMind Assistant 开发团队