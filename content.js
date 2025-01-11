let searchEngines = [];
let sidebarPosition = 'right';

// 创建侧边栏
function createSidebar() {
  // 移除已存在的元素
  const existingSidebar = document.querySelector('.quick-search-sidebar');
  const existingMenu = document.querySelector('.quick-search-menu');
  const existingTrackArea = document.querySelector('.quick-search-track-area');
  if (existingSidebar) existingSidebar.remove();
  if (existingMenu) existingMenu.remove();
  if (existingTrackArea) existingTrackArea.remove();

  const sidebar = document.createElement('div');
  sidebar.className = `quick-search-sidebar ${sidebarPosition}`;
  
  const menu = document.createElement('div');
  menu.className = `quick-search-menu ${sidebarPosition}`;
  
  // 添加拖动功能
  let isDragging = false;
  let startY = 0;
  let startTop = 0;

  // 创建鼠标跟踪区域
  const mouseTrackArea = document.createElement('div');
  mouseTrackArea.className = 'quick-search-track-area';
  
  // 更新跟踪区域位置的函数
  function updateTrackAreaPosition(top, menuHeight) {
    // 计算图标和跟踪区域应该在的位置
    // 使图标垂直居中于菜单
    const iconTop = top + (menuHeight / 2) - 20; // 20 是图标的一半高度
    
    mouseTrackArea.style.cssText = `
      position: fixed;
      top: ${iconTop}px;
      width: 60px;
      height: 100px;
      z-index: 2147483639;
      ${sidebarPosition}: 0;
      background: transparent;
      pointer-events: auto;
    `;
    
    // 同时更新图标位置
    sidebar.style.top = `${iconTop}px`;
    sidebar.style.transform = 'none';
  }

  // 获取保存的位置
  chrome.storage.sync.get('sidebarTop', (result) => {
    if (result.sidebarTop !== undefined) {
      const top = result.sidebarTop;
      menu.style.top = `${top}px`;
      menu.style.transform = 'none';
      updateTrackAreaPosition(top, menu.offsetHeight);
    } else {
      // 默认位置在中间
      const middleTop = (window.innerHeight - menu.offsetHeight) / 2;
      menu.style.top = `${middleTop}px`;
      menu.style.transform = 'none';
      updateTrackAreaPosition(middleTop, menu.offsetHeight);
    }
  });

  // 在菜单上添加拖动事件
  menu.addEventListener('mousedown', (e) => {
    // 如果点击的是菜单项，不触发拖动
    if (e.target.closest('.quick-search-item')) return;
    
    isDragging = true;
    startY = e.clientY;
    startTop = menu.offsetTop;
    menu.classList.add('dragging');
    
    // 防止文本选择
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - startY;
    const newTop = startTop + deltaY;
    
    // 限制拖动范围，确保菜单不会超出视口
    const maxTop = window.innerHeight - menu.offsetHeight;
    const boundedTop = Math.max(0, Math.min(newTop, maxTop));
    
    // 更新所有元素的位置
    menu.style.top = `${boundedTop}px`;
    menu.style.transform = 'none';
    updateTrackAreaPosition(boundedTop, menu.offsetHeight);
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    
    isDragging = false;
    menu.classList.remove('dragging');
    
    // 保存菜单位置
    const newTop = menu.offsetTop;
    chrome.storage.sync.set({
      sidebarTop: newTop
    });
  });

  const icon = document.createElement('div');
  icon.className = 'quick-search-icon';
  icon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" 
        stroke="#4285f4" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"/>
      <path d="M21 21L16.65 16.65" 
        stroke="#4285f4" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"/>
    </svg>
  `;
  
  sidebar.appendChild(icon);
  document.body.appendChild(sidebar);
  document.body.appendChild(menu);
  
  // 简化事件监听，直接添加/移除类
  mouseTrackArea.addEventListener('mouseenter', () => {
    menu.classList.add('show');
  });

  menu.addEventListener('mouseenter', () => {
    menu.classList.add('show');
  });

  // 统一处理鼠标离开事件
  const handleMouseLeave = (e) => {
    const menuRect = menu.getBoundingClientRect();
    const trackRect = mouseTrackArea.getBoundingClientRect();
    
    // 检查鼠标是否真的离开了整个区域
    if (!(e.clientX >= menuRect.left && e.clientX <= menuRect.right && 
          e.clientY >= menuRect.top && e.clientY <= menuRect.bottom) &&
        !(e.clientX >= trackRect.left && e.clientX <= trackRect.right && 
          e.clientY >= trackRect.top && e.clientY <= trackRect.bottom)) {
      menu.classList.remove('show');
    }
  };

  mouseTrackArea.addEventListener('mouseleave', handleMouseLeave);
  menu.addEventListener('mouseleave', handleMouseLeave);

  document.body.appendChild(mouseTrackArea);
  return { sidebar, menu };
}

// 更新搜索引擎列表
function updateSearchEngines(engines) {
  const menu = document.querySelector('.quick-search-menu');
  if (!menu) return;
  
  menu.innerHTML = '';
  
  engines.forEach((engine) => {
    const item = document.createElement('div');
    item.className = 'quick-search-item';
    item.innerHTML = `
      <span>${engine.name}</span>
    `;
    
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const selectedText = window.getSelection().toString().trim();
      
      if (selectedText) {
        const searchUrl = `${engine.url}${encodeURIComponent(selectedText)}`;
        window.open(searchUrl, '_blank');
        menu.classList.remove('show');
      }
    });
    
    menu.appendChild(item);
  });
}

// 初始化
function initialize() {
  // 确保 DOM 完全加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAfterLoad);
  } else {
    initializeAfterLoad();
  }
}

function initializeAfterLoad() {
  chrome.storage.sync.get(['searchEngines', 'sidebarPosition']).then(result => {
    // 使用默认搜索引擎，如果storage中没有的话
    searchEngines = result.searchEngines || [
      { name: 'Google', url: 'https://www.google.com/search?q=' },
      { name: 'Bing', url: 'https://www.bing.com/search?q=' },
      { name: '百度', url: 'https://www.baidu.com/s?wd=' }
    ];
    
    sidebarPosition = result.sidebarPosition || 'right';
    
    // 创建并插入侧边栏
    const { sidebar, menu } = createSidebar();
    document.body.appendChild(sidebar);
    
    // 更新搜索引擎列表
    updateSearchEngines(searchEngines);
    
    // 如果是首次加载，保存默认设置
    if (!result.searchEngines) {
      chrome.storage.sync.set({ searchEngines });
    }
  }).catch(error => {
    console.error('初始化失败:', error);
  });
}

// 监听存储变化
chrome.storage.onChanged.addListener((changes) => {
  if (changes.searchEngines) {
    searchEngines = changes.searchEngines.newValue;
    updateSearchEngines(searchEngines);
  }
  
  if (changes.sidebarPosition) {
    sidebarPosition = changes.sidebarPosition.newValue;
    // 重新创建侧边栏以更新位置
    createSidebar();
    updateSearchEngines(searchEngines);
  }
});

// 启动初始化
initialize(); 