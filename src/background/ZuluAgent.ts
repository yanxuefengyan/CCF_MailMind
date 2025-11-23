/**
 * Zulu智能体 - 核心逻辑
 * 负责协调各种服务和处理用户请求
 */

import { logger } from '@/shared/utils/logger';
import { storageService } from '@/services/storage.service';
import { modelService } from '@/services/model.service';
import type {
  Email,
  EmailAnalysis,
  EmailDraft,
  UserPreferences,
  PriorityRule,
  ZuluRequest,
  ZuluResponse
} from '@/shared/types';

export class ZuluAgent {
  private userPreferences: UserPreferences | null = null;
  private priorityRules: PriorityRule[] = [];

  constructor() {
    this.initialize();
  }

  private async initialize() {
    logger.info('初始化Zulu智能体');
    try {
      await storageService.initializeStorage();
      this.userPreferences = await storageService.getUserPreferences();
      this.priorityRules = await storageService.getPriorityRules();
      logger.info('Zulu智能体初始化完成');
    } catch (error) {
      logger.error('Zulu智能体初始化失败', error);
    }
  }

  /**
   * 处理用户请求
   */
  public async processRequest(request: ZuluRequest): Promise<ZuluResponse> {
    logger.info('处理用户请求', { type: request.type });

    try {
      switch (request.type) {
        case 'draft':
          return await this.handleEmailDraft(request.data);
        case 'analyze':
          return await this.handleEmailAnalysis(request.data);
        case 'summarize':
          return await this.handleEmailSummary(request.data);
        case 'categorize':
          return await this.handleEmailCategorization(request.data);
        default:
          throw new Error('未知的请求类型');
      }
    } catch (error) {
      logger.error('处理用户请求失败', error);
      return {
        success: false,
        data: null,
        metadata: {
          error: (error as Error).message
        }
      };
    }
  }

  /**
   * 处理邮件草稿生成
   */
  private async handleEmailDraft(data: {
    instruction: string;
    context?: string;
    recipients?: string[];
  }): Promise<ZuluResponse> {
    logger.info('处理邮件草稿生成请求');

    try {
      const tone = this.userPreferences?.tone || 'professional';
      const draft = await modelService.generateEmailDraft({
        ...data,
        tone
      });

      return {
        success: true,
        data: draft,
        metadata: {
          model_used: 'ernie-bot-4',
          processing_time: Date.now() // 这里应该是实际处理时间
        }
      };
    } catch (error) {
      logger.error('生成邮件草稿失败', error);
      throw error;
    }
  }

  /**
   * 处理邮件分析
   */
  private async handleEmailAnalysis(data: { content: string; emailId?: string }): Promise<ZuluResponse> {
    logger.info('处理邮件分析请求');

    try {
      // 检查缓存
      if (data.emailId) {
        const cachedAnalysis = await storageService.getEmailCache(data.emailId);
        if (cachedAnalysis) {
          logger.info('使用缓存的邮件分析结果', { emailId: data.emailId });
          return {
            success: true,
            data: cachedAnalysis,
            metadata: {
              processing_time: 0, // 表示无处理时间
              model_used: 'cache'
            }
          };
        }
      }

      // 调用模型服务进行分析
      const analysis = await modelService.analyzeEmail(data.content);

      // 应用自定义优先级规则
      const finalPriority = this.applyPriorityRules(analysis, data.content);

      const result: EmailAnalysis = {
        ...analysis,
        priority: finalPriority
      };

      // 缓存结果
      if (data.emailId) {
        await storageService.setEmailCache(data.emailId, {
          summary: '', // 这里可以添加摘要
          priority: finalPriority,
          tags: [analysis.category],
          timestamp: Date.now()
        });
      }

      return {
        success: true,
        data: result,
        metadata: {
          model_used: 'ernie-bot-4',
          processing_time: Date.now() // 这里应该是实际处理时间
        }
      };
    } catch (error) {
      logger.error('分析邮件失败', error);
      throw error;
    }
  }

  /**
   * 处理邮件摘要
   */
  private async handleEmailSummary(data: { content: string; maxLength?: number }): Promise<ZuluResponse> {
    logger.info('处理邮件摘要请求');

    try {
      const summary = await modelService.summarizeEmail(data.content, data.maxLength);

      return {
        success: true,
        data: { summary },
        metadata: {
          model_used: 'ernie-bot-turbo',
          processing_time: Date.now() // 这里应该是实际处理时间
        }
      };
    } catch (error) {
      logger.error('生成邮件摘要失败', error);
      throw error;
    }
  }

  /**
   * 处理邮件分类
   */
  private async handleEmailCategorization(data: { content: string }): Promise<ZuluResponse> {
    logger.info('处理邮件分类请求');

    try {
      const categorization = await modelService.categorizeEmail(data.content);

      return {
        success: true,
        data: categorization,
        metadata: {
          model_used: 'ernie-bot-turbo',
          processing_time: Date.now() // 这里应该是实际处理时间
        }
      };
    } catch (error) {
      logger.error('邮件分类失败', error);
      throw error;
    }
  }

  /**
   * 应用自定义优先级规则
   */
  private applyPriorityRules(analysis: EmailAnalysis, content: string): EmailAnalysis['priority'] {
    let highestScore = analysis.priority.score;
    let finalPriority = analysis.priority;

    for (const rule of this.priorityRules) {
      if (!rule.enabled) continue;

      let matchScore = 0;

      // 检查关键词
      if (rule.conditions.keywords) {
        for (const keyword of rule.conditions.keywords) {
          if (content.toLowerCase().includes(keyword.toLowerCase())) {
            matchScore += 0.2;
          }
        }
      }

      // 检查主题关键词（假设我们有主题信息）
      if (rule.conditions.subjectKeywords) {
        // 这里需要添加主题检查逻辑
      }

      // 检查发件人域名（假设我们有发件人信息）
      if (rule.conditions.senderDomain) {
        // 这里需要添加发件人域名检查逻辑
      }

      // 如果匹配分数超过阈值，考虑应用这个规则
      if (matchScore > 0.5) {
        const ruleScore = rule.weight * matchScore;
        if (ruleScore > highestScore) {
          highestScore = ruleScore;
          finalPriority = {
            level: rule.priority,
            score: ruleScore,
            reasons: [`匹配自定义规则: ${rule.name}`]
          };
        }
      }
    }

    return finalPriority;
  }

  /**
   * 更新用户偏好设置
   */
  public async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    logger.info('更新用户偏好设置');
    try {
      this.userPreferences = await storageService.updateUserPreferences(preferences);
    } catch (error) {
      logger.error('更新用户偏好设置失败', error);
      throw error;
    }
  }

  /**
   * 更新优先级规则
   */
  public async updatePriorityRules(rules: PriorityRule[]): Promise<void> {
    logger.info('更新优先级规则');
    try {
      await storageService.updatePriorityRules(rules);
      this.priorityRules = rules;
    } catch (error) {
      logger.error('更新优先级规则失败', error);
      throw error;
    }
  }
}

// 导出单例
export const zuluAgent = new ZuluAgent();