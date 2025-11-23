/**
 * 存储服务 - 处理本地数据存储
 * 使用Chrome Storage API实现无数据库架构
 */

import { logger } from '@/shared/utils/logger';
import type { 
  UserPreferences,
  PriorityRule,
  CachedEmail,
  StorageSchema,
  EmailTemplate
} from '@/shared/types';

// 添加Chrome类型定义
declare namespace chrome {
  export namespace storage {
    interface StorageArea {
      get(keys: string | string[] | null | object): Promise<{[key: string]: any}>;
      set(items: object): Promise<void>;
      get(keys: string | string[] | null | object, callback: (items: {[key: string]: any}) => void): void;
      set(items: object, callback: () => void): void;
    }
    
    export const sync: StorageArea;
    export const local: StorageArea;
  }
  
  export namespace runtime {
    export const lastError: chrome.runtime.LastError | undefined;
    
    interface LastError {
      message?: string;
    }
  }
}

// 默认用户偏好设置
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  language: 'zh-CN',
  tone: 'professional',
  enabled: true,
  templates: [],
  priorityRules: []
};

// 默认优先级规则
const DEFAULT_PRIORITY_RULES: PriorityRule[] = [
  {
    id: 'rule_manager',
    name: '管理层邮件',
    conditions: {
      senderRole: ['manager', 'director', 'vp', 'ceo'],
      keywords: ['urgent', 'asap', '紧急', '立即']
    },
    priority: 'high',
    weight: 0.9,
    enabled: true
  },
  {
    id: 'rule_deadline',
    name: '截止日期提醒',
    conditions: {
      keywords: ['deadline', 'due', 'by tomorrow', '截止', '明天前']
    },
    priority: 'high',
    weight: 0.8,
    enabled: true
  },
  {
    id: 'rule_newsletter',
    name: '订阅邮件',
    conditions: {
      senderDomain: ['newsletter', 'marketing', 'noreply'],
      keywords: ['newsletter', 'subscribe', 'update', '资讯', '订阅']
    },
    priority: 'low',
    weight: 0.7,
    enabled: true
  }
];

// 默认邮件模板
const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'template_meeting_follow_up',
    name: '会议跟进',
    category: 'meeting',
    content: '亲爱的{recipient},\n\n感谢您参加我们今天关于{topic}的会议。以下是会议的主要讨论要点和后续行动项：\n\n主要讨论内容：\n- {point1}\n- {point2}\n\n后续行动项：\n1. {action1} - 负责人：{owner1}，截止日期：{deadline1}\n2. {action2} - 负责人：{owner2}，截止日期：{deadline2}\n\n如有任何问题，请随时与我联系。\n\n祝好，\n{sender}',
    variables: ['recipient', 'topic', 'point1', 'point2', 'action1', 'owner1', 'deadline1', 'action2', 'owner2', 'deadline2', 'sender']
  },
  {
    id: 'template_project_update',
    name: '项目更新',
    category: 'project',
    content: '亲爱的团队，\n\n以下是{project}项目的最新进展：\n\n完成事项：\n- {completed1}\n- {completed2}\n\n进行中：\n- {inProgress1} (预计完成日期：{deadline1})\n- {inProgress2} (预计完成日期：{deadline2})\n\n存在的问题：\n- {issue1}\n- {issue2}\n\n下一步计划：\n- {next1}\n- {next2}\n\n如有任何问题或建议，请随时反馈。\n\n祝好，\n{sender}',
    variables: ['project', 'completed1', 'completed2', 'inProgress1', 'deadline1', 'inProgress2', 'deadline2', 'issue1', 'issue2', 'next1', 'next2', 'sender']
  }
];

/**
 * 存储服务类
 * 处理Chrome Storage API的数据存取
 */
export class StorageService {
  /**
   * 初始化存储
   * 检查并设置默认值
   */
  public async initializeStorage(): Promise<void> {
    logger.info('初始化存储服务');
    
    try {
      // 获取当前存储状态
      const storage = await this.getFullStorage();
      let needsUpdate = false;
      
      // 检查并设置默认用户偏好
      if (!storage.userPreferences) {
        storage.userPreferences = DEFAULT_USER_PREFERENCES;
        needsUpdate = true;
      }
      
      // 检查并设置默认优先级规则
      if (!storage.priorityRules || storage.priorityRules.length === 0) {
        storage.priorityRules = DEFAULT_PRIORITY_RULES;
        needsUpdate = true;
      }
      
      // 检查并设置默认邮件模板
      if (!storage.userPreferences.templates || storage.userPreferences.templates.length === 0) {
        storage.userPreferences.templates = DEFAULT_EMAIL_TEMPLATES;
        needsUpdate = true;
      }
      
      // 检查并初始化邮件缓存
      if (!storage.emailCache) {
        storage.emailCache = {};
        needsUpdate = true;
      }
      
      // 如果需要更新，保存设置
      if (needsUpdate) {
        await this.setFullStorage(storage);
        logger.info('存储初始化完成', { storage });
      } else {
        logger.info('存储已存在，无需初始化');
      }
    } catch (error) {
      logger.error('初始化存储失败', error);
      throw error;
    }
  }

  /**
   * 获取完整存储数据
   */
  public async getFullStorage(): Promise<StorageSchema> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(null, (result) => {
        if (chrome.runtime.lastError) {
          logger.error('获取存储数据失败', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve({
            userPreferences: result.userPreferences as UserPreferences || DEFAULT_USER_PREFERENCES,
            priorityRules: result.priorityRules as PriorityRule[] || DEFAULT_PRIORITY_RULES,
            emailCache: result.emailCache as Record<string, CachedEmail> || {}
          });
        }
      });
    });
  }

  /**
   * 设置完整存储数据
   */
  public async setFullStorage(data: StorageSchema): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          logger.error('设置存储数据失败', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          logger.debug('存储数据已更新', data);
          resolve();
        }
      });
    });
  }

  /**
   * 获取用户偏好设置
   */
  public async getUserPreferences(): Promise<UserPreferences> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('userPreferences', (result) => {
        if (chrome.runtime.lastError) {
          logger.error('获取用户偏好设置失败', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.userPreferences as UserPreferences || DEFAULT_USER_PREFERENCES);
        }
      });
    });
  }

  /**
   * 更新用户偏好设置
   */
  public async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const currentPrefs = await this.getUserPreferences();
      const updatedPrefs = { ...currentPrefs, ...preferences };
      
      await new Promise<void>((resolve, reject) => {
        chrome.storage.sync.set({ userPreferences: updatedPrefs }, () => {
          if (chrome.runtime.lastError) {
            logger.error('更新用户偏好设置失败', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            logger.debug('用户偏好设置已更新', updatedPrefs);
            resolve();
          }
        });
      });
      
      return updatedPrefs;
    } catch (error) {
      logger.error('更新用户偏好设置失败', error);
      throw error;
    }
  }

  /**
   * 获取优先级规则
   */
  public async getPriorityRules(): Promise<PriorityRule[]> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get('priorityRules', (result) => {
        if (chrome.runtime.lastError) {
          logger.error('获取优先级规则失败', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(result.priorityRules as PriorityRule[] || DEFAULT_PRIORITY_RULES);
        }
      });
    });
  }

  /**
   * 更新优先级规则
   */
  public async updatePriorityRules(rules: PriorityRule[]): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ priorityRules: rules }, () => {
        if (chrome.runtime.lastError) {
          logger.error('更新优先级规则失败', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          logger.debug('优先级规则已更新', { rulesCount: rules.length });
          resolve();
        }
      });
    });
  }

  /**
   * 获取邮件缓存
   */
  public async getEmailCache(emailId: string): Promise<CachedEmail | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('emailCache', (result) => {
        if (chrome.runtime.lastError) {
          logger.error('获取邮件缓存失败', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          const cache = result.emailCache as Record<string, CachedEmail> || {};
          resolve(cache[emailId] || null);
        }
      });
    });
  }

  /**
   * 设置邮件缓存
   */
  public async setEmailCache(emailId: string, data: CachedEmail): Promise<void> {
    try {
      // 获取当前缓存
      const storage = await new Promise<Record<string, any>>((resolve, reject) => {
        chrome.storage.local.get('emailCache', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });

      // 更新缓存
      const emailCache = storage.emailCache as Record<string, CachedEmail> || {};
      emailCache[emailId] = {
        ...data,
        timestamp: Date.now() // 更新时间戳
      };

      // 清理过期缓存（超过7天的条目）
      const now = Date.now();
      const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7天
      const emailIds = Object.keys(emailCache);
      
      if (emailIds.length > 100) { // 如果缓存条目过多
        for (const id of emailIds) {
          const entry = emailCache[id];
          if (now - entry.timestamp > MAX_AGE) {
            delete emailCache[id];
          }
        }
      }

      // 保存更新后的缓存
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ emailCache }, () => {
          if (chrome.runtime.lastError) {
            logger.error('设置邮件缓存失败', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            logger.debug('邮件缓存已更新', { emailId, cacheSize: Object.keys(emailCache).length });
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error('设置邮件缓存失败', error);
      throw error;
    }
  }

  /**
   * 清理过期缓存
   */
  public async cleanupCache(): Promise<void> {
    try {
      // 获取当前缓存
      const storage = await new Promise<Record<string, any>>((resolve, reject) => {
        chrome.storage.local.get('emailCache', (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });

      // 清理过期缓存
      const emailCache = storage.emailCache as Record<string, CachedEmail> || {};
      const now = Date.now();
      const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7天
      let cleanedCount = 0;
      
      for (const id of Object.keys(emailCache)) {
        const entry = emailCache[id];
        if (now - entry.timestamp > MAX_AGE) {
          delete emailCache[id];
          cleanedCount++;
        }
      }

      // 保存更新后的缓存
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ emailCache }, () => {
          if (chrome.runtime.lastError) {
            logger.error('清理缓存失败', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            logger.info('缓存已清理', { cleanedCount, remainingCount: Object.keys(emailCache).length });
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error('清理缓存失败', error);
      throw error;
    }
  }
}

// 导出单例
export const storageService = new StorageService();