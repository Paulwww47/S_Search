let engineList = document.getElementById('engineList');
let addButton = document.getElementById('addEngine');
let positionSelect = document.getElementById('position');
let statusElement = document.getElementById('status');
let draggedItem = null;

// 显示状态消息
function showStatus(message, type = 'success') {
  statusElement.textContent = message;
  statusElement.className = `status show ${type}`;
  setTimeout(() => {
    statusElement.className = 'status';
  }, 2000);
}

// 创建搜索引擎项
function createEngineItem(engine, index, total) {
  const item = document.createElement('div');
  item.className = 'engine-item';
  // 默认不可拖动
  item.setAttribute('draggable', 'false');
  
  item.innerHTML = `
    <div class="drag-handle">⋮⋮</div>
    <input type="text" class="name" value="${engine.name}" placeholder="搜索引擎名称">
    <input type="text" class="url" value="${engine.url}" placeholder="搜索URL (例如: https://www.google.com/search?q=)">
    <div class="engine-controls">
      <button class="btn icon delete" title="删除">×</button>
    </div>
  `;

  const dragHandle = item.querySelector('.drag-handle');
  
  // 当鼠标按下拖动手柄时启用拖动
  dragHandle.addEventListener('mousedown', () => {
    item.setAttribute('draggable', 'true');
  });

  // 当鼠标释放时禁用拖动
  document.addEventListener('mouseup', () => {
    item.setAttribute('draggable', 'false');
  });

  // 拖动开始
  item.addEventListener('dragstart', (e) => {
    draggedItem = item;
    item.classList.add('dragging');
    // 设置拖动效果
    e.dataTransfer.effectAllowed = 'move';
    // 设置拖动数据
    e.dataTransfer.setData('text/plain', index.toString());
  });

  // 拖动结束
  item.addEventListener('dragend', () => {
    item.classList.remove('dragging');
    draggedItem = null;
    saveSettings();
  });

  // 拖动经过其他元素
  item.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedItem || draggedItem === item) return;

    const rect = item.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (e.clientY < midY) {
      if (item.previousElementSibling !== draggedItem) {
        engineList.insertBefore(draggedItem, item);
      }
    } else {
      if (item.nextElementSibling !== draggedItem) {
        engineList.insertBefore(draggedItem, item.nextElementSibling);
      }
    }
  });

  // 防止输入框触发拖动
  item.querySelectorAll('input').forEach(input => {
    input.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      item.setAttribute('draggable', 'false');
    });
  });

  return item;
}

// 渲染搜索引擎列表
function renderEngineList(engines) {
  engineList.innerHTML = '';
  engines.forEach((engine, index) => {
    const item = createEngineItem(engine, index, engines.length);
    engineList.appendChild(item);
  });
}

// 获取当前搜索引擎列表
function getCurrentEngines() {
  const engines = [];
  document.querySelectorAll('.engine-item').forEach(item => {
    const nameInput = item.querySelector('.name');
    const urlInput = item.querySelector('.url');
    if (nameInput.value && urlInput.value) {
      engines.push({
        name: nameInput.value,
        url: urlInput.value
      });
    }
  });
  return engines;
}

// 保存设置
function saveSettings() {
  const engines = getCurrentEngines();
  chrome.storage.sync.set({ 
    searchEngines: engines,
    sidebarPosition: positionSelect.value 
  }, () => {
    showStatus('设置已保存');
  });
}

// 加载设置
function loadSettings() {
  chrome.storage.sync.get(['searchEngines', 'sidebarPosition'], (result) => {
    const engines = result.searchEngines || [
      { name: 'Google', url: 'https://www.google.com/search?q=' },
      { name: 'Bing', url: 'https://www.bing.com/search?q=' },
      { name: '百度', url: 'https://www.baidu.com/s?wd=' }
    ];
    
    positionSelect.value = result.sidebarPosition || 'right';
    renderEngineList(engines);
  });
}

// 事件监听
addButton.addEventListener('click', () => {
  const engines = getCurrentEngines();
  engines.push({ name: '', url: '' });
  renderEngineList(engines);
});

engineList.addEventListener('click', (e) => {
  const target = e.target;
  const item = target.closest('.engine-item');
  
  if (target.classList.contains('delete')) {
    item.remove();
    saveSettings();
  }
});

engineList.addEventListener('input', () => {
  saveSettings();
});

positionSelect.addEventListener('change', () => {
  saveSettings();
});

// 移除这个全局的 dragover 事件监听器，因为我们已经在每个项目上添加了监听器
engineList.removeEventListener('dragover', engineList._dragoverHandler);

// 初始化
document.addEventListener('DOMContentLoaded', loadSettings); 