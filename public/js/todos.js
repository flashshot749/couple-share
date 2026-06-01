/**
 * todos.js - 待办事项模块
 * 处理首页今日待办展示、快速添加、完成切换
 * 情侣双人记账系统 - 前端待办模块
 */

const Todos = {
  /**
   * 快速添加今日待办（从首页输入框）
   */
  async addQuickTodo() {
    const input = document.getElementById('quick-todo-input');
    const description = input.value.trim();

    if (!description) {
      Toast.show('请输入待办内容');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    try {
      await API.createTodo(description, today);
      input.value = '';
      Toast.show('待办已添加 ✅');
      await this.loadTodayTodos();
    } catch (error) {
      Toast.show(error.message || '添加失败');
    }
  },

  /**
   * 加载今日待办（首页展示）
   */
  async loadTodayTodos() {
    const container = document.getElementById('today-todos-list');
    const dateDisplay = document.getElementById('today-date-display');

    // 显示今日日期
    const now = new Date();
    const weekDay = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    dateDisplay.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 周${weekDay}`;

    try {
      const data = await API.getTodayTodos();
      this.renderTodoList(container, data.todos, data.date);
    } catch (error) {
      container.innerHTML = `<p class="text-red-400 text-sm text-center py-4">${error.message || '加载失败'}</p>`;
    }
  },

  /**
   * 渲染待办列表通用方法
   * @param {HTMLElement} container - 列表容器
   * @param {Array} todos - 待办数组
   * @param {string} date - 所属日期
   */
  renderTodoList(container, todos, date) {
    if (!todos || todos.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6">
          <div class="text-3xl mb-2">✨</div>
          <p class="text-gray-400 text-sm">今天还没有待办事项</p>
          <p class="text-gray-300 text-xs mt-1">在下方添加或去日历规划吧</p>
        </div>
      `;
      return;
    }

    let html = '';
    todos.forEach(todo => {
      const completedClass = todo.completed ? 'todo-completed' : '';
      const checkIcon = todo.completed ? '✅' : '⬜';
      const completerInfo = todo.completed
        ? `<span class="text-xs text-gray-300"> · 由 ${escHtml(todo.completer_name || '某人')} 完成</span>`
        : '';

      html += `
        <div class="todo-item ${completedClass} flex items-center gap-3 p-2 rounded-xl hover:bg-love-50 transition-colors group">
          <button
            onclick="Todos.toggleTodo(${todo.id}, '${date}')"
            class="text-xl flex-shrink-0 hover:scale-110 transition-transform"
            title="${todo.completed ? '标记未完成' : '标记完成'}"
          >
            ${checkIcon}
          </button>
          <div class="flex-1 min-w-0">
            <p class="todo-text text-sm text-gray-700 truncate">${escHtml(todo.description)}</p>
            <p class="text-xs text-gray-400">
              由 ${escHtml(todo.creator_name)} 添加${completerInfo}
            </p>
          </div>
          <button
            onclick="Todos.deleteTodo(${todo.id}, '${date}')"
            class="text-gray-300 hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100 flex-shrink-0"
            title="删除"
          >
            🗑
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * 切换待办完成状态
   */
  async toggleTodo(todoId, date) {
    try {
      const data = await API.toggleTodo(todoId, date);
      // 刷新当前页面的待办列表
      const container = document.getElementById('today-todos-list');
      if (container && document.getElementById('page-home') && !document.getElementById('page-home').classList.contains('hidden')) {
        this.renderTodoList(container, data.todos, date);
      }
      // 同时刷新日历面板（如果打开着）
      if (typeof Calendar !== 'undefined' && Calendar.selectedDate === date) {
        Calendar.renderTodos(data.todos, date);
      }
    } catch (error) {
      Toast.show(error.message || '操作失败');
    }
  },

  /**
   * 删除待办
   */
  async deleteTodo(todoId, date) {
    if (!confirm('确定要删除这条待办吗？')) return;

    try {
      const data = await API.deleteTodo(todoId, date);
      // 刷新首页列表
      const container = document.getElementById('today-todos-list');
      if (container && !document.getElementById('page-home').classList.contains('hidden')) {
        this.renderTodoList(container, data.todos, date);
      }
      // 刷新日历面板
      if (typeof Calendar !== 'undefined' && Calendar.selectedDate === date) {
        Calendar.renderTodos(data.todos, date);
      }
      Toast.show('待办已删除');
    } catch (error) {
      Toast.show(error.message || '删除失败');
    }
  },
};

// 首页快捷添加回车键支持
document.addEventListener('DOMContentLoaded', () => {
  const quickInput = document.getElementById('quick-todo-input');
  if (quickInput) {
    quickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Todos.addQuickTodo();
    });
  }
});
