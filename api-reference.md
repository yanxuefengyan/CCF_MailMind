# MailMind Assistant - API调用文档

## 1. 概述

本文档详细说明了MailMind Assistant项目的API接口规范、调用方法和响应格式。我们采用RESTful API设计，使用JSON格式进行数据交换。

**API基础URL：** `https://api.mailmind.com/v1`

---

## 2. 认证机制

### 2.1 API密钥认证

每个请求需要在Header中包含API密钥：

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### 2.2 获取API密钥

```bash
curl -X POST https://api.mailmind.com/v1/auth/api-key \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'
```

**响应：**
```json
{
  "status": "success",
  "data": {
    "api_key": "mk_12345abcdef",
    "expires_at": "2024-12-31T23:59:59Z"
  }
}
```

---

## 3. 邮件处理API

### 3.1 智能邮件起草

**端点：** `POST /email/draft`

**描述：** 基于用户指令生成邮件内容

**请求体：**
```json
{
  "instruction": "催张三交Q3报告，明天截止，语气正式",
  "tone": "formal",
  "language": "zh-CN",
  "recipient_info": {
    "name": "张三",
    "relationship": "同事"
  },
  "context": {
    "previous_emails": [],
    "project_info": "Q3季度报告项目"
  }
}
```

**响应：**
```json
{
  "status": "success",
  "data": {
    "draft_id": "draft_12345",
    "subject": "关于Q3报告提交的提醒",
    "content": "张三，\n\n希望这封邮件...",
    "suggestions": [
      {
        "type": "tone_adjustment",
        "message": "建议使用更加礼貌的开头"
      }
    ],
    "confidence": 0.92
  },
  "metadata": {
    "model_used": "ernie-bot-4",
    "processing_time": 2.3,
    "tokens_used": 150
  }
}
```

### 3.2 邮件内容分析

**端点：** `POST /email/analyze`

**描述：** 分析邮件内容，提取关键信息

**请求体：**
```json
{
  "email_content": "Hi Team,\n\nWe need to discuss the Q3 budget...",
  "analysis_type": ["priority", "sentiment", "action_items", "entities"],
  "sender_info": {
    "email": "manager@company.com",
    "name": "John Manager"
  }
}
```

**响应：**
```json
{
  "status": "success",
  "data": {
    "priority": {
      "level": "high",
      "score": 0.85,
      "reasons": ["来自管理层", "包含预算关键词", "提及会议需求"]
    },
    "sentiment": {
      "overall": "neutral",
      "score": 0.1,
      "emotions": ["urgency", "concern"]
    },
    "action_items": [
      {
        "action": "参加Q3预算讨论会议",
        "deadline": "2024-01-15",
        "assignee": "团队成员",
        "priority": "high"
      }
    ],
    "entities": [
      {
        "type": "time_period",
        "value": "Q3",
        "context": "budget discussion"
      },
      {
        "type": "topic",
        "value": "budget",
        "importance": 0.9
      }
    ]
  }
}
```

### 3.3 邮件摘要生成

**端点：** `POST /email/summarize`

**描述：** 为长邮件或邮件线程生成简洁摘要

**请求体：**
```json
{
  "emails": [
    {
      "id": "email_001",
      "subject": "项目进展更新",
      "content": "项目当前进展...",
      "timestamp": "2024-01-10T10:00:00Z",
      "sender": "project_lead@company.com"
    }
  ],
  "summary_length": "medium",
  "focus_areas": ["decisions", "action_items", "deadlines"]
}
```

**响应：**
```json
{
  "status": "success",
  "data": {
    "summary": "项目团队讨论了当前进展，确定了三个关键决策点...",
    "key_points": [
      "项目按计划进行，预计下周完成第一阶段",
      "需要额外的UI设计资源",
      "客户反馈积极，要求增加新功能"
    ],
    "action_items": [
      {
        "task": "联系UI设计师",
        "assignee": "项目经理",
        "deadline": "本周五"
      }
    ],
    "decisions": [
      "决定增加新功能模块",
      "延期第二阶段发布时间"
    ]
  }
}
```

---

## 4. 优先级管理API

### 4.1 获取优先级规则

**端点：** `GET /rules/priority`

**响应：**
```json
{
  "status": "success",
  "data": {
    "rules": [
      {
        "id": "rule_001",
        "name": "管理层邮件",
        "conditions": {
          "sender_domain": ["company.com"],
          "sender_role": ["manager", "director"],
          "keywords": ["urgent", "asap"]
        },
        "priority": "high",
        "weight": 0.9,
        "enabled": true
      }
    ],
    "default_priority": "medium"
  }
}
```

### 4.2 创建优先级规则

**端点：** `POST /rules/priority`

**请求体：**
```json
{
  "name": "客户支持邮件",
  "conditions": {
    "sender_domain": ["customer.com"],
    "subject_keywords": ["support", "help", "issue"],
    "business_hours_only": true
  },
  "priority": "high",
  "weight": 0.8,
  "actions": {
    "auto_tag": ["customer_support"],
    "notify": true
  }
}
```

---

## 5. 分类标签API

### 5.1 自动分类

**端点：** `POST /email/categorize`

**请求体：**
```json
{
  "email_content": "...",
  "available_categories": [
    "work", "personal", "marketing", "support", "newsletter"
  ],
  "confidence_threshold": 0.7
}
```

**响应：**
```json
{
  "status": "success",
  "data": {
    "primary_category": "work",
    "confidence": 0.89,
    "all_categories": [
      {"name": "work", "score": 0.89},
      {"name": "support", "score": 0.23},
      {"name": "personal", "score": 0.12}
    ],
    "suggested_tags": ["project_update", "team_communication"]
  }
}
```

### 5.2 创建自定义标签

**端点：** `POST /tags`

**请求体：**
```json
{
  "name": "重要客户",
  "color": "#FF6B6B",
  "auto_apply_rules": {
    "sender_emails": ["vip@client.com"],
    "subject_contains": ["合同", "订单"]
  }
}
```

---

## 6. Zulu智能体交互API

### 6.1 启动对话会话

**端点：** `POST /zulu/session`

**请求体：**
```json
{
  "user_id": "user_12345",
  "context": {
    "current_email": "email_id_123",
    "user_preferences": {
      "language": "zh-CN",
      "tone": "professional"
    }
  }
}
```

**响应：**
```json
{
  "status": "success",
  "data": {
    "session_id": "session_abc123",
    "expires_at": "2024-01-10T12:00:00Z",
    "greeting": "您好！我是Zulu智能助手，可以帮助您处理邮件。请问需要什么帮助？"
  }
}
```

### 6.2 发送消息

**端点：** `POST /zulu/message`

**请求体：**
```json
{
  "session_id": "session_abc123",
  "message": "帮我整理今天收到的所有未读邮件",
  "message_type": "command"
}
```

**响应：**
```json
{
  "status": "success",
  "data": {
    "response": "我已经为您整理了今天的未读邮件，共发现15封邮件...",
    "actions_taken": [
      {
        "type": "email_analysis",
        "count": 15,
        "results": "已分析并分类"
      }
    ],
    "suggestions": [
      "建议优先处理3封高优先级邮件",
      "有2封邮件需要在今天回复"
    ],
    "next_steps": [
      "查看高优先级邮件详情",
      "设置提醒处理待回复邮件"
    ]
  }
}
```

---

## 7. 批量处理API

### 7.1 批量邮件分析

**端点：** `POST /email/batch/analyze`

**请求体：**
```json
{
  "emails": [
    {"id": "email_001", "content": "..."},
    {"id": "email_002", "content": "..."}
  ],
  "analysis_types": ["priority", "category", "sentiment"],
  "options": {
    "parallel_processing": true,
    "max_concurrent": 5
  }
}
```

**响应：**
```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "email_id": "email_001",
        "priority": "high",
        "category": "work",
        "sentiment": "positive"
      }
    ],
    "summary": {
      "processed": 2,
      "failed": 0,
      "processing_time": 3.2
    }
  }
}
```

---

## 8. 错误处理

### 8.1 错误响应格式

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_INPUT",
    "message": "邮件内容不能为空",
    "details": {
      "field": "email_content",
      "received": "",
      "expected": "non-empty string"
    }
  },
  "request_id": "req_12345"
}
```

### 8.2 常见错误代码

| 错误代码 | HTTP状态码 | 描述 |
|----------|------------|------|
| `INVALID_API_KEY` | 401 | API密钥无效或已过期 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超过限制 |
| `INVALID_INPUT` | 400 | 请求参数格式错误 |
| `MODEL_UNAVAILABLE` | 503 | AI模型服务不可用 |
| `PROCESSING_FAILED` | 500 | 邮件处理失败 |

---

## 9. 限流规则

### 9.1 默认限流

- **免费用户：** 100 requests/hour
- **专业用户：** 1000 requests/hour  
- **企业用户：** 10000 requests/hour

### 9.2 限流响应头

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

---

## 10. Webhook配置

### 10.1 设置Webhook

**端点：** `POST /webhooks`

**请求体：**
```json
{
  "url": "https://your-app.com/webhooks/mailmind",
  "events": ["email_processed", "priority_changed"],
  "secret": "your_webhook_secret"
}
```

### 10.2 Webhook事件

**邮件处理完成事件：**
```json
{
  "event": "email_processed",
  "timestamp": "2024-01-10T10:00:00Z",
  "data": {
    "email_id": "email_12345",
    "processing_results": {
      "priority": "high",
      "category": "work",
      "summary": "会议安排确认"
    }
  }
}
```

---

## 11. SDK示例

### 11.1 JavaScript/TypeScript

```typescript
import { MailMindAPI } from '@mailmind/sdk';

const client = new MailMindAPI({
  apiKey: 'your_api_key',
  baseURL: 'https://api.mailmind.com/v1'
});

// 生成邮件草稿
const draft = await client.email.draft({
  instruction: '写一封感谢邮件给客户',
  tone: 'friendly'
});

console.log(draft.content);
```

### 11.2 Python

```python
from mailmind import MailMindClient

client = MailMindClient(api_key='your_api_key')

# 分析邮件
result = client.email.analyze(
    email_content="邮件内容...",
    analysis_type=['priority', 'sentiment']
)

print(result.priority.level)
```

---

## 12. 测试环境

**测试API基础URL：** `https://api-test.mailmind.com/v1`

测试环境特点：
- 使用模拟数据
- 不产生实际费用
- 响应时间可能较长
- 定期重置数据

---

## 13. API版本管理

当前版本：`v1`

版本升级策略：
- 主要版本（v1 → v2）：可能包含破坏性更改
- 次要版本（v1.1 → v1.2）：向后兼容的功能添加
- 修订版本（v1.1.1 → v1.1.2）：错误修复

---

**文档版本：** 1.0  
**更新日期：** 2025-11-23  
**维护团队：** MailMind Assistant API团队