/**
 * 邮件分析器 - 提取和分析邮件内容
 */

import { logger } from '@/shared/utils/logger';
import type { Email } from '@/shared/types';

export class EmailAnalyzer {
  private platform: 'gmail' | 'outlook' | 'unknown' = 'unknown';

  constructor() {
    this.detectPlatform();
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
      logger.warn(`未支持的邮件平台: ${hostname}`);
    }
    
    logger.info(`检测到邮件平台: ${this.platform}`);
  }

  /**
   * 获取当前查看的邮件内容
   */
  public getCurrentEmail(): Email | null {
    try {
      switch (this.platform) {
        case 'gmail':
          return this.extractGmailContent();
        case 'outlook':
          return this.extractOutlookContent();
        default:
          logger.warn('不支持的平台，无法提取邮件内容');
          return null;
      }
    } catch (error) {
      logger.error('提取邮件内容失败', error);
      return null;
    }
  }

  /**
   * 提取Gmail邮件内容
   */
  private extractGmailContent(): Email | null {
    // 查找邮件主体内容区域
    const emailContainer = document.querySelector('div[role="main"]');
    if (!emailContainer) {
      logger.debug('未找到Gmail邮件容器');
      return null;
    }

    // 提取主题
    const subjectElement = emailContainer.querySelector('h2[data-thread-perm-id]');
    const subject = subjectElement?.textContent?.trim() || '';

    // 提取发件人信息
    const senderElement = emailContainer.querySelector('span[email]');
    const sender = senderElement?.getAttribute('email') || 
                  senderElement?.textContent?.match(/[\w\.-]+@[\w\.-]+/)?.[0] || '';

    // 提取邮件正文
    const contentElements = emailContainer.querySelectorAll('.a3s.aiL');
    let content = '';
    contentElements.forEach(element => {
      const text = element.textContent?.trim();
      if (text) {
        content += text + '\n\n';
      }
    });

    // 提取收件人（在撰写邮件时）
    const recipientElements = emailContainer.querySelectorAll('span[data-hovercard-id]');
    const recipients: string[] = [];
    recipientElements.forEach(element => {
      const email = element.getAttribute('data-hovercard-id');
      if (email && email.includes('@')) {
        recipients.push(email);
      }
    });

    // 生成邮件ID
    const emailId = this.generateEmailId(subject, sender, content);

    if (!content.trim()) {
      logger.debug('未找到邮件内容');
      return null;
    }

    return {
      id: emailId,
      subject,
      content: content.trim(),
      sender,
      recipients,
      timestamp: Date.now(),
      platform: 'gmail'
    };
  }

  /**
   * 提取Outlook邮件内容
   */
  private extractOutlookContent(): Email | null {
    // Outlook的DOM结构可能不同，这里提供一个基本实现
    const emailContainer = document.querySelector('[role="main"]') || 
                          document.querySelector('.wide-content-host');
    
    if (!emailContainer) {
      logger.debug('未找到Outlook邮件容器');
      return null;
    }

    // 尝试提取主题
    const subjectElement = emailContainer.querySelector('[aria-label*="Subject"]') ||
                          emailContainer.querySelector('h1') ||
                          emailContainer.querySelector('.subject');
    const subject = subjectElement?.textContent?.trim() || '';

    // 尝试提取发件人
    const senderElement = emailContainer.querySelector('[aria-label*="From"]') ||
                         emailContainer.querySelector('.sender');
    const senderText = senderElement?.textContent || '';
    const sender = senderText.match(/[\w\.-]+@[\w\.-]+/)?.[0] || '';

    // 尝试提取邮件正文
    const contentElement = emailContainer.querySelector('[aria-label*="Message body"]') ||
                          emailContainer.querySelector('.message-body') ||
                          emailContainer.querySelector('[role="document"]');
    const content = contentElement?.textContent?.trim() || '';

    const emailId = this.generateEmailId(subject, sender, content);

    if (!content) {
      logger.debug('未找到Outlook邮件内容');
      return null;
    }

    return {
      id: emailId,
      subject,
      content,
      sender,
      recipients: [], // Outlook收件人提取较复杂，暂时留空
      timestamp: Date.now(),
      platform: 'outlook'
    };
  }

  /**
   * 获取邮件编辑器内容
   */
  public getComposerContent(): { content: string; subject: string; recipients: string[] } | null {
    try {
      switch (this.platform) {
        case 'gmail':
          return this.getGmailComposerContent();
        case 'outlook':
          return this.getOutlookComposerContent();
        default:
          return null;
      }
    } catch (error) {
      logger.error('获取编辑器内容失败', error);
      return null;
    }
  }

  /**
   * 获取Gmail编辑器内容
   */
  private getGmailComposerContent(): { content: string; subject: string; recipients: string[] } | null {
    // 查找撰写邮件对话框
    const composerDialog = document.querySelector('div[role="dialog"]');
    if (!composerDialog) {
      return null;
    }

    // 获取主题
    const subjectInput = composerDialog.querySelector('input[name="subjectbox"]') as HTMLInputElement;
    const subject = subjectInput?.value || '';

    // 获取正文内容
    const bodyElement = composerDialog.querySelector('div[role="textbox"]');
    const content = bodyElement?.textContent || bodyElement?.innerHTML || '';

    // 获取收件人
    const recipientElements = composerDialog.querySelectorAll('span[data-hovercard-id]');
    const recipients: string[] = [];
    recipientElements.forEach(element => {
      const email = element.getAttribute('data-hovercard-id');
      if (email && email.includes('@')) {
        recipients.push(email);
      }
    });

    return { content, subject, recipients };
  }

  /**
   * 获取Outlook编辑器内容
   */
  private getOutlookComposerContent(): { content: string; subject: string; recipients: string[] } | null {
    // Outlook编辑器的基本实现
    const subjectInput = document.querySelector('input[aria-label*="Subject"]') as HTMLInputElement;
    const subject = subjectInput?.value || '';

    const bodyElement = document.querySelector('[aria-label*="Message body"]') ||
                       document.querySelector('.compose-body');
    const content = bodyElement?.textContent || '';

    return { content, subject, recipients: [] };
  }

  /**
   * 设置编辑器内容
   */
  public setComposerContent(content: string, subject?: string): boolean {
    try {
      switch (this.platform) {
        case 'gmail':
          return this.setGmailComposerContent(content, subject);
        case 'outlook':
          return this.setOutlookComposerContent(content, subject);
        default:
          return false;
      }
    } catch (error) {
      logger.error('设置编辑器内容失败', error);
      return false;
    }
  }

  /**
   * 设置Gmail编辑器内容
   */
  private setGmailComposerContent(content: string, subject?: string): boolean {
    const composerDialog = document.querySelector('div[role="dialog"]');
    if (!composerDialog) {
      return false;
    }

    // 设置主题
    if (subject) {
      const subjectInput = composerDialog.querySelector('input[name="subjectbox"]') as HTMLInputElement;
      if (subjectInput) {
        subjectInput.value = subject;
        // 触发输入事件以确保Gmail识别更改
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // 设置正文
    const bodyElement = composerDialog.querySelector('div[role="textbox"]') as HTMLElement;
    if (bodyElement) {
      // 保留现有内容（如果有）
      const existingContent = bodyElement.textContent || '';
      const newContent = existingContent ? `${existingContent}\n\n${content}` : content;
      
      bodyElement.textContent = newContent;
      
      // 触发必要的事件
      bodyElement.dispatchEvent(new Event('input', { bubbles: true }));
      bodyElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      // 设置光标到末尾
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(bodyElement);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      return true;
    }

    return false;
  }

  /**
   * 设置Outlook编辑器内容
   */
  private setOutlookComposerContent(content: string, subject?: string): boolean {
    // 设置主题
    if (subject) {
      const subjectInput = document.querySelector('input[aria-label*="Subject"]') as HTMLInputElement;
      if (subjectInput) {
        subjectInput.value = subject;
        subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // 设置正文
    const bodyElement = document.querySelector('[aria-label*="Message body"]') as HTMLElement;
    if (bodyElement) {
      bodyElement.textContent = content;
      bodyElement.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    return false;
  }

  /**
   * 生成邮件唯一ID
   */
  private generateEmailId(subject: string, sender: string, content: string): string {
    const baseString = `${subject}-${sender}-${content.substring(0, 100)}`;
    return btoa(baseString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * 检查是否在撰写邮件
   */
  public isComposing(): boolean {
    switch (this.platform) {
      case 'gmail':
        return !!document.querySelector('div[role="dialog"]');
      case 'outlook':
        return !!document.querySelector('[aria-label*="Compose"]') || 
               !!document.querySelector('.compose-surface');
      default:
        return false;
    }
  }

  /**
   * 检查是否在阅读邮件
   */
  public isReading(): boolean {
    switch (this.platform) {
      case 'gmail':
        return !!document.querySelector('div[role="main"] .a3s.aiL');
      case 'outlook':
        return !!document.querySelector('[role="main"] [aria-label*="Message body"]');
      default:
        return false;
    }
  }
}