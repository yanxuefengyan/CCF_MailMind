/**
 * 文心大模型API调用服务
 * 负责与百度文心大模型进行交互
 */

import { logger } from '@/shared/utils/logger';
import type { WenxinRequest, WenxinResponse, WenxinMessage } from '@/shared/types';

// API配置
const API_BASE_URL = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat';
const API_KEY = import.meta.env.VITE_WENXIN_API_KEY || '';
const SECRET_KEY = import.meta.env.VITE_WENXIN_SECRET_KEY || '';

/**
 * 文心大模型服务类
 */
export class ModelService {
  private accessToken: string = '';
  private tokenExpireTime: number = 0;

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    // 如果token仍然有效，直接返回
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    logger.info('正在获取文心大模型访问令牌');

    try {
      const response = await fetch(
        `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(`获取访问令牌失败: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`获取访问令牌失败: ${data.error_description}`);
      }

      this.accessToken = data.access_token;
      // 提前5分钟刷新token
      this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;

      logger.info('访问令牌获取成功');
      return this.accessToken;
    } catch (error) {
      logger.error('获取访问令牌失败', error);
      throw error;
    }
  }

  /**
   * 调用文心大模型API
   */
  private async callWenxinAPI(
    endpoint: string,
    request: WenxinRequest
  ): Promise<WenxinResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const url = `${API_BASE_URL}/${endpoint}?access_token=${accessToken}`;

      logger.debug('调用文心大模型API', { endpoint, request });
      logger.time(`wenxin_api_${endpoint}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      logger.timeEnd(`wenxin_api_${endpoint}`);

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error_code) {
        throw new Error(`API返回错误: ${data.error_msg}`);
      }

      logger.debug('API调用成功', { result: data.result?.substring(0, 100) });
      return data;
    } catch (error) {
      logger.error('调用文心大模型API失败', error);
      throw error;
    }
  }

  /**
   * 生成邮件草稿
   */
  public async generateEmailDraft(params: {
    instruction: string;
    context?: string;
    tone?: string;
    recipients?: string[];
  }): Promise<{ subject: string; content: string; confidence: number }> {
    const { instruction, context, tone = 'professional', recipients = [] } = params;

    const systemPrompt = `你是一个专业的邮件助手。你的任务是根据用户的指令生成恰当的邮件内容。
邮件语气应该${tone === 'formal' ? '正式专业' : tone === 'casual' ? '轻松随意' : tone === 'friendly' ? '友好亲切' : '专业得体'}。
请直接返回邮件内容，不要添加额外的解释。`;

    let userPrompt = `请帮我${instruction}`;

    if (context) {
      userPrompt += `\n\n背景信息：${context}`;
    }

    if (recipients.length > 0) {
      userPrompt += `\n\n收件人：${recipients.join(', ')}`;
    }

    userPrompt += `\n\n请按以下格式返回：
主题：[邮件主题]
---
[邮件正文内容]`;

    const messages: WenxinMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await this.callWenxinAPI('ernie-bot-4', {
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      // 解析响应
      const result = response.result;
      const lines = result.split('\n');
      
      let subject = '';
      let content = '';
      let inContent = false;

      for (const line of lines) {
        if (line.startsWith('主题：')) {
          subject = line.replace('主题：', '').trim();
        } else if (line.trim() === '---') {
          inContent = true;
        } else if (inContent && line.trim()) {
          content += line + '\n';
        }
      }

      // 如果没有找到标准格式，尝试其他方式解析
      if (!subject) {
        subject = lines[0]?.replace(/^(主题|Subject):?\s*/i, '').trim() || '邮件主题';
      }

      if (!content) {
        content = lines.slice(1).join('\n').trim();
      }

      return {
        subject: subject || '邮件主题',
        content: content || result,
        confidence: 0.85,
      };
    } catch (error) {
      logger.error('生成邮件草稿失败', error);
      throw error;
    }
  }

  /**
   * 分析邮件内容
   */
  public async analyzeEmail(emailContent: string): Promise<{
    priority: { level: 'high' | 'medium' | 'low'; score: number; reasons: string[] };
    sentiment: { overall: 'positive' | 'neutral' | 'negative'; score: number };
    category: string;
    actionItems: Array<{ action: string; deadline?: string }>;
  }> {
    const systemPrompt = `你是一个专业的邮件分析助手。请分析邮件内容并返回结构化的分析结果。
分析维度包括：优先级、情感倾向、分类、行动项。
请以JSON格式返回结果。`;

    const userPrompt = `请分析以下邮件内容：

${emailContent}

请按以下JSON格式返回分析结果：
{
  "priority": {
    "level": "high|medium|low",
    "score": 0.0-1.0,
    "reasons": ["原因1", "原因2"]
  },
  "sentiment": {
    "overall": "positive|neutral|negative",
    "score": -1.0到1.0
  },
  "category": "工作|个人|营销|支持|资讯",
  "actionItems": [
    {
      "action": "具体行动",
      "deadline": "截止日期（如有）"
    }
  ]
}`;

    const messages: WenxinMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await this.callWenxinAPI('ernie-bot-4', {
        messages,
        temperature: 0.3,
        max_tokens: 500,
      });

      // 尝试解析JSON结果
      const result = response.result;
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const analysisResult = JSON.parse(jsonMatch[0]);
        return analysisResult;
      }

      // 如果无法解析JSON，返回默认结果
      logger.warn('无法解析邮件分析结果，返回默认值');
      return {
        priority: {
          level: 'medium',
          score: 0.5,
          reasons: ['无法确定优先级'],
        },
        sentiment: {
          overall: 'neutral',
          score: 0,
        },
        category: '未分类',
        actionItems: [],
      };
    } catch (error) {
      logger.error('分析邮件失败', error);
      throw error;
    }
  }

  /**
   * 生成邮件摘要
   */
  public async summarizeEmail(emailContent: string, maxLength: number = 150): Promise<string> {
    const systemPrompt = '你是一个专业的邮件摘要助手。请简洁地总结邮件的核心内容。';

    const userPrompt = `请将以下邮件内容总结为不超过${maxLength}字的简短摘要：

${emailContent}

摘要应该：
1. 抓住核心要点
2. 简洁明了
3. 保留关键信息
4. 不超过${maxLength}字`;

    const messages: WenxinMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await this.callWenxinAPI('ernie-bot-turbo', {
        messages,
        temperature: 0.3,
        max_tokens: Math.ceil(maxLength * 1.5),
      });

      return response.result.trim();
    } catch (error) {
      logger.error('生成邮件摘要失败', error);
      throw error;
    }
  }

  /**
   * 邮件分类
   */
  public async categorizeEmail(emailContent: string): Promise<{
    primaryCategory: string;
    confidence: number;
    suggestedTags: string[];
  }> {
    const systemPrompt = `你是一个专业的邮件分类助手。请对邮件进行分类。
可选分类包括：工作、个人、营销、客户支持、资讯、社交、其他。`;

    const userPrompt = `请对以下邮件进行分类：

${emailContent}

请以JSON格式返回：
{
  "primaryCategory": "主要分类",
  "confidence": 0.0-1.0,
  "suggestedTags": ["标签1", "标签2"]
}`;

    const messages: WenxinMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await this.callWenxinAPI('ernie-bot-turbo', {
        messages,
        temperature: 0.2,
        max_tokens: 200,
      });

      // 尝试解析JSON结果
      const result = response.result;
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 默认返回
      return {
        primaryCategory: '未分类',
        confidence: 0.5,
        suggestedTags: [],
      };
    } catch (error) {
      logger.error('邮件分类失败', error);
      throw error;
    }
  }
}

// 导出单例
export const modelService = new ModelService();