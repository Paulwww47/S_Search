let searchEngines = [];
let sidebarPosition = "right";

// 创建侧边栏
function createSidebar() {
  // 移除已存在的元素
  const existingSidebar = document.querySelector(".quick-search-sidebar");
  const existingMenu = document.querySelector(".quick-search-menu");
  const existingTrackArea = document.querySelector(".quick-search-track-area");
  if (existingSidebar) existingSidebar.remove();
  if (existingMenu) existingMenu.remove();
  if (existingTrackArea) existingTrackArea.remove();

  const sidebar = document.createElement("div");
  sidebar.className = `quick-search-sidebar ${sidebarPosition}`;

  const menu = document.createElement("div");
  menu.className = `quick-search-menu ${sidebarPosition}`;

  // 添加拖动功能
  let isDragging = false;
  let startY = 0;
  let startTop = 0;

  // 创建鼠标跟踪区域
  const mouseTrackArea = document.createElement("div");
  mouseTrackArea.className = "quick-search-track-area";

  // 更新跟踪区域位置的函数
  function updateTrackAreaPosition(top, menuHeight) {
    // 计算图标和跟踪区域应该在的位置
    // 使图标垂直居中于菜单
    const iconTop = top + menuHeight / 2 - 20; // 20 是图标的一半高度

    // 修改跟踪区域的位置和大小，使其与图标完全对齐
    mouseTrackArea.style.cssText = `
      position: fixed;
      top: ${iconTop}px;
      width: 60px;
      height: 40px;  // 改为与图标相同的高度
      z-index: 2147483639;
      ${sidebarPosition}: 0;
      background: transparent;
      pointer-events: auto;
    `;

    // 同时更新图标位置
    sidebar.style.top = `${iconTop}px`;
    sidebar.style.transform = "none";
  }

  // 获取保存的位置
  chrome.storage.sync.get("sidebarTop", (result) => {
    if (result.sidebarTop !== undefined) {
      const top = result.sidebarTop;
      menu.style.top = `${top}px`;
      menu.style.transform = "none";
      updateTrackAreaPosition(top, menu.offsetHeight);
    } else {
      // 默认位置在中间
      const middleTop = (window.innerHeight - menu.offsetHeight) / 2;
      menu.style.top = `${middleTop}px`;
      menu.style.transform = "none";
      updateTrackAreaPosition(middleTop, menu.offsetHeight);
    }
  });

  // 在菜单上添加拖动事件
  menu.addEventListener("mousedown", (e) => {
    // 如果点击的是菜单项，不触发拖动
    if (e.target.closest(".quick-search-item")) return;

    isDragging = true;
    startY = e.clientY;
    startTop = menu.offsetTop;
    menu.classList.add("dragging");

    // 防止文本选择
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaY = e.clientY - startY;
    const newTop = startTop + deltaY;

    // 限制拖动范围，确保菜单不会超出视口
    const maxTop = window.innerHeight - menu.offsetHeight;
    const boundedTop = Math.max(0, Math.min(newTop, maxTop));

    // 更新所有元素的位置
    menu.style.top = `${boundedTop}px`;
    menu.style.transform = "none";
    updateTrackAreaPosition(boundedTop, menu.offsetHeight);
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;

    isDragging = false;
    menu.classList.remove("dragging");

    // 保存菜单位置
    const newTop = menu.offsetTop;
    chrome.storage.sync.set({
      sidebarTop: newTop,
    });
  });

  const icon = document.createElement("div");
  icon.className = "quick-search-icon";
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
  mouseTrackArea.addEventListener("mouseenter", () => {
    menu.classList.add("show");
  });

  // 添加图标的鼠标进入事件
  icon.addEventListener("mouseenter", () => {
    menu.classList.add("show");
  });

  menu.addEventListener("mouseenter", () => {
    menu.classList.add("show");
  });

  // 统一处理鼠标离开事件
  const handleMouseLeave = (e) => {
    const menuRect = menu.getBoundingClientRect();
    const trackRect = mouseTrackArea.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();

    // 检查鼠标是否真的离开了整个区域
    if (
      !(
        e.clientX >= menuRect.left &&
        e.clientX <= menuRect.right &&
        e.clientY >= menuRect.top &&
        e.clientY <= menuRect.bottom
      ) &&
      !(
        e.clientX >= trackRect.left &&
        e.clientX <= trackRect.right &&
        e.clientY >= trackRect.top &&
        e.clientY <= trackRect.bottom
      ) &&
      !(
        e.clientX >= iconRect.left &&
        e.clientX <= iconRect.right &&
        e.clientY >= iconRect.top &&
        e.clientY <= iconRect.bottom
      )
    ) {
      menu.classList.remove("show");
    }
  };

  mouseTrackArea.addEventListener("mouseleave", handleMouseLeave);
  menu.addEventListener("mouseleave", handleMouseLeave);
  icon.addEventListener("mouseleave", handleMouseLeave);

  document.body.appendChild(mouseTrackArea);
  return { sidebar, menu };
}

// 从URL中提取搜索关键词
function extractSearchQuery(currentUrl, engineUrl) {
  try {
    // 将URL字符串转换为URL对象
    const url = new URL(currentUrl);
    const engineUrlObj = new URL(engineUrl);

    // 获取当前网站的主域名
    const getDomain = (hostname) => {
      const parts = hostname.split(".");
      // 处理类似 search.bilibili.com 的情况
      if (parts.length > 2 && parts[parts.length - 2].length <= 3) {
        return parts.slice(-3).join(".");
      }
      return parts.slice(-2).join(".");
    };

    const currentDomain = getDomain(url.hostname);
    const engineDomain = getDomain(engineUrlObj.hostname);

    // 检查是否在相同的搜索引擎域名下
    if (currentDomain === engineDomain) {
      const searchParams = new URLSearchParams(url.search);

      // 常见搜索引擎的特定配置
      const searchPatterns = {
        "google.com": {
          params: ["q"],
          paths: ["/search"],
        },
        "bing.com": {
          params: ["q"],
          paths: ["/search"],
        },
        "baidu.com": {
          params: ["wd", "word"],
          paths: ["/s", "/baidu"],
        },
      };

      // 1. 首先尝试使用预定义的模式
      const pattern = searchPatterns[currentDomain];
      if (pattern) {
        if (pattern.paths.some((path) => url.pathname.startsWith(path))) {
          for (const param of pattern.params) {
            const value = searchParams.get(param);
            if (value) return value;
          }
        }
      }

      // 2. 如果没有预定义模式或未找到，使用通用算法
      // 常见的搜索参数名称
      const commonSearchParams = [
        "q",
        "query",
        "keyword",
        "keywords",
        "wd",
        "word",
        "search_text",
        "search",
        "text",
        "searchText",
        "key",
        "kw",
        "k",
      ];

      // 检查URL路径是否包含search相关词
      const hasSearchPath = url.pathname.toLowerCase().includes("search");

      // 如果路径包含search，优先检查所有可能的搜索参数
      if (hasSearchPath) {
        for (const param of commonSearchParams) {
          const value = searchParams.get(param);
          if (value) return value;
        }
      }

      // 3. 尝试从路径中提取搜索词
      // 例如 /search/keyword 这样的模式
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (
        pathParts.length >= 2 &&
        pathParts[0].toLowerCase().includes("search")
      ) {
        return decodeURIComponent(pathParts[1]);
      }

      // 4. 如果路径不包含search，但有参数，也尝试提取
      for (const param of commonSearchParams) {
        const value = searchParams.get(param);
        if (value) return value;
      }
    }
  } catch (e) {
    console.error("URL parsing error:", e);
  }
  return null;
}

// 更新搜索引擎列表
function updateSearchEngines(engines) {
  const menu = document.querySelector(".quick-search-menu");
  if (!menu) return;

  menu.innerHTML = "";

  engines.forEach((engine) => {
    const item = document.createElement("div");
    item.className = "quick-search-item";
    item.innerHTML = `
      <span>${engine.name}</span>
    `;

    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      let searchText = window.getSelection().toString().trim();

      // 如果没有选中文本，尝试从当前URL提取搜索词
      if (!searchText) {
        const currentUrl = window.location.href;
        // 遍历所有搜索引擎尝试提取搜索词
        for (const searchEngine of engines) {
          searchText = extractSearchQuery(currentUrl, searchEngine.url);
          if (searchText) break;
        }
      }

      if (searchText) {
        const searchUrl = `${engine.url}${encodeURIComponent(searchText)}`;
        window.open(searchUrl, "_blank");
        menu.classList.remove("show");
      }
    });

    menu.appendChild(item);
  });
}

// 初始化
function initialize() {
  // 确保 DOM 完全加载
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAfterLoad);
  } else {
    initializeAfterLoad();
  }
}

function initializeAfterLoad() {
  chrome.storage.sync
    .get(["searchEngines", "sidebarPosition"])
    .then((result) => {
      // 使用默认搜索引擎，如果storage中没有的话
      searchEngines = result.searchEngines || [
        { name: "Google", url: "https://www.google.com/search?q=" },
        { name: "Bing", url: "https://www.bing.com/search?q=" },
        { name: "百度", url: "https://www.baidu.com/s?wd=" },
      ];

      sidebarPosition = result.sidebarPosition || "right";

      // 创建并插入侧边栏
      const { sidebar, menu } = createSidebar();
      document.body.appendChild(sidebar);

      // 更新搜索引擎列表
      updateSearchEngines(searchEngines);

      // 如果是首次加载，保存默认设置
      if (!result.searchEngines) {
        chrome.storage.sync.set({ searchEngines });
      }
    })
    .catch((error) => {
      console.error("初始化失败:", error);
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
