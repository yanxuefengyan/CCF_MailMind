# MailMind Assistant - 大模型调用文档

## 1. 概述

本文档详细说明了MailMind Assistant项目中文心大模型的集成和调用方法。我们主要使用百度文心大模型（ERNIE Bot）作为核心AI能力提供者。

---

## 2. 模型选择

### 2.1 主要模型

- **ERNIE-Bot-4.0**：用于复杂任务处理
- **ERNIE-Bot-turbo**：用于需要快速响应的任务
- **ERNIE-Bot-8K**：用于长文本处理

### 2.2 模型特性对比

| 模型 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| ERNIE-Bot-4.0 | 强大的语义理解和生成能力 | 响应速度较慢 | 复杂邮件起草、深度内容分析 |
| ERNIE-Bot-turbo | 响应速度快 | 理解能力相对较弱 | 快速回复建议、简单分类任务 |
| ERNIE-Bot-8K | 支持长文本输入 | 响应速度最慢 | 长邮件总结、多轮对话理解 |

---

## 3. 集成准备

### 3.1 获取API密钥

1. 访问[百度智能云](https://console.bce.baidu.com/)
2. 创建应用并获取API Key和Secret Key
3. 配置IP白名单（如有必要）

### 3.2 安装SDK

```bash
npm install @baidu/ernie-sdk
```

### 3.3 初始化配置

```typescript
import { ERNIEBot } from '@baidu/ernie-sdk';

const ernie = new ERNIEBot({
  apiKey: 'YOUR_API_KEY',
  secretKey: 'YOUR_SECRET_KEY',
});
```

---

## 4. 模型调用示例

### 4.1 邮件起草

```typescript
async function draftEmail(instruction: string): Promise<string> {
  const response = await ernie.createCompletion({
    model: 'ernie-bot-4',
    messages: [
      { role: 'system', content: '你是一个专业的邮件助手。' },
      { role: 'user', content: `起草一封邮件：${instruction}` }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  return response.result;
}
```

### 4.2 邮件摘要

```typescript
async function summarizeEmail(emailContent: string): Promise<string> {
  const response = await ernie.createCompletion({
    model: 'ernie-bot-turbo',
    messages: [
      { role: 'system', content: '请对以下邮件内容进行简洁的摘要。' },
      { role: 'user', content: emailContent }
    ],
    temperature: 0.3,
    max_tokens: 150
  });

  return response.result;
}
```

### 4.3 邮件优先级分析

```typescript
async function analyzeEmailPriority(emailContent: string): Promise<string> {
  const response = await ernie.createCompletion({
    model: 'ernie-bot-4',
    messages: [
      { role: 'system', content: '分析以下邮件内容的优先级，返回"高"、"中"或"低"。' },
      { role: 'user', content: emailContent }
    ],
    temperature: 0.1,
    max_tokens: 10
  });

  return response.result.trim();
}
```

---

## 5. 错误处理

### 5.1 常见错误类型

- 网络错误
- API限流
- 模型响应超时
- 输入格式错误

### 5.2 错误处理示例

```typescript
async function safeModelCall<T>(
  callFn: () => Promise<T>,
  retries = 3
): Promise<T> {
  try {
    return await callFn();
  } catch (error) {
    if (error.code === 'ECONNRESET' && retries > 0) {
      console.warn(`连接重置，尝试重新调用。剩余重试次数：${retries - 1}`);
      return safeModelCall(callFn, retries - 1);
    }
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      console.error('API调用次数超限，请稍后再试');
      throw new Error('API调用频率限制');
    }
    console.error('模型调用出错：', error);
    throw error;
  }
}
```

---

## 6. 性能优化

### 6.1 缓存策略

- 使用Redis缓存频繁请求的结果
- 为相似输入设置模糊匹配缓存机制

```typescript
import { createClient } from 'redis';

const redisClient = createClient();

async function getCachedResult(key: string): Promise<string | null> {
  return await redisClient.get(key);
}

async function setCachedResult(key: string, value: string, ttl: number): Promise<void> {
  await redisClient.set(key, value, { EX: ttl });
}
```

### 6.2 并发控制

使用令牌桶算法限制API调用频率：

```typescript
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 50,
  interval: 'minute',
  fireImmediately: true
});

async function callModelWithRateLimit<T>(callFn: () => Promise<T>): Promise<T> {
  const remainingRequests = await limiter.removeTokens(1);
  if (remainingRequests < 0) {
    throw new Error('Rate limit exceeded');
  }
  return callFn();
}
```

---

## 7. 安全考虑

### 7.1 数据脱敏

在发送到模型前，对敏感信息进行脱敏处理：

```typescript
function maskSensitiveInfo(text: string): string {
  // 替换邮箱地址
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  
  // 替换电话号码
  text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  
  // 替换信用卡号
  text = text.replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[CREDIT_CARD]');
  
  return text;
}
```

### 7.2 访问控制

- 使用OAuth2.0进行用户认证
- 为不同级别的用户设置不同的API访问权限

---

## 8. 监控和日志

### 8.1 性能监控

使用Prometheus和Grafana监控模型调用性能：

```typescript
import client from 'prom-client';

const modelCallDuration = new client.Histogram({
  name: 'model_call_duration_seconds',
  help: '模型调用耗时',
  labelNames: ['model', 'task']
});

async function monitoredModelCall<T>(
  callFn: () => Promise<T>,
  modelName: string,
  taskName: string
): Promise<T> {
  const end = modelCallDuration.startTimer({ model: modelName, task: taskName });
  try {
    return await callFn();
  } finally {
    end();
  }
}
```

### 8.2 日志记录

使用winston进行日志记录：

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'model-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// 记录模型调用日志
function logModelCall(modelName: string, input: string, output: string, duration: number): void {
  logger.info('Model call', { modelName, input, output, duration });
}
```

---

## 9. 持续优化

### 9.1 A/B测试

实施A/B测试以优化模型选择和参数：

```typescript
type ModelVersion = 'ernie-bot-4' | 'ernie-bot-turbo';

function getModelVersion(userId: string): ModelVersion {
  return hashString(userId) % 2 === 0 ? 'ernie-bot-4' : 'ernie-bot-turbo';
}

async function abTestModelCall(userId: string, input: string): Promise<string> {
  const modelVersion = getModelVersion(userId);
  const startTime = Date.now();
  const result = await ernie.createCompletion({
    model: modelVersion,
    messages: [{ role: 'user', content: input }],
  });
  const duration = Date.now() - startTime;
  
  // 记录A/B测试结果
  logABTestResult(userId, modelVersion, input, result.result, duration);
  
  return result.result;
}
```

### 9.2 模型微调

根据用户反馈和使用数据，定期进行模型微调：

1. 收集用户反馈和修正数据
2. 准备微调数据集
3. 使用百度提供的微调API进行模型更新
4. 在测试环境验证微调效果
5. 逐步在生产环境中应用微调后的模型

---

## 10. 结语

本文档提供了MailMind Assistant项目中文心大模型集成的详细指南。随着项目的发展，我们将持续优化模型调用策略，提升性能和用户体验。

**文档版本：** 1.0  
**更新日期：** 2025-11-23  
**维护团队：** MailMind Assistant AI团队