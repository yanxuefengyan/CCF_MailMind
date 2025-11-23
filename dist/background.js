/**
 * MailMind Assistant - 背景服务脚本
 * 处理与Zulu智能体的交互和数据管理
 */

// 用户偏好默认值
const DEFAULT_PREFERENCES = {
  language: 'zh-CN',
  tone: 'professional',
  enabled: true
};

// 存储用户偏好
let userPreferences = DEFAULT_PREFERENCES;

// 初始化扩展
function initializeExtension() {
  console.log('MailMind Assistant 初始化中...');
  
  // 加载用户设置
  chrome.storage.sync.get(['userPreferences'], (result) => {
    if (result.userPreferences) {
      userPreferences = result.userPreferences;
    } else {
      // 如果没有保存的设置，保存默认设置
      chrome.storage.sync.set({ userPreferences: DEFAULT_PREFERENCES });
    }
  });
  
  // 设置右键菜单
  chrome.contextMenus.create({
    id: 'mailmind-analyze',
    title: '使用MailMind分析',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'mailmind-summarize',
    title: '使用MailMind生成摘要',
    contexts: ['selection']
  });
  
  // 注册右键菜单点击处理
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'mailmind-analyze' || info.menuItemId === 'mailmind-summarize') {
      // 向内容脚本发送消息
      chrome.tabs.sendMessage(tab.id, {
        action: 'contextMenuAction',
        type: info.menuItemId === 'mailmind-analyze' ? 'analyze' : 'summarize',
        text: info.selectionText
      });
    }
  });

  console.log('MailMind Assistant 已初始化');
}

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message.action);
  
  switch(message.action) {
    case 'openUrl':
      // 打开新标签页
      chrome.tabs.create({ url: message.url });
      sendResponse({ success: true });
      break;
      
    case 'checkInitStatus':
      sendResponse({
        success: true,
        data: {
          status: '准备就绪',
          version: '1.0.0'
        }
      });
      break;
      
    case 'getUserPreferences':
      sendResponse({
        success: true,
        data: userPreferences
      });
      break;
      
    case 'updateUserPreferences':
      // 更新用户偏好
      userPreferences = {...userPreferences, ...message.data};
      chrome.storage.sync.set({ userPreferences });
      
      sendResponse({
        success: true,
        data: userPreferences
      });
      break;
      
    case 'draftEmail':
      // 模拟调用AI生成邮件内容
      setTimeout(() => {
        const response = {
          success: true,
          data: {
            subject: message.data.subject || '关于您的咨询',
            content: generateEmailContent(message.data.instruction)
          }
        };
        sendResponse(response);
      }, 500);
      return true; // 保持消息通道开放，用于异步响应
      
    case 'analyzeEmail':
      // 模拟分析邮件
      setTimeout(() => {
        const response = {
          success: true,
          data: {
            category: '工作相关',
            sentiment: '中性',
            priority: {
              level: 'medium',
              score: 0.65,
              reasons: ['含有工作相关内容', '需要回复']
            },
            actionItems: ['准备回复', '查阅相关资料'],
            tags: ['工作', '咨询', '需回复']
          }
        };
        sendResponse(response);
      }, 500);
      return true; // 保持消息通道开放
      
    case 'summarizeEmail':
      // 模拟生成邮件摘要
      setTimeout(() => {
        sendResponse({
          success: true,
          data: {
            summary: '这是一封关于项目进度的邮件，要求在本周五前完成相关任务并提交报告。'
          }
        });
      }, 500);
      return true; // 保持消息通道开放
  }
});

// 模拟AI生成邮件内容
function generateEmailContent(instruction) {
  if (instruction.includes('会议')) {
    return `尊敬的团队成员：\n\n关于下周的项目进度会议，请于周三上午10点准时参加。\n\n会议议程：\n1. 项目进度报告\n2. 问题讨论\n3. 下一步计划\n\n请提前准备好您的工作报告。\n\n谢谢！\n管理团队`;
  } else {
    return `尊敬的用户：\n\n感谢您的咨询。我们已经收到您的请求，并将尽快处理。\n\n如有任何问题，请随时联系我们。\n\n此致\n敬礼`;
  }
}

// 扩展安装或更新时初始化
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('MailMind Assistant 已安装');
  } else if (details.reason === 'update') {
    console.log('MailMind Assistant 已更新');
  }
  
  initializeExtension();
});
