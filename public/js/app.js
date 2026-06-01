/**
 * app.js - 主应用入口
 * 页面切换、全局状态管理、首页数据加载、Toast 提示
 * 情侣双人记账系统 - 前端主控模块
 */

const App = {
  // 当前登录用户信息
  currentUser: null,
  // 当前页面
  currentPage: 'home',

  /**
   * 显示登录页
   */
  showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
  },

  /**
   * 显示主应用
   */
  showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');

    // 设置欢迎语
    const greeting = document.getElementById('header-greeting');
    if (this.currentUser) {
      greeting.textContent = `Hi, ${this.currentUser.display_name}`;
    }

    // 初始化各模块并切换到首页
    this.initModules();
    switchPage('home');
  },

  /**
   * 初始化各功能模块
   */
  initModules() {
    Bills.init();
    Calendar.init();
  },

  /**
   * 加载首页所有数据
   */
  async loadHomeData() {
    // 并行加载：情话、今日待办、统计
    await Promise.all([
      loadDailyQuote(),
      Todos.loadTodayTodos(),
      this.loadHomeStats(),
    ]);
  },

  /**
   * 加载首页统计数据
   */
  async loadHomeStats() {
    try {
      // 并行请求三种统计
      const [dayData, monthData, yearData] = await Promise.all([
        API.getStats('day'),
        API.getStats('month'),
        API.getStats('year'),
      ]);

      // 今日统计
      document.getElementById('my-today-expense').textContent = `¥${dayData.my.total_expense.toFixed(2)}`;
      document.getElementById('my-today-income').textContent = `¥${dayData.my.total_income.toFixed(2)}`;
      document.getElementById('all-today-expense').textContent = `¥${dayData.all.total_expense.toFixed(2)}`;
      document.getElementById('all-today-income').textContent = `¥${dayData.all.total_income.toFixed(2)}`;

      // 月度统计
      document.getElementById('my-month-expense').textContent = `¥${monthData.my.total_expense.toFixed(2)}`;
      document.getElementById('my-month-income').textContent = `¥${monthData.my.total_income.toFixed(2)}`;
      document.getElementById('all-month-expense').textContent = `¥${monthData.all.total_expense.toFixed(2)}`;
      document.getElementById('all-month-income').textContent = `¥${monthData.all.total_income.toFixed(2)}`;

      // 年度统计
      document.getElementById('my-year-expense').textContent = `¥${yearData.my.total_expense.toFixed(2)}`;
      document.getElementById('my-year-income').textContent = `¥${yearData.my.total_income.toFixed(2)}`;
      document.getElementById('all-year-expense').textContent = `¥${yearData.all.total_expense.toFixed(2)}`;
      document.getElementById('all-year-income').textContent = `¥${yearData.all.total_income.toFixed(2)}`;
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },
};

// ============================================================
// 页面切换
// ============================================================

/**
 * 切换显示页面（首页/记账/日历）
 */
function switchPage(page) {
  App.currentPage = page;

  // 隐藏所有页面
  document.getElementById('page-home').classList.add('hidden');
  document.getElementById('page-bills').classList.add('hidden');
  document.getElementById('page-calendar').classList.add('hidden');

  // 显示目标页面
  document.getElementById(`page-${page}`).classList.remove('hidden');

  // 更新底部导航高亮
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.querySelector('span:last-child').classList.remove('text-love-500', 'font-semibold');
    btn.querySelector('span:last-child').classList.add('text-gray-400');
  });

  const activeNav = document.getElementById(`nav-${page}`);
  if (activeNav) {
    activeNav.classList.add('active');
    activeNav.querySelector('span:last-child').classList.remove('text-gray-400');
    activeNav.querySelector('span:last-child').classList.add('text-love-500', 'font-semibold');
  }

  // 加载对应页面的数据
  switch (page) {
    case 'home':
      App.loadHomeData();
      break;
    case 'bills':
      Bills.loadBills();
      break;
    case 'calendar':
      Calendar.init();
      break;
  }
}

// ============================================================
// 每日情话
// ============================================================

/**
 * 加载随机情话
 */
async function loadDailyQuote() {
  try {
    const data = await API.getRandomQuote();
    if (data.quote) {
      document.getElementById('daily-quote-text').textContent = `"${data.quote.quote}"`;
      document.getElementById('daily-quote-author').textContent =
        data.quote.author ? `—— ${data.quote.author}` : '';
    }
  } catch (error) {
    document.getElementById('daily-quote-text').textContent = '"遇见你，是最美丽的意外 💕"';
    document.getElementById('daily-quote-author').textContent = '';
  }
}

/**
 * 手动刷新情话
 */
async function refreshQuote() {
  const btn = event.target;
  btn.textContent = '🔄 加载中...';
  await loadDailyQuote();
  btn.textContent = '🔄 换一句';
}

// ============================================================
// Toast 轻提示
// ============================================================

const Toast = {
  timer: null,

  /**
   * 显示 Toast 提示
   * @param {string} message - 提示内容
   * @param {number} duration - 显示时长（毫秒）
   */
  show(message, duration = 2000) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-msg');

    // 清除之前的定时器
    if (this.timer) clearTimeout(this.timer);

    msgEl.textContent = message;
    toast.classList.add('show');
    toast.classList.remove('hidden');

    this.timer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
  },
};

// ============================================================
// 应用启动入口
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('💕 情侣双人记账系统初始化...');
  // 检查登录状态
  Auth.checkSession();
});
