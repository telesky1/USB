// 产品数据
let products = [];

// USB类型图片映射
const typeImages = {
  'USB-A': 'images/type_images/USB-A.png',
  'USB-B': 'images/type_images/USB-B.png',
  'Micro-USB': 'images/type_images/Micro-USB.png',
  'Mini-USB': 'images/type_images/Mini-USB.png',
  'Type-C': 'images/type_images/Type-C.png',
  'USB-3.0': 'images/type_images/USB-3.0.png',
  'HDMI': 'images/type_images/HDMI.png',
  '1394': 'images/type_images/1394.png'
};

// DOM元素
const productGrid = document.getElementById('productGrid');
const resultsCount = document.getElementById('resultsCount');
const searchInput = document.getElementById('searchInput');
const resetBtn = document.getElementById('resetBtn');
const toast = document.getElementById('toast');
const backToTopBtn = document.getElementById('back-to-top');
const typeFilterContainer = document.getElementById('typeFilterContainer');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');
const modalClose = document.querySelector('.modal-close');

// 筛选状态
let filterState = {
  type: 'all',
  gender: 'all',
  search: ''
};

// 初始化页面
function initPage() {
  setupEventListeners();
  loadCSVData();
  setupBackToTop();
  setupImageModal();
}

// 设置图片模态框
function setupImageModal() {
  // 关闭模态框
  modalClose.addEventListener('click', () => {
    imageModal.style.display = 'none';
  });

  // 点击模态框背景关闭
  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
      imageModal.style.display = 'none';
    }
  });

  // 按ESC键关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageModal.style.display === 'block') {
      imageModal.style.display = 'none';
    }
  });
}

// 设置回到顶部功能
function setupBackToTop() {
  const updateBackTop = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    backToTopBtn.classList.toggle('show', y > 400);
  };

  window.addEventListener('scroll', updateBackTop);
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  updateBackTop();
}

// 加载CSV数据
async function loadCSVData() {
  try {
    // 使用实际的CSV文件路径
    const response = await fetch('products.csv');
    const csvText = await response.text();

    // 解析CSV
    products = parseCSV(csvText);

    if (products.length > 0) {
      // 生成类型筛选器
      generateTypeFilters();
      resetFilters();
      renderProducts(products);
    } else {
      showError('CSV文件中没有找到有效数据');
    }
  } catch (error) {
    console.error('加载CSV文件失败:', error);
    showError('无法加载products.csv文件，请确保文件存在');
  }
}

// 从产品数据中提取唯一类型并生成筛选器
function generateTypeFilters() {
  // 提取所有唯一的类型
  const uniqueTypes = [...new Set(products.map(p => p.type))];

  // 生成类型筛选按钮
  let buttonsHTML = `
        <div class="type-btn active" data-type="all">
          <div class="type-img">
            <i class="fas fa-layer-group" style="font-size: 2rem; color: #3498db;"></i>
          </div>
          <div class="type-name">全部类型</div>
        </div>
      `;

  uniqueTypes.forEach(type => {
    const imageUrl = typeImages[type] || 'https://cdn-icons-png.flaticon.com/512/3094/3094993.png';

    buttonsHTML += `
          <div class="type-btn" data-type="${type}">
            <div class="type-img">
              <img src="${imageUrl}" alt="${type}">
            </div>
            <div class="type-name">${type}</div>
          </div>
        `;
  });

  // 插入到容器
  typeFilterContainer.innerHTML = buttonsHTML;

  // 重新绑定事件
  bindTypeFilterEvents();
}

// 绑定类型筛选事件
function bindTypeFilterEvents() {
  // 类型筛选按钮
  document.querySelectorAll('#typeFilterContainer .type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#typeFilterContainer .type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterState.type = btn.dataset.type;
      renderProducts(products);
    });
  });
}

// 解析CSV文件（兼容逗号和制表符分隔）
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const result = [];
  const headers = lines[0].split(',').map(h => h.trim());

  // 跳过标题行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 尝试使用逗号分隔
    let values = line.split(',');

    // 如果逗号分隔后列数不足5列，尝试使用制表符分隔
    if (values.length < headers.length) {
      values = line.split('\t');
    }

    // 如果仍然不足5列，跳过此行
    if (values.length < headers.length) continue;

    const product = {
      name: values[0].trim(),
      url: values[1].trim(),
      type: values[2].trim(),
      gender: values[3].trim(),
      imageId: values[4] ? values[4].trim() : null
    };

    result.push(product);
  }

  return result;
}

// 渲染产品列表
function renderProducts(productsToShow) {
  if (!productsToShow || productsToShow.length === 0) {
    productGrid.innerHTML = `
          <div class="no-results">
            <i class="fas fa-box-open"></i>
            <h2>未找到产品数据</h2>
            <p>请检查CSV文件或筛选条件</p>
          </div>
        `;
    resultsCount.textContent = '0';
    return;
  }

  // 应用筛选
  const filtered = applyFilters(productsToShow);

  if (filtered.length === 0) {
    productGrid.innerHTML = `
          <div class="no-results">
            <i class="fas fa-search"></i>
            <h2>未找到匹配的产品</h2>
            <p>请尝试调整筛选条件或使用不同的搜索关键词</p>
          </div>
        `;
    resultsCount.textContent = '0';
    return;
  }

  let productCards = '';

  filtered.forEach(product => {
    // 图片处理
    let imageHTML = '';
    if (product.imageId) {
      imageHTML = `
            <div class="product-image-container" data-image="images/products_images/${product.imageId}.png" data-name="${product.name}">
              <img src="images/products_images/${product.imageId}.png" 
                   alt="${product.name}" 
                   class="product-image"
                   onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'image-placeholder\'><i class=\'fas fa-image\'></i></div>'">
              <div class="zoom-icon">
                <i class="fas fa-search-plus"></i>
              </div>
            </div>
          `;
    } else {
      imageHTML = `
            <div class="product-image-container">
              <div class="image-placeholder">
                <i class="fas fa-image"></i>
              </div>
            </div>
          `;
    }

    productCards += `
          <div class="product-card">
            ${imageHTML}
            <div class="product-content">
              <h3 class="product-title">${product.name}</h3>
              <div class="product-meta">
                <span class="product-type">${product.type}</span>
                <span class="product-gender">${product.gender}</span>
              </div>
              <p class="product-description">高品质USB插座，适用于各种电子设备，提供稳定可靠的连接体验。</p>
              <div class="product-actions">
                <a href="${product.url}" target="_blank" class="product-link">
                  <i class="fas fa-external-link-alt"></i> 查看详情
                </a>
                <button class="copy-btn" data-url="${product.url}">
                  <i class="fas fa-copy"></i> 复制链接
                </button>
              </div>
            </div>
          </div>
        `;
  });

  productGrid.innerHTML = productCards;
  resultsCount.textContent = filtered.length;

  // 绑定图片点击事件
  bindImageClickEvents();
}

// 绑定图片点击事件
function bindImageClickEvents() {
  document.querySelectorAll('.product-image-container[data-image]').forEach(container => {
    container.addEventListener('click', () => {
      const imageUrl = container.getAttribute('data-image');
      const productName = container.getAttribute('data-name');

      modalImage.src = imageUrl;
      modalImage.alt = productName;
      modalCaption.textContent = productName;

      imageModal.style.display = 'block';
    });
  });
}

// 显示错误信息
function showError(message) {
  productGrid.innerHTML = `
        <div class="no-results">
          <i class="fas fa-exclamation-triangle"></i>
          <h2>数据加载失败</h2>
          <p>${message}</p>
          <p style="margin-top: 20px;">请检查您的CSV文件格式是否符合要求：</p>
          <ul style="text-align: left; max-width: 500px; margin: 15px auto;">
            <li>文件名为 <code>products.csv</code></li>
            <li>文件位于同一目录下</li>
            <li>格式为：规格名称,SKY 链接,类型,公母,图片ID</li>
            <li>每行一个产品，用逗号分隔</li>
          </ul>
        </div>
      `;
}

// 应用筛选条件
function applyFilters(productsList) {
  return productsList.filter(product => {
    // 类型筛选
    const typeMatch = filterState.type === 'all' || product.type === filterState.type;

    // 性别筛选
    const genderMatch = filterState.gender === 'all' || product.gender === filterState.gender;

    // 搜索筛选
    const searchMatch = filterState.search === '' ||
      product.name.toLowerCase().includes(filterState.search);

    return typeMatch && genderMatch && searchMatch;
  });
}

// 设置事件监听器
function setupEventListeners() {
  // 性别筛选按钮
  document.querySelectorAll('.gender-btn[data-gender]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gender-btn[data-gender]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterState.gender = btn.dataset.gender;
      renderProducts(products);
    });
  });

  // 搜索框输入
  searchInput.addEventListener('input', () => {
    filterState.search = searchInput.value.toLowerCase().trim();
    renderProducts(products);
  });

  // 重置按钮
  resetBtn.addEventListener('click', resetFilters);

  // 复制链接按钮
  document.addEventListener('click', function (e) {
    if (e.target.classList.contains('copy-btn') || e.target.closest('.copy-btn')) {
      const btn = e.target.closest('.copy-btn');
      const url = btn.dataset.url;
      copyToClipboard(url);
      showToast('链接已复制到剪贴板！');
    }
  });
}

// 重置筛选条件
function resetFilters() {
  // 重置筛选状态
  filterState = {
    type: 'all',
    gender: 'all',
    search: ''
  };

  // 重置UI
  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.querySelector('.gender-btn[data-gender="all"]').classList.add('active');

  // 重置类型筛选器
  document.querySelectorAll('#typeFilterContainer .type-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.type === 'all') {
      btn.classList.add('active');
    }
  });

  searchInput.value = '';

  // 重新渲染
  renderProducts(products);
}

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('复制失败:', err);
    showToast('复制失败，请手动复制');
  });
}

// 显示提示消息
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPage);