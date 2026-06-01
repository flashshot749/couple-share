/**
 * api.js - API 通信模块
 * 封装所有与后端的数据交互请求
 * 情侣双人记账系统 - 前端数据层
 */

const API = {
  /**
   * 通用请求封装
   * @param {string} url - 请求路径
   * @param {object} options - fetch 选项
   * @returns {Promise<object>} 响应 JSON
   */
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      const data = await response.json();

      // 401 未登录，跳转到登录页
      if (response.status === 401) {
        App.showLogin();
        throw new Error(data.error || '请先登录');
      }

      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      return data;
    } catch (error) {
      // 网络错误
      if (error.message === 'Failed to fetch') {
        Toast.show('网络连接失败，请检查网络');
      }
      throw error;
    }
  },

  // ========== 认证 ==========

  /** 登录 */
  login(username, password) {
    return this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  /** 退出登录 */
  logout() {
    return this.request('/api/logout', { method: 'POST' });
  },

  /** 获取当前用户信息 */
  getMe() {
    return this.request('/api/me');
  },

  /** 修改密码 */
  changePassword(oldPassword, newPassword) {
    return this.request('/api/user/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  // ========== 账单 ==========

  /** 获取账单列表（可选按月筛选） */
  getBills(year, month) {
    let url = '/api/bills';
    const params = [];
    if (year) params.push(`year=${year}`);
    if (month) params.push(`month=${month}`);
    if (params.length) url += '?' + params.join('&');
    return this.request(url);
  },

  /** 新增账单 */
  createBill(type, amount, description, billDate) {
    return this.request('/api/bills', {
      method: 'POST',
      body: JSON.stringify({ type, amount, description, billDate }),
    });
  },

  /** 编辑账单 */
  updateBill(id, type, amount, description, billDate) {
    return this.request(`/api/bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ type, amount, description, billDate }),
    });
  },

  /** 删除账单 */
  deleteBill(id) {
    return this.request(`/api/bills/${id}`, { method: 'DELETE' });
  },

  /** 获取统计数据 */
  getStats(period) {
    return this.request(`/api/bills/stats?period=${period}`);
  },

  // ========== 待办 ==========

  /** 获取指定日期待办 */
  getTodos(date) {
    return this.request(`/api/todos?date=${date}`);
  },

  /** 获取今日待办 */
  getTodayTodos() {
    return this.request('/api/todos/today');
  },

  /** 新增待办 */
  createTodo(description, date) {
    return this.request('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ description, date }),
    });
  },

  /** 更新待办内容 */
  updateTodo(id, description, date) {
    return this.request(`/api/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ description, date }),
    });
  },

  /** 切换待办完成状态 */
  toggleTodo(id, date) {
    return this.request(`/api/todos/${id}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ date }),
    });
  },

  /** 删除待办 */
  deleteTodo(id, date) {
    return this.request(`/api/todos/${id}?date=${date}`, { method: 'DELETE' });
  },

  // ========== 情话 ==========

  /** 获取随机情话 */
  getRandomQuote() {
    return this.request('/api/quote');
  },
};
