// MailMind Assistant 内容脚本 - 注入到邮件页面
import { logger } from '@/shared/utils/logger';
import { EmailAnalyzer } from './email-analyzer';
import { UIInjector } from './ui-injector';
import type { ChromeMessage } from '@/shared/types';

// 全局对象，用于调试
declare global {
  interface Window {
    __MAILMIND__: any;
  }
}

/**
 * MailMind 内容脚本主类
 * 负责协调邮件分析器和UI注入器
 */
class MailMindContentScript {
  private initialized: boolean = false;
  private platform: 'gmail' | 'outlook' | 'unknown' = 'unknown';
  private emailAnalyzer: EmailAnalyzer;
  private uiInjector: UIInjector;
  private mutationObserver: MutationObserver | null = null;
  private attachedEditors: Set<Element> = new Set();

  constructor() {
    this.detectPlatform();
    this.emailAnalyzer = new EmailAnalyzer();
    this.uiInjector = new UIInjector(this.platform);
    this.initialize();
  }

  /**
   * 检测当前邮件平台
   */
  private detectPlatform(): void {
    const hostname = window.location.hostname;
    
    if (hostname.includes('mail.google.com')) {
      this.platform = 'gmail';
    } else if (hostname.includes('outlook.live.com') || hostname.includes('outlook.office.com')) {
      this.platform = 'outlook';
    } else {
      this.platform = 'unknown';
      logger.warn(`不支持的邮件平台: ${hostname}`);
      return;
    }
    
    logger.info(`检测到平台: ${this.platform}`);
  }

  /**
   * 初始化内容脚本
   */
  private initialize(): void {
    if (this.platform === 'unknown') {
      logger.warn('不支持的平台，停止初始化');
      return;
    }

    logger.info('MailMind Assistant 内容脚本正在初始化...');

    try {
      // 设置DOM变化监听
      this.setupMutationObserver();

      // 设置键盘事件监听
      this.setupKeyboardHandlers();

      // 设置消息监听
      this.setupMessageHandlers();

      // 初始扫描现有编辑器
      this.scanExistingEditors();

      // 创建全局调试对象
      this.createDebugInterface();

      this.initialized = true;
      logger.info('MailMind Assistant 内容脚本初始化完成');

    } catch (error) {
      logger.error('初始化内容脚本失败', error);
    }
  }

  /**
   * 设置DOM变化监听器
   */
  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      // 节流处理，避免频繁执行
      this.handleDOMMutations(mutations);
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  /**
   * 处理DOM变化
   */
  private handleDOMMutations(mutations: MutationRecord[]): void {
    let shouldScanEditors = false;

    for (const mutation of mutations) {
      // 检查是否有新的编辑器或对话框出现
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // 检查是否是邮件编辑器相关元素
            if (this.isEditorRelated(element)) {
              shouldScanEditors = true;
              break;
            }
          }
        }
      }
    }

    if (shouldScanEditors) {
      // 延迟执行，等待DOM稳定
      setTimeout(() => this.scanExistingEditors(), 100);
    }
  }

  /**
   * 检查元素是否与编辑器相关
   */
  private isEditorRelated(element: Element): boolean {
    if (this.platform === 'gmail') {
      return element.matches('div[role="dialog"]') ||
             element.querySelector('div[role="dialog"]') !== null ||
             element.matches('div[role="textbox"]') ||
             element.querySelector('div[role="textbox"]') !== null;
    } else if (this.platform === 'outlook') {
      return element.matches('[aria-label*="Compose"]') ||
             element.querySelector('[aria-label*="Compose"]') !== null ||
             element.matches('[aria-label*="Message body"]') ||
             element.querySelector('[aria-label*="Message body"]') !== null;
    }
    return false;
  }

  /**
   * 扫描现有编辑器
   */
  private scanExistingEditors(): void {
    let editors: NodeListOf<Element>;

    if (this.platform === 'gmail') {
      editors = document.querySelectorAll('div[role="dialog"] div[role="textbox"]');
    } else if (this.platform === 'outlook') {
      editors = document.querySelectorAll('[aria-label*="Message body"]');
    } else {
      return;
    }

    editors.forEach((editor) => {
      if (!this.attachedEditors.has(editor)) {
        this.attachToEditor(editor);
        this.attachedEditors.add(editor);
      }
    });
  }

  /**
   * 为编辑器附加智能功能
   */
  private attachToEditor(editor: Element): void {
    logger.debug('为编辑器附加智能功能');

    try {
      // 注入智能按钮
      this.uiInjector.injectSmartButton(editor, (action, context) => {
        this.handleSmartAction(action, context, editor);
      });
    } catch (error) {
      logger.error('附加编辑器功能失败', error);
    }
  }

  /**
   * 处理智能功能操作
   */
  private async handleSmartAction(action: string, context: any, editor: Element): Promise<void> {
    logger.info('处理智能操作', { action });

    // 显示加载状态
    const loadingElement = this.uiInjector.showLoading(editor, this.getLoadingMessage(action));

    try {
      switch (action) {
        case 'draft':
          await this.handleEmailDraft(context, editor);
          break;
        case 'analyze':
          await this.handleEmailAnalysis(context, editor);
          break;
        case 'summarize':
          await this.handleEmailSummary(context, editor);
          break;
        case 'improve':
          await this.handleContentImprovement(context, editor);
          break;
        default:
          logger.warn(`未知操作: ${action}`);
      }
    } catch (error) {
      logger.error(`处理操作失败: ${action}`, error);
      this.showError(editor, `操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      // 隐藏加载状态
      this.uiInjector.hideLoading(loadingElement);
    }
  }

  /**
   * 处理邮件起草
   */
  private async handleEmailDraft(context: any, editor: Element): Promise<void> {
    const composerContent = this.emailAnalyzer.getComposerContent();
    const instruction = context.existingContent || '请帮我起草一封邮件';

    const response = await this.sendMessageToBackground('draftEmail', {
      instruction,
      context: composerContent?.content,
      subject: composerContent?.subject,
      recipients: composerContent?.recipients
    });

    if (response.success && response.data) {
      // 设置邮件内容
      const success = this.emailAnalyzer.setComposerContent(
        response.data.content,
        response.data.subject
      );
      
      if (success) {
        logger.info('邮件草稿已生成');
      } else {
        throw new Error('设置邮件内容失败');
      }
    } else {
      throw new Error(response.error || '生成邮件草稿失败');
    }
  }

  /**
   * 处理邮件分析
   */
  private async handleEmailAnalysis(context: any, editor: Element): Promise<void> {
    const email = this.emailAnalyzer.getCurrentEmail();
    
    if (!email) {
      throw new Error('无法获取当前邮件内容');
    }

    const response = await this.sendMessageToBackground('analyzeEmail', {
      content: email.content,
      emailId: email.id,
      subject: email.subject,
      sender: email.sender
    });

    if (response.success && response.data) {
      // 显示分析结果
      this.uiInjector.injectAnalysisResult(editor, response.data);
      logger.info('邮件分析完成');
    } else {
      throw new Error(response.error || '邮件分析失败');
    }
  }

  /**
   * 处理邮件摘要
   */
  private async handleEmailSummary(context: any, editor: Element): Promise<void> {
    const email = this.emailAnalyzer.getCurrentEmail();
    
    if (!email) {
      throw new Error('无法获取邮件内容');
    }

    const response = await this.sendMessageToBackground('summarizeEmail', {
      content: email.content,
      emailId: email.id,
      maxLength: 150
    });

    if (response.success && response.data) {
      // 显示摘要结果
      this.uiInjector.injectAnalysisResult(editor, {
        summary: response.data.summary
      });
      logger.info('邮件摘要生成完成');
    } else {
      throw new Error(response.error || '生成摘要失败');
    }
  }

  /**
   * 处理内容改进
   */
  private async handleContentImprovement(context: any, editor: Element): Promise<void> {
    const existingContent = context.existingContent;
    
    if (!existingContent) {
      throw new Error('没有可改进的内容');
    }

    // 使用起草功能来改进现有内容
    const response = await this.sendMessageToBackground('draftEmail', {
      instruction: `请帮我改进以下邮件内容的语言表达，使其更加专业和清晰：\n\n${existingContent}`,
      context: existingContent
    });

    if (response.success && response.data) {
      // 替换现有内容
      const success = this.emailAnalyzer.setComposerContent(response.data.content);
      
      if (success) {
        logger.info('内容改进完成');
      } else {
        throw new Error('设置改进后的内容失败');
      }
    } else {
      throw new Error(response.error || '内容改进失败');
    }
  }

  /**
   * 设置键盘事件监听
   */
  private setupKeyboardHandlers(): void {
    document.addEventListener('keydown', (event) => {
      this.handleKeyPress(event);
    });
  }

  /**
   * 处理键盘事件
   */
  private handleKeyPress(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // 检测智能起草快捷键 "//"
    if (target.getAttribute('role') === 'textbox') {
      const content = target.textContent || '';
      
      if (content.endsWith('//') && event.key !== '/') {
        // 移除触发命令
        target.textContent = content.slice(0, -2);
        
        // 触发智能起草
        this.handleSmartAction('draft', { existingContent: target.textContent }, target);
      }
    }
  }

  /**
   * 设置消息监听
   */
  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'contextMenuAction') {
        this.handleContextMenuAction(message);
      }
    });
  }

  /**
   * 处理右键菜单操作
   */
  private handleContextMenuAction(message: any): void {
    const { type, text } = message;
    
    logger.info('处理右键菜单操作', { type, text: text?.substring(0, 50) });

    // 创建临时元素来处理右键菜单操作
    const tempElement = document.createElement('div');
    document.body.appendChild(tempElement);

    if (type === 'analyze') {
      this.sendMessageToBackground('analyzeEmail', {
        content: text,
        emailId: 'context_menu_' + Date.now()
      }).then((response) => {
        if (response.success) {
          this.uiInjector.injectAnalysisResult(tempElement, response.data);
        }
      });
    } else if (type === 'summarize') {
      this.sendMessageToBackground('summarizeEmail', {
        content: text,
        maxLength: 100
      }).then((response) => {
        if (response.success) {
          this.uiInjector.injectAnalysisResult(tempElement, {
            summary: response.data.summary
          });
        }
      });
    }
  }

  /**
   * 向后台脚本发送消息
   */
  private sendMessageToBackground(action: string, data: any): Promise<any> {
    return new Promise((resolve) => {
      const message: ChromeMessage = { action: action as any, data };
      
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || { success: false, error: '无响应' });
      });
    });
  }

  /**
   * 获取加载消息
   */
  private getLoadingMessage(action: string): string {
    switch (action) {
      case 'draft': return '正在生成智能草稿...';
      case 'analyze': return '正在分析邮件内容...';
      case 'summarize': return '正在生成摘要...';
      case 'improve': return '正在优化内容...';
      default: return '正在处理...';
    }
  }

  /**
   * 显示错误信息
   */
  private showError(editor: Element, message: string): void {
    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
      margin: 8px 0;
      padding: 8px 12px;
      background: #fff1f0;
      border-left: 4px solid #f5222d;
      border-radius: 4px;
      font-size: 13px;
      color: #f5222d;
    `;
    errorContainer.textContent = message;

    if (editor.parentNode) {
      editor.parentNode.insertBefore(errorContainer, editor.nextSibling);
    }

    // 3秒后自动移除
    setTimeout(() => {
      if (errorContainer.parentNode) {
        errorContainer.parentNode.removeChild(errorContainer);
      }
    }, 3000);
  }

  /**
   * 创建调试接口
   */
  private createDebugInterface(): void {
    window.__MAILMIND__ = {
      analyzeCurrentEmail: () => this.analyzeCurrentEmail(),
      getCurrentEmail: () => this.emailAnalyzer.getCurrentEmail(),
      getComposerContent: () => this.emailAnalyzer.getComposerContent(),
      isComposing: () => this.emailAnalyzer.isComposing(),
      isReading: () => this.emailAnalyzer.isReading(),
      status: 'ready',
      platform: this.platform,
      version: '1.0.0'
    };
  }

  /**
   * 分析当前邮件（调试用）
   */
  private async analyzeCurrentEmail(): Promise<void> {
    logger.info('手动触发邮件分析');
    
    try {
      const email = this.emailAnalyzer.getCurrentEmail();
      if (!email) {
        logger.warn('无法获取当前邮件');
        return;
      }

      const response = await this.sendMessageToBackground('analyzeEmail', {
        content: email.content,
        emailId: email.id
      });

      if (response.success) {
        logger.info('分析结果:', response.data);
        console.table(response.data);
      } else {
        logger.error('分析失败:', response.error);
      }
    } catch (error) {
      logger.error('分析邮件时出错', error);
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.uiInjector.cleanup();
    this.attachedEditors.clear();

    logger.info('MailMind Assistant 内容脚本已清理');
  }
}

// 初始化内容脚本
logger.info('MailMind Assistant 内容脚本开始加载');

const mailMind = new MailMindContentScript();

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  mailMind.cleanup();
});