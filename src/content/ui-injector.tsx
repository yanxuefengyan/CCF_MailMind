/**
 * UI注入器 - 在邮件页面注入智能功能界面
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { logger } from '@/shared/utils/logger';

// 智能助手按钮组件
const SmartAssistantButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
}> = ({ onClick, isActive }) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? '#40a9ff' : '#1890ff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
        margin: '0 4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      <span style={{ fontSize: '14px' }}>🤖</span>
      <span>智能助手</span>
    </button>
  );
};

// 功能菜单组件
const FunctionMenu: React.FC<{
  onClose: () => void;
  onAction: (action: string) => void;
  position: { x: number; y: number };
}> = ({ onClose, onAction, position }) => {
  const menuItems = [
    { key: 'draft', label: '智能起草', icon: '✍️' },
    { key: 'analyze', label: '邮件分析', icon: '📊' },
    { key: 'summarize', label: '生成摘要', icon: '📝' },
    { key: 'improve', label: '语言优化', icon: '✨' },
  ];

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.mailmind-menu')) {
        onClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div
      className="mailmind-menu"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        background: 'white',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10000,
        minWidth: '180px',
        overflow: 'hidden'
      }}
    >
      {menuItems.map((item) => (
        <div
          key={item.key}
          onClick={() => {
            onAction(item.key);
            onClose();
          }}
          style={{
            padding: '12px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f7ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// 加载状态组件
const LoadingIndicator: React.FC<{ message?: string }> = ({ message = '正在处理...' }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: '#f0f7ff',
        border: '1px solid #d6e4ff',
        borderRadius: '4px',
        fontSize: '13px',
        color: '#1890ff',
        margin: '8px 0'
      }}
    >
      <div
        style={{
          width: '12px',
          height: '12px',
          border: '2px solid #e8e8e8',
          borderTop: '2px solid #1890ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <span>{message}</span>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

/**
 * UI注入器类
 */
export class UIInjector {
  private platform: 'gmail' | 'outlook' | 'unknown' = 'unknown';
  private injectedElements: Map<Element, ReactDOM.Root> = new Map();
  private activeMenu: (() => void) | null = null;

  constructor(platform: 'gmail' | 'outlook' | 'unknown') {
    this.platform = platform;
  }

  /**
   * 为邮件编辑器注入智能功能按钮
   */
  public injectSmartButton(editorElement: Element, onAction: (action: string, context: any) => void): void {
    // 查找合适的注入位置
    const toolbar = this.findToolbar(editorElement);
    if (!toolbar) {
      logger.warn('未找到工具栏，无法注入智能按钮');
      return;
    }

    // 检查是否已经注入
    if (toolbar.querySelector('.mailmind-smart-button')) {
      return;
    }

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mailmind-smart-button';
    buttonContainer.style.display = 'inline-flex';
    buttonContainer.style.alignItems = 'center';

    // 使用React渲染按钮
    const root = ReactDOM.createRoot(buttonContainer);
    this.injectedElements.set(buttonContainer, root);

    root.render(
      <SmartAssistantButton
        onClick={(event) => this.handleButtonClick(event, editorElement, onAction)}
        isActive={false}
      />
    );

    // 添加到工具栏
    toolbar.appendChild(buttonContainer);
    logger.debug('智能按钮已注入');
  }

  /**
   * 处理智能按钮点击
   */
  private handleButtonClick = (event: any, editorElement: Element, onAction: (action: string, context: any) => void): void => {
    event.preventDefault();
    event.stopPropagation();

    // 关闭现有菜单
    if (this.activeMenu) {
      this.activeMenu();
      this.activeMenu = null;
    }

    // 获取按钮位置
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: buttonRect.left,
      y: buttonRect.bottom + 4
    };

    // 创建菜单容器
    const menuContainer = document.createElement('div');
    document.body.appendChild(menuContainer);

    const root = ReactDOM.createRoot(menuContainer);
    this.injectedElements.set(menuContainer, root);

    const closeMenu = () => {
      root.unmount();
      this.injectedElements.delete(menuContainer);
      document.body.removeChild(menuContainer);
      this.activeMenu = null;
    };

    this.activeMenu = closeMenu;

    // 渲染菜单
    root.render(
      <FunctionMenu
        position={position}
        onClose={closeMenu}
        onAction={(action) => {
          const context = this.getEditorContext(editorElement);
          onAction(action, context);
        }}
      />
    );
  };

  /**
   * 显示加载状态
   */
  public showLoading(editorElement: Element, message?: string): Element {
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'mailmind-loading';

    const root = ReactDOM.createRoot(loadingContainer);
    this.injectedElements.set(loadingContainer, root);

    root.render(<LoadingIndicator message={message} />);

    // 插入到编辑器附近
    if (editorElement.parentNode) {
      editorElement.parentNode.insertBefore(loadingContainer, editorElement.nextSibling);
    }

    return loadingContainer;
  }

  /**
   * 隐藏加载状态
   */
  public hideLoading(loadingElement: Element): void {
    const root = this.injectedElements.get(loadingElement);
    if (root) {
      root.unmount();
      this.injectedElements.delete(loadingElement);
    }
    
    if (loadingElement.parentNode) {
      loadingElement.parentNode.removeChild(loadingElement);
    }
  }

  /**
   * 注入邮件分析结果
   */
  public injectAnalysisResult(
    targetElement: Element,
    analysis: {
      priority?: { level: string; score: number; reasons: string[] };
      category?: string;
      summary?: string;
    }
  ): void {
    // 创建分析结果容器
    const resultContainer = document.createElement('div');
    resultContainer.className = 'mailmind-analysis-result';
    resultContainer.style.cssText = `
      margin: 8px 0;
      padding: 12px;
      background: #f8f9fa;
      border-left: 4px solid #1890ff;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.4;
    `;

    let content = '<div style="font-weight: 500; color: #1890ff; margin-bottom: 8px;">📊 智能分析结果</div>';

    if (analysis.priority) {
      const priorityColor = analysis.priority.level === 'high' ? '#f5222d' : 
                           analysis.priority.level === 'medium' ? '#faad14' : '#52c41a';
      content += `<div><strong>优先级:</strong> <span style="color: ${priorityColor};">${analysis.priority.level.toUpperCase()}</span> (${Math.round(analysis.priority.score * 100)}%)</div>`;
    }

    if (analysis.category) {
      content += `<div><strong>分类:</strong> ${analysis.category}</div>`;
    }

    if (analysis.summary) {
      content += `<div style="margin-top: 8px;"><strong>摘要:</strong> ${analysis.summary}</div>`;
    }

    resultContainer.innerHTML = content;

    // 插入到目标元素附近
    if (targetElement.parentNode) {
      targetElement.parentNode.insertBefore(resultContainer, targetElement.nextSibling);
    }

    // 3秒后自动淡出
    setTimeout(() => {
      resultContainer.style.transition = 'opacity 0.5s ease';
      resultContainer.style.opacity = '0.7';
    }, 3000);
  }

  /**
   * 查找工具栏位置
   */
  private findToolbar(editorElement: Element): Element | null {
    // Gmail工具栏查找
    if (this.platform === 'gmail') {
      // 查找撰写对话框中的工具栏
      const dialog = editorElement.closest('div[role="dialog"]');
      if (dialog) {
        const toolbar = dialog.querySelector('div[role="toolbar"]') || 
                       dialog.querySelector('.Am.Al.editable') ||
                       dialog.querySelector('.aA6');
        if (toolbar) return toolbar;
      }
    }

    // Outlook工具栏查找
    if (this.platform === 'outlook') {
      const composeArea = editorElement.closest('[aria-label*="Compose"]');
      if (composeArea) {
        const toolbar = composeArea.querySelector('[role="toolbar"]') ||
                       composeArea.querySelector('.compose-toolbar');
        if (toolbar) return toolbar;
      }
    }

    // 通用查找方法
    let parent = editorElement.parentElement;
    while (parent) {
      const toolbar = parent.querySelector('[role="toolbar"]') ||
                     parent.querySelector('.toolbar') ||
                     parent.querySelector('[class*="toolbar"]');
      if (toolbar) return toolbar;
      parent = parent.parentElement;
    }

    return null;
  }

  /**
   * 获取编辑器上下文信息
   */
  private getEditorContext(editorElement: Element): any {
    const context: any = {
      platform: this.platform,
      editorElement
    };

    // 尝试获取现有内容
    const textContent = editorElement.textContent || '';
    if (textContent.trim()) {
      context.existingContent = textContent;
    }

    // 尝试获取HTML内容（用于富文本编辑器）
    if (editorElement instanceof HTMLElement) {
      context.existingHTML = editorElement.innerHTML;
    }

    return context;
  }

  /**
   * 清理所有注入的UI元素
   */
  public cleanup(): void {
    this.injectedElements.forEach((root, element) => {
      try {
        root.unmount();
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      } catch (error) {
        logger.warn('清理UI元素时出错', error);
      }
    });

    this.injectedElements.clear();

    if (this.activeMenu) {
      this.activeMenu();
      this.activeMenu = null;
    }
  }
}