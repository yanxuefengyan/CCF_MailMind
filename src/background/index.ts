// Background Service Worker for MailMind Assistant
import { logger } from '@/shared/utils/logger';
import { storageService } from '@/services/storage.service';
import { modelService } from '@/services/model.service';
import { zuluService } from '@/services/zulu.service';
import type { ChromeMessage, ChromeMessageResponse } from '@/shared/types';

// 初始化后台服务
async function initBackgroundService() {
  logger.info('MailMind Assistant 后台服务正在启动...');
  
  try {
    // 初始化存储服务
    await storageService.initializeStorage();
    logger.info('存储服务初始化成功');
    
    logger.info('MailMind Assistant 后台服务已启动');
    chrome.action.setBadgeText({ text: 'ON' });
    chrome.action.setBadgeBackgroundColor({ color: '#1890ff' });
  } catch (error) {
    logger.error('初始化后台服务失败', error);
    chrome.action.setBadgeText({ text: 'ERR' });
    chrome.action.setBadgeBackgroundColor({ color: '#f5222d' });
  }
}

// 监听插件安装和更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logger.info('MailMind Assistant 首次安装');
    initBackgroundService();
  } else if (details.reason === 'update') {
    logger.info(`MailMind Assistant 已更新到版本 ${chrome.runtime.getManifest().version}`);
    initBackgroundService();
  }
});

// 监听启动事件
chrome.runtime.onStartup.addListener(() => {
  initBackgroundService();
});

// 监听来自 popup 和 content script 的消息
chrome.runtime.onMessage.addListener((request: ChromeMessage, sender, sendResponse) => {
  const start = Date.now();
  logger.info('收到消息', { action: request.action, from: sender.tab ? 'content' : 'popup' });

  // 处理消息
  handleMessage(request, sender)
    .then((response: ChromeMessageResponse) => {
      const duration = Date.now() - start;
      logger.debug('消息处理完成', { action: request.action, duration, success: response.success });
      sendResponse(response);
    })
    .catch((error) => {
      logger.error('消息处理失败', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      });
    });

  return true; // 保持消息通道开启，以支持异步响应
});

/**
 * 处理消息的主函数
 */
async function handleMessage(request: ChromeMessage, sender: chrome.runtime.MessageSender): Promise<ChromeMessageResponse> {
  try {
    switch (request.action) {
      case 'checkInitStatus':
        return {
          success: true,
          data: { status: '准备就绪', version: chrome.runtime.getManifest().version }
        };

      case 'analyzeEmail':
        return await handleEmailAnalysis(request.data);

      case 'draftEmail':
        return await handleEmailDraft(request.data);

      case 'summarizeEmail':
        return await handleEmailSummary(request.data);

      case 'categorizeEmail':
        return await handleEmailCategorize(request.data);

      case 'getUserPreferences':
        return {
          success: true,
          data: await storageService.getUserPreferences()
        };

      case 'updateUserPreferences':
        return {
          success: true,
          data: await storageService.updateUserPreferences(request.data)
        };

      default:
        logger.warn(`未知操作: ${request.action}`);
        return { success: false, error: '未知操作' };
    }
  } catch (error) {
    logger.error(`处理操作失败: ${request.action}`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

/**
 * 邮件分析处理函数
 */
async function handleEmailAnalysis(data: any): Promise<ChromeMessageResponse> {
  logger.info('分析邮件', { contentLength: data.content?.length });

  try {
    // 调用Zulu智能体进行分析
    const zuluRequest = {
      type: 'analyze' as const,
      data: { emailContent: data.content },
      startTime: Date.now()
    };

    const result = await zuluService.processRequest(zuluRequest);

    if (!result.success) {
      throw new Error(result.metadata?.error || '分析失败');
    }

    // 缓存分析结果
    if (data.emailId) {
      await storageService.setEmailCache(data.emailId, {
        summary: result.data.summary || '',
        priority: result.data.priority,
        tags: [result.data.category],
        timestamp: Date.now()
      });
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    logger.error('邮件分析失败', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '分析邮件失败'
    };
  }
}

/**
 * 邮件起草处理函数
 */
async function handleEmailDraft(data: any): Promise<ChromeMessageResponse> {
  logger.info('起草邮件', { instruction: data.instruction?.substring(0, 50) });

  try {
    // 调用Zulu智能体生成草稿
    const zuluRequest = {
      type: 'draft' as const,
      data: {
        instruction: data.instruction || data.context || '起草一封邮件',
        emailContext: data.context,
        subject: data.subject,
        recipients: data.recipients
      },
      startTime: Date.now()
    };

    const result = await zuluService.processRequest(zuluRequest);

    if (!result.success) {
      throw new Error(result.metadata?.error || '生成草稿失败');
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    logger.error('邮件起草失败', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '起草邮件失败'
    };
  }
}

/**
 * 邮件摘要处理函数
 */
async function handleEmailSummary(data: any): Promise<ChromeMessageResponse> {
  logger.info('生成邮件摘要', { contentLength: data.content?.length });

  try {
    // 如果已经有缓存，直接返回
    if (data.emailId) {
      const cached = await storageService.getEmailCache(data.emailId);
      if (cached?.summary) {
        logger.info('使用缓存的摘要');
        return {
          success: true,
          data: { summary: cached.summary }
        };
      }
    }

    // 没有缓存，调用模型服务
    const summary = await modelService.summarizeEmail(data.content, data.maxLength || 150);

    // 缓存摘要结果
    if (data.emailId) {
      const cached = await storageService.getEmailCache(data.emailId) || {
        priority: { level: 'medium', score: 0.5, reasons: [] },
        tags: [],
        timestamp: Date.now()
      };

      await storageService.setEmailCache(data.emailId, {
        ...cached,
        summary,
        timestamp: Date.now()
      });
    }

    return {
      success: true,
      data: { summary }
    };
  } catch (error) {
    logger.error('生成邮件摘要失败', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成摘要失败'
    };
  }
}

/**
 * 邮件分类处理函数
 */
async function handleEmailCategorize(data: any): Promise<ChromeMessageResponse> {
  logger.info('邮件分类', { contentLength: data.content?.length });

  try {
    const result = await modelService.categorizeEmail(data.content);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('邮件分类失败', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '邮件分类失败'
    };
  }
}

// 定期清理缓存
chrome.alarms.create('cleanCache', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanCache') {
    logger.info('执行缓存清理');
    
    storageService.cleanupCache()
      .then(() => {
        logger.info('缓存清理完成');
      })
      .catch((error) => {
        logger.error('缓存清理失败', error);
      });
  }
});

// 设置上下文菜单（用于右键快捷操作）
chrome.contextMenus?.create({
  id: 'mailmindMenu',
  title: 'MailMind Assistant',
  contexts: ['selection']
});

chrome.contextMenus?.create({
  id: 'analyzeSelected',
  parentId: 'mailmindMenu',
  title: '分析选中文本',
  contexts: ['selection']
});

chrome.contextMenus?.create({
  id: 'summarizeSelected',
  parentId: 'mailmindMenu',
  title: '生成摘要',
  contexts: ['selection']
});

// 监听上下文菜单点击
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  
  if (info.menuItemId === 'analyzeSelected' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'contextMenuAction',
      type: 'analyze',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'summarizeSelected' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'contextMenuAction',
      type: 'summarize',
      text: info.selectionText
    });
  }
});

// 初始化服务
initBackgroundService();