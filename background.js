// 监听扩展安装或更新
chrome.runtime.onInstalled.addListener(() => {
  // 初始化默认设置
  chrome.storage.sync.get(['searchEngines', 'sidebarPosition'], (result) => {
    if (!result.searchEngines) {
      chrome.storage.sync.set({
        searchEngines: [
          { name: 'Google', url: 'https://www.google.com/search?q=' },
          { name: 'Bing', url: 'https://www.bing.com/search?q=' },
          { name: '百度', url: 'https://www.baidu.com/s?wd=' }
        ]
      });
    }
    
    if (!result.sidebarPosition) {
      chrome.storage.sync.set({
        sidebarPosition: 'right'
      });
    }
  });
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request); // 调试用
  
  if (request.type === 'openSearch') {
    chrome.tabs.create({
      url: request.url,
      active: true
    }).catch(error => {
      console.error('Failed to open tab:', error);
    });
  }
  
  // 必须返回 true 以支持异步响应
  return true;
}); 