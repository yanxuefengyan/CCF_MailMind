// MailMind Assistant - Popup脚本

document.addEventListener('DOMContentLoaded', function() {
  // 绑定Gmail按钮
  document.getElementById('openGmail').addEventListener('click', function() {
    chrome.runtime.sendMessage({
      action: "openUrl", 
      url: "https://mail.google.com"
    });
  });
  
  // 绑定Outlook按钮
  document.getElementById('openOutlook').addEventListener('click', function() {
    chrome.runtime.sendMessage({
      action: "openUrl", 
      url: "https://outlook.live.com"
    });
  });
});
