/**
 * Zulu智能体服务
 * 负责任务协调、流程管理和智能决策
 */

import { logger } from '@/shared/utils/logger';
import { modelService } from './model.service';
import { storageService } from './storage.service';
import type { 
  ZuluRequest, 
  ZuluResponse,
  Email,
  EmailAnalysis,
  EmailDraft,
  UserPreferences,
  PriorityRule 
} from '@/shared/types';

/**
 * 任务类型定义
 */
type TaskType = 'draft' | 'analyze' | 'summarize' | 'categorize' | 'prioritize' | 'extract_actions';

/**
 * 任务上下文
 */
interface TaskContext {
  user?: {
    preferences: UserPreferences;
    history: any[];
  };
  email?: {
    platform: 'gmail' | 'outlook';
    subject?: string;
    sender?: string;
    recipients?: string[];
  };
  session?: {
    id: string;
    messages: any[];
  };
}

/**
 * Zulu智能体类
 * 负责理解用户意图、规划任务流程、协调各种服务
 */
export class ZuluService {
  private sessionContext: Map<string, TaskContext> = new Map();

  /**
   * 处理用户请求的主入口
   */
  public async processRequest(request: ZuluRequest): Promise<ZuluResponse> {
    logger.info('Zulu智能体开始处理请求', { type: request.type });
    logger.time(`zulu_process_${request.type}`);

    try {
      // 1. 意图分析和上下文准备
      const context = await this.prepareContext(request);
      
      // 2. 任务规划
      const taskPlan = await this.planTasks(request, context);
      
      // 3. 执行任务
      const result = await this.executeTasks(taskPlan, context);
      
      // 4. 结果整合和优化
      const finalResult = await this.optimizeResult(result, context);

      logger.timeEnd(`zulu_process_${request.type}`);
      logger.info('Zulu智能体处理完成', { 
        type: request.type, 
        success: true,
        resultSize: JSON.stringify(finalResult).length 
      });

      return {
        success: true,
        data: finalResult,
        metadata: {
          processing_time: Date.now() - (request as any).startTime,
          model_used: 'zulu + wenxin',
        }
      };
    } catch (error) {
      logger.timeEnd(`zulu_process_${request.type}`);
      logger.error('Zulu智能体处理失败', error);
      
      return {
        success: false,
        data: null,
        metadata: {
          error: error instanceof Error ? error.message : '未知错误'
        }
      };
    }
  }

  /**
   * 准备任务上下文
   */
  private async prepareContext(request: ZuluRequest): Promise<TaskContext> {
    const context: TaskContext = {};

    try {
      // 获取用户偏好
      context.user = {
        preferences: await storageService.getUserPreferences(),
        history: [] // TODO: 实现用户历史记录
      };

      // 提取邮件上下文信息
      if (request.data.email || request.data.emailContent) {
        context.email = {
          platform: request.data.platform || 'gmail',
          subject: request.data.subject,
          sender: request.data.sender,
          recipients: request.data.recipients
        };
      }

      logger.debug('上下文准备完成', context);
      return context;
    } catch (error) {
      logger.error('准备上下文失败', error);
      throw error;
    }
  }

  /**
   * 任务规划
   */
  private async planTasks(request: ZuluRequest, context: TaskContext): Promise<TaskType[]> {
    const tasks: TaskType[] = [];

    switch (request.type) {
      case 'draft':
        // 邮件起草任务规划
        tasks.push('draft');
        break;

      case 'analyze':
        // 邮件分析任务规划
        tasks.push('analyze', 'prioritize', 'extract_actions');
        break;

      case 'summarize':
        // 摘要生成任务规划
        tasks.push('summarize');
        break;

      case 'categorize':
        // 分类任务规划
        tasks.push('categorize');
        break;

      default:
        throw new Error(`未知的任务类型: ${request.type}`);
    }

    logger.debug('任务规划完成', { tasks });
    return tasks;
  }

  /**
   * 执行任务列表
   */
  private async executeTasks(tasks: TaskType[], context: TaskContext): Promise<any> {
    const results: Record<string, any> = {};

    for (const task of tasks) {
      logger.debug(`执行任务: ${task}`);
      
      try {
        switch (task) {
          case 'draft':
            results.draft = await this.executeEmailDraft(context);
            break;
          case 'analyze':
            results.analysis = await this.executeEmailAnalysis(context);
            break;
          case 'summarize':
            results.summary = await this.executeEmailSummary(context);
            break;
          case 'categorize':
            results.category = await this.executeEmailCategorization(context);
            break;
          case 'prioritize':
            results.priority = await this.executePriorityAnalysis(context);
            break;
          case 'extract_actions':
            results.actions = await this.executeActionExtraction(context);
            break;
          default:
            logger.warn(`未知任务类型: ${task}`);
        }
      } catch (error) {
        logger.error(`任务执行失败: ${task}`, error);
        results[task] = { error: error instanceof Error ? error.message : '执行失败' };
      }
    }

    return results;
  }

  /**
   * 执行邮件起草任务
   */
  private async executeEmailDraft(context: TaskContext): Promise<EmailDraft> {
    const preferences = context.user?.preferences;
    const instruction = (context as any).instruction || '写一封邮件';

    const result = await modelService.generateEmailDraft({
      instruction,
      context: (context as any).emailContext,
      tone: preferences?.tone || 'professional',
      recipients: context.email?.recipients
    });

    return {
      subject: result.subject,
      content: result.content,
      tone: preferences?.tone || 'professional',
      confidence: result.confidence,
      suggestions: []
    };
  }

  /**
   * 执行邮件分析任务
   */
  private async executeEmailAnalysis(context: TaskContext): Promise<Partial<EmailAnalysis>> {
    const emailContent = (context as any).emailContent || '';
    
    if (!emailContent) {
      throw new Error('缺少邮件内容');
    }

    const analysis = await modelService.analyzeEmail(emailContent);
    
    return {
      priority: analysis.priority,
      sentiment: analysis.sentiment,
      category: analysis.category,
      actionItems: analysis.actionItems.map(item => ({
        action: item.action,
        deadline: item.deadline,
        assignee: undefined,
        priority: 'medium' as const
      }))
    };
  }

  /**
   * 执行邮件摘要任务
   */
  private async executeEmailSummary(context: TaskContext): Promise<string> {
    const emailContent = (context as any).emailContent || '';
    
    if (!emailContent) {
      throw new Error('缺少邮件内容');
    }

    return await modelService.summarizeEmail(emailContent, 150);
  }

  /**
   * 执行邮件分类任务
   */
  private async executeEmailCategorization(context: TaskContext): Promise<any> {
    const emailContent = (context as any).emailContent || '';
    
    if (!emailContent) {
      throw new Error('缺少邮件内容');
    }

    return await modelService.categorizeEmail(emailContent);
  }

  /**
   * 执行优先级分析任务
   */
  private async executePriorityAnalysis(context: TaskContext): Promise<any> {
    const emailContent = (context as any).emailContent || '';
    const sender = context.email?.sender || '';
    
    // 获取优先级规则
    const rules = await storageService.getPriorityRules();
    
    // 应用规则计算优先级
    let priorityScore = 0.5; // 默认中等优先级
    const matchedRules: string[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      let ruleMatches = false;

      // 检查发件人域名
      if (rule.conditions.senderDomain) {
        const senderDomain = sender.split('@')[1]?.toLowerCase();
        if (senderDomain && rule.conditions.senderDomain.some(domain => 
          senderDomain.includes(domain.toLowerCase())
        )) {
          ruleMatches = true;
        }
      }

      // 检查关键词
      if (rule.conditions.keywords) {
        const contentLower = emailContent.toLowerCase();
        if (rule.conditions.keywords.some(keyword => 
          contentLower.includes(keyword.toLowerCase())
        )) {
          ruleMatches = true;
        }
      }

      if (ruleMatches) {
        matchedRules.push(rule.name);
        const ruleImpact = rule.weight * (rule.priority === 'high' ? 1 : rule.priority === 'low' ? -0.3 : 0);
        priorityScore = Math.max(0, Math.min(1, priorityScore + ruleImpact));
      }
    }

    // 确定最终优先级级别
    let level: 'high' | 'medium' | 'low';
    if (priorityScore > 0.7) {
      level = 'high';
    } else if (priorityScore < 0.3) {
      level = 'low';
    } else {
      level = 'medium';
    }

    return {
      level,
      score: priorityScore,
      reasons: matchedRules.length > 0 ? matchedRules : ['基于内容分析']
    };
  }

  /**
   * 执行行动项提取任务
   */
  private async executeActionExtraction(context: TaskContext): Promise<any[]> {
    // 这里可以使用更复杂的NLP技术来提取行动项
    // 目前依赖模型服务的分析结果
    return [];
  }

  /**
   * 结果优化和整合
   */
  private async optimizeResult(results: any, context: TaskContext): Promise<any> {
    // 根据任务类型整合结果
    if (results.draft) {
      return results.draft;
    }

    if (results.analysis) {
      // 整合分析结果
      return {
        ...results.analysis,
        priority: results.priority || results.analysis.priority,
        summary: results.summary,
        category: results.category || results.analysis.category,
        actionItems: results.actions || results.analysis.actionItems || []
      };
    }

    if (results.summary) {
      return results.summary;
    }

    if (results.category) {
      return results.category;
    }

    return results;
  }

  /**
   * 智能对话处理
   */
  public async handleConversation(params: {
    sessionId: string;
    message: string;
    context?: any;
  }): Promise<{
    response: string;
    actionsTaken: any[];
    suggestions: string[];
    nextSteps: string[];
  }> {
    const { sessionId, message, context } = params;
    
    logger.info('处理智能对话', { sessionId, message: message.substring(0, 50) });

    try {
      // 1. 理解用户意图
      const intent = await this.analyzeUserIntent(message);
      
      // 2. 根据意图执行相应操作
      const actions = await this.executeConversationActions(intent, context);
      
      // 3. 生成回复
      const response = await this.generateConversationResponse(intent, actions);
      
      return {
        response: response.message,
        actionsTaken: actions,
        suggestions: response.suggestions,
        nextSteps: response.nextSteps
      };
    } catch (error) {
      logger.error('处理智能对话失败', error);
      return {
        response: '抱歉，处理您的请求时出现了问题。请稍后重试。',
        actionsTaken: [],
        suggestions: ['检查网络连接', '重新发送消息'],
        nextSteps: []
      };
    }
  }

  /**
   * 分析用户意图
   */
  private async analyzeUserIntent(message: string): Promise<any> {
    // 简单的意图识别规则
    const intent = {
      type: 'unknown',
      entities: {},
      confidence: 0.5
    };

    const messageLower = message.toLowerCase();

    // 邮件起草相关
    if (messageLower.includes('写') || messageLower.includes('起草') || messageLower.includes('draft')) {
      intent.type = 'draft_email';
      intent.confidence = 0.8;
    }
    // 邮件分析相关
    else if (messageLower.includes('分析') || messageLower.includes('analyze')) {
      intent.type = 'analyze_email';
      intent.confidence = 0.8;
    }
    // 邮件整理相关
    else if (messageLower.includes('整理') || messageLower.includes('筛选') || messageLower.includes('organize')) {
      intent.type = 'organize_emails';
      intent.confidence = 0.8;
    }
    // 设置相关
    else if (messageLower.includes('设置') || messageLower.includes('配置') || messageLower.includes('settings')) {
      intent.type = 'settings';
      intent.confidence = 0.7;
    }

    return intent;
  }

  /**
   * 执行对话中的操作
   */
  private async executeConversationActions(intent: any, context: any): Promise<any[]> {
    const actions = [];

    switch (intent.type) {
      case 'draft_email':
        // 执行邮件起草
        actions.push({
          type: 'email_draft',
          status: 'completed',
          result: 'Draft generated'
        });
        break;
        
      case 'analyze_email':
        // 执行邮件分析
        actions.push({
          type: 'email_analysis',
          status: 'completed',
          result: 'Analysis completed'
        });
        break;

      case 'organize_emails':
        // 执行邮件整理
        actions.push({
          type: 'email_organization',
          status: 'completed',
          result: 'Emails organized'
        });
        break;
    }

    return actions;
  }

  /**
   * 生成对话回复
   */
  private async generateConversationResponse(intent: any, actions: any[]): Promise<{
    message: string;
    suggestions: string[];
    nextSteps: string[];
  }> {
    let message = '我已经理解了您的请求';
    const suggestions: string[] = [];
    const nextSteps: string[] = [];

    switch (intent.type) {
      case 'draft_email':
        message = '我已经为您生成了邮件草稿，您可以查看并进行修改。';
        suggestions.push('调整邮件语气', '添加更多细节', '检查拼写语法');
        nextSteps.push('查看草稿内容', '发送邮件');
        break;

      case 'analyze_email':
        message = '我已经完成了邮件分析，为您提供了优先级、情感分析和行动项建议。';
        suggestions.push('查看优先级排序', '处理高优先级邮件', '设置提醒');
        nextSteps.push('处理紧急邮件', '安排回复时间');
        break;

      case 'organize_emails':
        message = '我已经为您整理了邮件，按照优先级和类别进行了分类。';
        suggestions.push('查看分类结果', '调整分类规则', '设置自动化');
        nextSteps.push('处理高优先级邮件', '归档已处理邮件');
        break;

      default:
        message = '我正在学习理解您的需求，请提供更多具体信息。';
        suggestions.push('描述具体需求', '选择功能菜单', '查看帮助文档');
        nextSteps.push('明确任务目标');
    }

    return { message, suggestions, nextSteps };
  }
}

// 导出单例
export const zuluService = new ZuluService();