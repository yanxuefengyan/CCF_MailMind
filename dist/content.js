/**
 * MailMind Assistant - 内容脚本
 * 负责与页面交互和用户界面注入
 */

console.log('MailMind Assistant 内容脚本已加载');

function injectAssistantButton() {
  const composeArea = document.querySelector('div[role="textbox"]');
  if (composeArea && !document.querySelector('button.mailmind-assistant-button')) {
    const button = document.createElement('button');
    button.textContent = '🤖 智能助手';
    button.className = 'mailmind-assistant-button';
    button.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      background-color: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      z-index: 1000;
    `;
    button.onclick = openAssistantMenu;
    const container = composeArea.closest('form') || composeArea.parentElement;
    container.style.position = 'relative';
    container.appendChild(button);
    console.log('MailMind Assistant 按钮已注入');
  }
}

// 打开助手菜单
function openAssistantMenu() {
  const menu = document.createElement('div');
  menu.style.cssText = `
    position: absolute;
    top: 40px;
    right: 10px;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
    z-index: 1000;
  `;
  
  const options = [
    { text: '智能起草', action: draftEmail },
    { text: '邮件分析', action: analyzeEmail },
    { text: '生成摘要', action: summarizeEmail },
    { text: '语言优化', action: improveLanguage }
  ];
  
  options.forEach(option => {
    const button = document.createElement('button');
    button.textContent = option.text;
    button.style.cssText = `
      display: block;
      width: 100%;
      padding: 5px 10px;
      margin-bottom: 5px;
      background-color: #f0f0f0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    button.onclick = () => {
      option.action();
      document.body.removeChild(menu);
    };
    menu.appendChild(button);
  });
  
  document.body.appendChild(menu);
}

// 智能起草
function draftEmail() {
  const instruction = prompt('请输入起草指令：');
  if (instruction) {
    console.log('发送起草邮件请求:', instruction);
    chrome.runtime.sendMessage({
      action: 'draftEmail',
      data: { instruction }
    }, response => {
      console.log('收到起草邮件响应:', response);
      if (response && response.success) {
        setComposeContent(response.data.content);
        alert('邮件已生成！');
      } else {
        alert('邮件起草失败，请重试。');
      }
    });
  }
}

// 邮件分析
function analyzeEmail() {
  const content = getComposeContent();
  if (!content) {
    alert('请先在编辑器中输入一些内容再进行分析。');
    return;
  }
  
  console.log('发送邮件分析请求:', content);
  chrome.runtime.sendMessage({
    action: 'analyzeEmail',
    data: { content }
  }, response => {
    console.log('收到邮件分析响应:', response);
    if (response && response.success) {
      showAnalysisResult(response.data);
    } else {
      alert('邮件分析失败，请重试。');
    }
  });
}

// 生成摘要
function summarizeEmail() {
  const content = getComposeContent();
  if (!content) {
    alert('请先在编辑器中输入一些内容再生成摘要。');
    return;
  }
  
  console.log('发送摘要生成请求:', content);
  chrome.runtime.sendMessage({
    action: 'summarizeEmail',
    data: { content }
  }, response => {
    console.log('收到摘要生成响应:', response);
    if (response && response.success) {
      showSummary(response.data.summary);
    } else {
      alert('摘要生成失败，请重试。');
    }
  });
}

// 语言优化
function improveLanguage() {
  const content = getComposeContent();
  if (!content) {
    alert('请先在编辑器中输入一些内容再进行优化。');
    return;
  }
  
  console.log('发送语言优化请求:', content);
  chrome.runtime.sendMessage({
    action: 'draftEmail',
    data: { instruction: '优化以下邮件内容的语言表达：\n\n' + content }
  }, response => {
    console.log('收到语言优化响应:', response);
    if (response && response.success) {
      setComposeContent(response.data.content);
      alert('语言已优化！');
    } else {
      alert('语言优化失败，请重试。');
    }
  });
}

// 获取编辑器内容
function getComposeContent() {
  const composeArea = document.querySelector('div[role="textbox"]');
  return composeArea ? composeArea.textContent : '';
}

// 设置编辑器内容
function setComposeContent(content) {
  const composeArea = document.querySelector('div[role="textbox"]');
  if (composeArea) {
    // 清空现有内容
    composeArea.innerHTML = '';
    // 设置新内容
    composeArea.textContent = content;
    // 触发输入事件以通知页面内容已更改
    composeArea.dispatchEvent(new Event('input', { bubbles: true }));
    composeArea.focus();
    console.log('邮件内容已设置:', content.substring(0, 50) + '...');
  } else {
    console.error('未找到编辑器区域');
  }
}

// 显示分析结果
function showAnalysisResult(result) {
  const resultDiv = document.createElement('div');
  resultDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
    z-index: 1000;
  `;
  
  resultDiv.innerHTML = `
    <h3>邮件分析结果</h3>
    <p><strong>类别：</strong>${result.category}</p>
    <p><strong>情感：</strong>${result.sentiment}</p>
    <p><strong>优先级：</strong>${result.priority.level} (分数: ${result.priority.score})</p>
    <p><strong>原因：</strong>${result.priority.reasons.join(', ')}</p>
    <p><strong>行动项：</strong>${result.actionItems.join(', ')}</p>
    <p><strong>标签：</strong>${result.tags.join(', ')}</p>
    <button id="closeAnalysis">关闭</button>
  `;
  
  document.body.appendChild(resultDiv);
  
  document.getElementById('closeAnalysis').onclick = () => {
    document.body.removeChild(resultDiv);
  };
}

// 显示摘要
function showSummary(summary) {
  const summaryDiv = document.createElement('div');
  summaryDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
    z-index: 1000;
  `;
  
  summaryDiv.innerHTML = `
    <h3>邮件摘要</h3>
    <p>${summary}</p>
    <button id="closeSummary">关闭</button>
  `;
  
  document.body.appendChild(summaryDiv);
  
  document.getElementById('closeSummary').onclick = () => {
    document.body.removeChild(summaryDiv);
  };
}

// 监听页面变化，注入按钮
function checkAndInjectButton() {
  const composeArea = document.querySelector('div[role="textbox"]');
  if (composeArea && !document.querySelector('button.mailmind-assistant-button')) {
    injectAssistantButton();
  }
}

// 初始检查
checkAndInjectButton();

// 设置定期检查
setInterval(checkAndInjectButton, 1000);

// MutationObserver as a fallback
const observer = new MutationObserver(checkAndInjectButton);
observer.observe(document.body, { childList: true, subtree: true });

// 处理来自背景脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contextMenuAction') {
    if (message.type === 'analyze') {
      chrome.runtime.sendMessage({
        action: 'analyzeEmail',
        data: { content: message.text }
      }, response => {
        if (response.success) {
          showAnalysisResult(response.data);
        } else {
          alert('邮件分析失败，请重试。');
        }
      });
    } else if (message.type === 'summarize') {
      chrome.runtime.sendMessage({
        action: 'summarizeEmail',
        data: { content: message.text }
      }, response => {
        if (response.success) {
          showSummary(response.data.summary);
        } else {
          alert('摘要生成失败，请重试。');
        }
      });
    }
  }
});

console.log('MailMind Assistant 内容脚本初始化完成');