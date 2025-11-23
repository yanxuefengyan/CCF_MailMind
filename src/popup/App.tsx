import { useState, useEffect } from 'react';
import './App.css';

interface UserPreferences {
  language: 'zh-CN' | 'en-US';
  tone: 'formal' | 'casual' | 'friendly' | 'professional';
  enabled: boolean;
}

interface StatusInfo {
  status: string;
  version: string;
}

function App() {
  const [status, setStatus] = useState<StatusInfo>({ status: '正在检查...', version: '1.0.0' });
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'help'>('status');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    checkStatus();
    loadPreferences();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkInitStatus' });
      if (response && response.success) {
        setStatus(response.data);
      } else {
        setStatus({ status: '连接失败', version: '未知' });
      }
    } catch (error) {
      console.error('检查状态失败:', error);
      setStatus({ status: '发生错误', version: '未知' });
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getUserPreferences' });
      if (response && response.success) {
        setPreferences(response.data);
      }
    } catch (error) {
      console.error('获取用户偏好失败:', error);
    }
  };

  const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'updateUserPreferences',
        data: newPrefs
      });
      if (response && response.success) {
        setPreferences(response.data);
        showNotification('设置已保存', 'success');
      } else {
        showNotification('保存失败', 'error');
      }
    } catch (error) {
      console.error('更新用户偏好失败:', error);
      showNotification('保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    // 简单的通知实现，可以后续改进为更好的UI组件
    alert(`${type.toUpperCase()}: ${message}`);
  };

  const openEmailPage = (platform: 'gmail' | 'outlook') => {
    const urls = {
      gmail: 'https://mail.google.com',
      outlook: 'https://outlook.live.com'
    };
    chrome.tabs.create({ url: urls[platform] });
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>MailMind Assistant</h1>
        <p className="subtitle">智能邮件效率助手</p>
        <nav className="tabs">
          <button 
            className={`tab ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            状态
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            设置
          </button>
          <button 
            className={`tab ${activeTab === 'help' ? 'active' : ''}`}
            onClick={() => setActiveTab('help')}
          >
            帮助
          </button>
        </nav>
      </header>

      <main className="main">
        {activeTab === 'status' && (
          <>
            <section className="status-section">
              <div className="status-indicator">
                <span className={`status-dot ${status.status === '准备就绪' ? 'active' : ''}`}></span>
                <span className="status-text">{status.status}</span>
              </div>
              <div className="version-info">版本: {status.version}</div>
            </section>

            <section className="features-section">
              <h2>核心功能</h2>
              <div className="feature-grid">
                <div className="feature-card">
                  <h3>📝 智能邮件起草</h3>
                  <p>使用 // 命令触发智能起草功能</p>
                </div>
                <div className="feature-card">
                  <h3>📊 邮件内容分析</h3>
                  <p>智能分析优先级、情感和关键信息</p>
                </div>
                <div className="feature-card">
                  <h3>🏷️ 智能分类与优先级</h3>
                  <p>自动分类邮件并标记优先级</p>
                </div>
                <div className="feature-card">
                  <h3>✨ 语言优化建议</h3>
                  <p>提供语言改进和语气调整建议</p>
                </div>
              </div>
            </section>

            <section className="actions-section">
              <button className="button primary" onClick={() => openEmailPage('gmail')}>
                打开 Gmail
              </button>
              <button className="button secondary" onClick={() => openEmailPage('outlook')}>
                打开 Outlook
              </button>
            </section>
          </>
        )}

        {activeTab === 'settings' && preferences && (
          <section className="settings-section">
            <h2>偏好设置</h2>
            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.enabled}
                  onChange={(e) => updatePreferences({ enabled: e.target.checked })}
                  disabled={loading}
                />
                启用智能助手
              </label>
            </div>
            <div className="setting-group">
              <label>语言偏好</label>
              <select 
                value={preferences.language}
                onChange={(e) => updatePreferences({ language: e.target.value as 'zh-CN' | 'en-US' })}
                disabled={loading}
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
            <div className="setting-group">
              <label>默认语气</label>
              <select 
                value={preferences.tone}
                onChange={(e) => updatePreferences({ tone: e.target.value as UserPreferences['tone'] })}
                disabled={loading}
              >
                <option value="professional">专业</option>
                <option value="formal">正式</option>
                <option value="friendly">友好</option>
                <option value="casual">随意</option>
              </select>
            </div>
            {loading && <p>保存中...</p>}
          </section>
        )}

        {activeTab === 'help' && (
          <section className="help-section">
            <h2>使用帮助</h2>
            <div className="help-content">
              <h3>快速开始</h3>
              <ol>
                <li>确保扩展已启用并显示"准备就绪"状态。</li>
                <li>打开 Gmail 或 Outlook 网页版。</li>
                <li>在撰写新邮件时，查找工具栏上的 "🤖 智能助手" 按钮。</li>
                <li>点击按钮使用各种智能功能。</li>
              </ol>
              <h3>快捷键</h3>
              <ul>
                <li><code>//</code> - 触发智能起草功能</li>
                <li>右键选中文本 - 快速分析或生成摘要</li>
              </ul>
              <h3>注意事项</h3>
              <ul>
                <li>首次使用需要在设置中配置偏好。</li>
                <li>AI 生成的内容仅供参考，请根据实际情况修改。</li>
                <li>如遇问题，请刷新页面或重启浏览器。</li>
              </ul>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>由 Zulu智能体 + 百度文心大模型 提供技术支持</p>
        <p className="version">版本 {status.version}</p>
      </footer>
    </div>
  );
}

export default App;