# MailMind Assistant - 技术栈选型文档

## 文档概述

本文档详细说明 MailMind Assistant 项目的技术栈选型依据、架构设计和技术决策。

---

## 1. 整体架构选型

### 1.1 架构模式
**选择：浏览器插件 + 无状态后端 + AI服务层**

**选型理由：**
- ✅ 轻量化部署，用户安装即用
- ✅ 无数据库依赖，降低运维成本
- ✅ 无状态后端易于水平扩展
- ✅ 前端主导的架构，响应速度快

### 1.2 技术架构图

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器插件层 (Frontend)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ React UI组件 │  │ Zulu智能体   │  │ 本地存储管理   │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS/WebSocket
┌────────────────▼────────────────────────────────────────┐
│                     API网关层 (Backend)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ 路由管理     │  │ 请求验证     │  │ 会话管理      │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│                     AI服务层 (AI Services)                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ 文心大模型   │  │ 规则引擎     │  │ 本地轻量模型  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 前端技术栈

### 2.1 核心框架

#### React 18.x
**选型理由：**
- ✅ 成熟的组件化开发模式
- ✅ 丰富的生态系统和社区支持
- ✅ Hooks API简化状态管理
- ✅ 虚拟DOM提升渲染性能

**使用场景：**
- 邮件界面UI组件
- 配置面板
- 对话交互界面

#### TypeScript 5.x
**选型理由：**
- ✅ 静态类型检查，减少运行时错误
- ✅ 更好的IDE智能提示
- ✅ 代码可维护性强
- ✅ 与React完美配合

**关键配置：**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### 2.2 浏览器插件开发

#### Chrome Extension Manifest V3
**选型理由：**
- ✅ 最新的插件标准，安全性更高
- ✅ Service Worker替代Background Pages
- ✅ 更好的权限控制
- ✅ 支持主流浏览器（Chrome/Edge）

**核心API使用：**
- `chrome.storage` - 本地数据存储
- `chrome.runtime` - 消息传递
- `chrome.tabs` - 页面操作
- `chrome.scripting` - 内容注入

### 2.3 状态管理

#### Zustand
**选型理由：**
- ✅ 轻量级（1KB gzipped）
- ✅ API简单直观
- ✅ 无需Provider包裹
- ✅ TypeScript支持良好

**替代方案对比：**
| 方案 | 优点 | 缺点 | 选择理由 |
|------|------|------|----------|
| Zustand | 轻量、简单 | 生态较小 | ✅ 适合插件场景 |
| Redux | 生态丰富 | 代码冗余多 | ❌ 过于重量级 |
| Recoil | Facebook支持 | 学习曲线陡 | ❌ 不够成熟 |

### 2.4 UI组件库

#### Ant Design 5.x
**选型理由：**
- ✅ 企业级UI设计规范
- ✅ 组件丰富且质量高
- ✅ TypeScript支持完善
- ✅ 主题定制方便

**关键组件：**
- Input、Button、Select - 基础表单
- Modal、Drawer - 弹窗交互
- Table、List - 数据展示
- Message、Notification - 消息提示

### 2.5 构建工具

#### Vite 5.x
**选型理由：**
- ✅ 极快的冷启动速度
- ✅ 热模块替换（HMR）体验好
- ✅ 原生ESM支持
- ✅ 与React完美集成

**构建配置示例：**
```javascript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        content: 'src/content/index.ts',
        background: 'src/background/index.ts'
      }
    }
  }
})
```

---

## 3. 后端技术栈

### 3.1 运行时环境

#### Node.js 20.x LTS
**选型理由：**
- ✅ 长期支持版本，稳定可靠
- ✅ 性能优异
- ✅ 生态系统成熟
- ✅ 与前端技术栈统一

### 3.2 Web框架

#### Express.js 4.x
**选型理由：**
- ✅ 轻量灵活，学习成本低
- ✅ 中间件生态丰富
- ✅ 社区支持强大
- ✅ 适合无状态API设计

**替代方案：Fastify**
- 性能更优但生态稍弱
- 可在后期性能优化时考虑迁移

### 3.3 API设计

#### RESTful API
**选型理由：**
- ✅ 标准化，易于理解
- ✅ 与HTTP协议完美契合
- ✅ 缓存机制友好
- ✅ 工具链完善

**端点设计规范：**
```
POST   /api/v1/email/draft       - 生成邮件草稿
POST   /api/v1/email/analyze     - 分析邮件内容
POST   /api/v1/email/summarize   - 生成邮件摘要
GET    /api/v1/rules             - 获取优先级规则
POST   /api/v1/rules             - 创建规则
```

### 3.4 API文档

#### Swagger/OpenAPI 3.0
**选型理由：**
- ✅ 行业标准
- ✅ 自动生成交互式文档
- ✅ 支持多语言SDK生成
- ✅ 测试工具集成

---

## 4. AI服务集成

### 4.1 主力大模型

#### 百度文心大模型 (ERNIE Bot)
**选型理由：**
- ✅ 中文语义理解能力强
- ✅ API稳定，响应速度快
- ✅ 成本相对合理
- ✅ 支持长文本上下文

**使用场景：**
- 邮件内容生成
- 语义理解与分类
- 摘要提取
- 意图识别

**API选择：**
- ERNIE-Bot-4.0 - 复杂任务
- ERNIE-Bot-turbo - 快速响应任务
- ERNIE-Bot-8K - 长文本处理

### 4.2 Zulu智能体框架

**核心能力：**
- 对话管理
- 任务规划与分解
- 工具调用协调
- 上下文记忆

**技术实现：**
```typescript
class ZuluAgent {
  private conversationHistory: Message[];
  private taskPlanner: TaskPlanner;
  private toolRegistry: ToolRegistry;
  
  async processRequest(userInput: string): Promise<Response> {
    // 1. 意图识别
    const intent = await this.analyzeIntent(userInput);
    
    // 2. 任务规划
    const plan = await this.taskPlanner.createPlan(intent);
    
    // 3. 执行任务
    const result = await this.executePlan(plan);
    
    return result;
  }
}
```

### 4.3 辅助模型（可选）

#### 本地轻量模型
**选项：**
- BERT-base - 文本分类
- DistilBERT - 快速情感分析
- TinyBERT - 边缘计算场景

**使用场景：**
- 离线模式
- 快速预分类
- 隐私敏感场景

---

## 5. 存储方案

### 5.1 浏览器本地存储

#### Chrome Storage API
**选型理由：**
- ✅ 无需后端数据库
- ✅ 支持5MB+存储空间
- ✅ 自动同步（可选）
- ✅ 异步API，性能好

**存储结构设计：**
```typescript
interface StorageSchema {
  userPreferences: {
    language: string;
    tone: 'formal' | 'casual';
    templates: Template[];
  };
  priorityRules: PriorityRule[];
  emailCache: {
    [emailId: string]: {
      summary: string;
      priority: Priority;
      tags: string[];
      timestamp: number;
    };
  };
}
```

#### IndexedDB（备选）
**使用场景：**
- 大量邮件缓存（>5MB）
- 复杂查询需求
- 离线模式数据存储

---

## 6. 开发工具链

### 6.1 代码质量

#### ESLint + Prettier
**配置：**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### 6.2 测试框架

#### Vitest + React Testing Library
**选型理由：**
- ✅ 与Vite无缝集成
- ✅ 速度极快
- ✅ Jest兼容API
- ✅ 组件测试友好

### 6.3 版本控制

#### Git + GitHub
**分支策略：**
- `main` - 生产环境
- `develop` - 开发环境
- `feature/*` - 功能开发
- `hotfix/*` - 紧急修复

---

## 7. 部署与运维

### 7.1 CI/CD

#### GitHub Actions
**流程：**
```yaml
name: Build and Deploy
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build extension
        run: npm run build
```

### 7.2 监控告警

#### Sentry
**监控内容：**
- 前端错误追踪
- 性能监控
- 用户行为分析

---

## 8. 安全考虑

### 8.1 数据安全

- 本地数据加密存储
- HTTPS通信
- Token安全管理
- 最小权限原则

### 8.2 API安全

- API Key管理
- 请求频率限制
- 输入验证与过滤
- CORS配置

---

## 9. 技术栈总结表

| 层级 | 技术选型 | 版本 | 用途 |
|------|----------|------|------|
| **前端框架** | React | 18.x | UI组件开发 |
| **开发语言** | TypeScript | 5.x | 类型安全 |
| **状态管理** | Zustand | 4.x | 全局状态 |
| **UI组件** | Ant Design | 5.x | 界面组件 |
| **构建工具** | Vite | 5.x | 开发构建 |
| **后端框架** | Express.js | 4.x | API服务 |
| **运行环境** | Node.js | 20.x LTS | 服务器运行 |
| **AI模型** | 文心大模型 | ERNIE-Bot-4.0 | 核心AI能力 |
| **智能体** | Zulu | Custom | 任务协调 |
| **存储** | Chrome Storage API | Manifest V3 | 本地存储 |
| **测试框架** | Vitest | 1.x | 单元测试 |
| **代码规范** | ESLint + Prettier | Latest | 代码质量 |

---

## 10. 未来技术演进

### 10.1 短期优化（3-6个月）
- 引入WebAssembly提升性能
- 增加PWA支持
- 优化大模型调用策略

### 10.2 长期规划（6-12个月）
- 探索边缘AI计算
- 多模态能力支持（图片、语音）
- 跨平台扩展（移动端）

---

**文档版本：** 1.0  
**更新日期：** 2025-11-23  
**维护团队：** MailMind Assistant 技术团队