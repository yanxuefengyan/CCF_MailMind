/**
 * MailMind Assistant - 内容脚本
 * 负责与页面交互和用户界面注入
 */

console.log('MailMind Assistant 内容脚本已加载');

// 注入智能助手按钮
function injectAssistantButton() {
  const composeArea = document.querySelector('div[role="textbox"]');
  if (composeArea) {
    const button = document.createElement('button');
    button.textContent = '🤖 智能助手';
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
    `;
    button.onclick = openAssistantMenu;
    composeArea.parentElement.style.position = 'relative';
    composeArea.parentElement.appendChild(button);
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
    chrome.runtime.sendMessage({
      action: 'draftEmail',
      data: { instruction }
    }, response => {
      if (response.success) {
        setComposeContent(response.data.content);
      } else {
        alert('邮件起草失败，请重试。');
      }
    });
  }
}

// 邮件分析
function analyzeEmail() {
  const content = getComposeContent();
  chrome.runtime.sendMessage({
    action: 'analyzeEmail',
    data: { content }
  }, response => {
    if (response.success) {
      showAnalysisResult(response.data);
    } else {
      alert('邮件分析失败，请重试。');
    }
  });
}

// 生成摘要
function summarizeEmail() {
  const content = getComposeContent();
  chrome.runtime.sendMessage({
    action: 'summarizeEmail',
    data: { content }
  }, response => {
    if (response.success) {
      showSummary(response.data.summary);
    } else {
      alert('摘要生成失败，请重试。');
    }
  });
}

// 语言优化
function improveLanguage() {
  const content = getComposeContent();
  chrome.runtime.sendMessage({
    action: 'draftEmail',
    data: { instruction: '优化以下邮件内容的语言表达：\n\n' + content }
  }, response => {
    if (response.success) {
      setComposeContent(response.data.content);
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
    composeArea.textContent = content;
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
const observer = new MutationObserver(() => {
  if (!document.querySelector('button:contains("?? 智能助手")')) {
    injectAssistantButton();
  }
});

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