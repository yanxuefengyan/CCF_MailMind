// MailMind Assistant - 类型定义

// 邮件相关类型
export interface Email {
  id: string;
  subject: string;
  content: string;
  sender: string;
  recipients: string[];
  timestamp: number;
  platform: 'gmail' | 'outlook';
}

// 邮件分析结果
export interface EmailAnalysis {
  priority: Priority;
  category: string;
  sentiment: Sentiment;
  actionItems: ActionItem[];
  entities: Entity[];
  summary?: string;
}

// 优先级
export interface Priority {
  level: 'high' | 'medium' | 'low';
  score: number;
  reasons: string[];
}

// 情感分析
export interface Sentiment {
  overall: 'positive' | 'neutral' | 'negative';
  score: number;
  emotions?: string[];
}

// 行动项
export interface ActionItem {
  action: string;
  deadline?: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low';
}

// 实体
export interface Entity {
  type: 'person' | 'organization' | 'time' | 'topic' | 'location';
  value: string;
  context?: string;
  importance?: number;
}

// 邮件草稿
export interface EmailDraft {
  subject: string;
  content: string;
  tone: 'formal' | 'casual' | 'friendly' | 'professional';
  suggestions?: Suggestion[];
  confidence?: number;
}

// 建议
export interface Suggestion {
  type: 'tone_adjustment' | 'grammar' | 'style' | 'content';
  message: string;
  originalText?: string;
  suggestedText?: string;
}

// 用户配置
export interface UserPreferences {
  language: 'zh-CN' | 'en-US';
  tone: 'formal' | 'casual' | 'professional';
  enabled: boolean;
  templates: EmailTemplate[];
  priorityRules: PriorityRule[];
}

// 邮件模板
export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables?: string[];
}

// 优先级规则
export interface PriorityRule {
  id: string;
  name: string;
  conditions: {
    senderDomain?: string[];
    senderRole?: string[];
    keywords?: string[];
    subjectKeywords?: string[];
  };
  priority: 'high' | 'medium' | 'low';
  weight: number;
  enabled: boolean;
}

// 消息类型（用于Chrome扩展内部通信）
export type MessageAction =
  | 'checkInitStatus'
  | 'analyzeEmail'
  | 'draftEmail'
  | 'summarizeEmail'
  | 'categorizeEmail'
  | 'getUserPreferences'
  | 'updateUserPreferences';

export interface ChromeMessage {
  action: MessageAction;
  data?: any;
}

export interface ChromeMessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Zulu智能体相关类型
export interface ZuluRequest {
  type: 'draft' | 'analyze' | 'summarize' | 'categorize';
  data: any;
  context?: any;
}

export interface ZuluResponse {
  success: boolean;
  data: any;
  metadata?: {
    model_used?: string;
    processing_time?: number;
    tokens_used?: number;
  };
}

// 文心大模型API相关类型
export interface WenxinRequest {
  messages: WenxinMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  model?: 'ernie-bot-4' | 'ernie-bot-turbo' | 'ernie-bot-8k';
}

export interface WenxinMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface WenxinResponse {
  id: string;
  object: string;
  created: number;
  result: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 缓存相关类型
export interface CachedEmail {
  summary: string;
  priority: Priority;
  tags: string[];
  timestamp: number;
}

export interface StorageSchema {
  userPreferences: UserPreferences;
  priorityRules: PriorityRule[];
  emailCache: Record<string, CachedEmail>;
}