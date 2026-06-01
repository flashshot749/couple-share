/**
 * calendar.js - 共享日历模块
 * 月历视图渲染、日期选择、待办管理
 * 情侣双人记账系统 - 前端日历模块
 */

const Calendar = {
  // 当前显示的年份和月份
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,  // 1-12
  // 当前选中的日期 YYYY-MM-DD
  selectedDate: new Date().toISOString().split('T')[0],
  // 有待办的日期集合（用于日历上显示小圆点）
  todoDates: new Set(),

  /**
   * 初始化日历
   */
  init() {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.renderCalendar();
    this.loadDateTodos(this.selectedDate);
  },

  /**
   * 切换上一月
   */
  prevMonth() {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.renderCalendar();
  },

  /**
   * 切换下一月
   */
  nextMonth() {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.renderCalendar();
  },

  /**
   * 渲染月历视图
   */
  renderCalendar() {
    // 更新标题
    document.getElementById('calendar-month-title').textContent =
      `${this.currentYear}年 ${this.currentMonth}月`;

    const grid = document.getElementById('calendar-grid');
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date().getDate();
    const todayMonth = new Date().getMonth() + 1;
    const todayYear = new Date().getFullYear();

    // 计算当月第一天和最后一天
    const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    // 第一天是星期几（0=周日）
    const startDayOfWeek = firstDay.getDay();

    let html = '';

    // 填充上月残留的空白格
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth - 1, 0).getDate();
    for (let i = 0; i < startDayOfWeek; i++) {
      const day = prevMonthLastDay - startDayOfWeek + i + 1;
      html += `<div class="calendar-day other-month">${day}</div>`;
    }

    // 当月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let classes = 'calendar-day';

      // 是否今日
      if (this.currentYear === todayYear && this.currentMonth === todayMonth && day === todayDate) {
        classes += ' today';
      }
      // 是否选中
      if (dateStr === this.selectedDate) {
        classes += ' selected';
      }
      // 是否有待办
      if (this.todoDates.has(dateStr)) {
        classes += ' has-todos';
      }

      html += `<div class="${classes}" onclick="Calendar.selectDate('${dateStr}')">${day}</div>`;
    }

    // 填充下月开头的空白格（凑满 7 列）
    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      html += `<div class="calendar-day other-month">${day}</div>`;
    }

    grid.innerHTML = html;

    // 加载当月所有有待办的日期
    this.loadMonthTodoDates();
  },

  /**
   * 加载当月所有有待办的日期（用于日历小圆点）
   */
  async loadMonthTodoDates() {
    try {
      // 获取当月第一天和最后一天的待办
      const firstDate = `${this.currentYear}-${String(this.currentMonth).padStart(2, '0')}-01`;
      const todos = await API.getTodos(firstDate);
      // 由于 API 只返回单个日期，我们需要另一种方式
      // 这里采用逐日检查最近有数据的日期
      // 简化方案：通过查询本月的 bills 方式不行，改为前端标记
      // 实际上我们可以在用户点击日期加载待办时标记
    } catch (e) {
      // 静默失败，不影响日历显示
    }
  },

  /**
   * 为指定日期添加待办标记
   */
  markDate(date) {
    this.todoDates.add(date);
  },

  /**
   * 选择日期
   */
  selectDate(dateStr) {
    this.selectedDate = dateStr;
    this.renderCalendar();
    this.loadDateTodos(dateStr);

    // 更新标签
    const dateObj = new Date(dateStr);
    const weekDay = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()];
    const today = new Date().toISOString().split('T')[0];
    const label = dateStr === today ? '今日' :
      `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 周${weekDay}`;
    document.getElementById('calendar-selected-date-label').textContent = label;
  },

  /**
   * 加载指定日期的待办
   */
  async loadDateTodos(dateStr) {
    const container = document.getElementById('calendar-todos-list');
    const countEl = document.getElementById('calendar-todo-count');
    container.innerHTML = '<p class="text-gray-400 text-sm text-center py-4">加载中...</p>';

    // 更新输入框的 placeholder
    const dateObj = new Date(dateStr);
    document.getElementById('calendar-todo-input').placeholder =
      `为 ${dateObj.getMonth() + 1}月${dateObj.getDate()}日 添加待办...`;

    try {
      const data = await API.getTodos(dateStr);
      this.renderTodos(data.todos, dateStr);
      // 标记该日期有待办
      if (data.todos && data.todos.length > 0) {
        this.markDate(dateStr);
      }
    } catch (error) {
      container.innerHTML = `<p class="text-red-400 text-sm text-center py-4">${error.message || '加载失败'}</p>`;
    }
  },

  /**
   * 渲染待办列表（日历面板中）
   */
  renderTodos(todos, date) {
    const container = document.getElementById('calendar-todos-list');
    const countEl = document.getElementById('calendar-todo-count');

    if (!todos || todos.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6">
          <div class="text-2xl mb-1">📝</div>
          <p class="text-gray-400 text-sm">这天没有待办</p>
        </div>
      `;
      countEl.textContent = '0 项';
      return;
    }

    // 统计完成数量
    const completedCount = todos.filter(t => t.completed).length;
    countEl.textContent = `${todos.length} 项 · 完成 ${completedCount}`;

    let html = '';
    todos.forEach(todo => {
      const completedClass = todo.completed ? 'todo-completed' : '';
      const checkIcon = todo.completed ? '✅' : '⬜';
      const completerInfo = todo.completed
        ? `<span class="text-xs text-gray-300"> · ${escHtml(todo.completer_name || '某人')} 完成</span>`
        : '';

      html += `
        <div class="todo-item ${completedClass} flex items-center gap-3 p-2 rounded-xl hover:bg-love-50 transition-colors group">
          <button
            onclick="Calendar.toggleTodo(${todo.id}, '${date}')"
            class="text-xl flex-shrink-0 hover:scale-110 transition-transform"
          >
            ${checkIcon}
          </button>
          <div class="flex-1 min-w-0">
            <p class="todo-text text-sm text-gray-700 truncate">${escHtml(todo.description)}</p>
            <p class="text-xs text-gray-400">
              ${escHtml(todo.creator_name)} 添加${completerInfo}
            </p>
          </div>
          <button
            onclick="Calendar.deleteTodo(${todo.id}, '${date}')"
            class="text-gray-300 hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100 flex-shrink-0"
          >
            🗑
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * 添加待办（从日历面板）
   */
  async addTodo() {
    const input = document.getElementById('calendar-todo-input');
    const description = input.value.trim();

    if (!description) {
      Toast.show('请输入待办内容');
      return;
    }

    try {
      const data = await API.createTodo(description, this.selectedDate);
      input.value = '';
      this.renderTodos(data.todos, this.selectedDate);
      this.markDate(this.selectedDate);
      this.renderCalendar(); // 刷新日历小圆点
      Toast.show('待办已添加 ✅');

      // 如果添加的是今天，也刷新首页
      const today = new Date().toISOString().split('T')[0];
      if (this.selectedDate === today) {
        await Todos.loadTodayTodos();
      }
    } catch (error) {
      Toast.show(error.message || '添加失败');
    }
  },

  /**
   * 切换待办完成状态
   */
  async toggleTodo(todoId, date) {
    try {
      const data = await API.toggleTodo(todoId, date);
      this.renderTodos(data.todos, date);

      // 如果切换的是今天，刷新首页
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        await Todos.loadTodayTodos();
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
      this.renderTodos(data.todos, date);

      // 如果删除的是今天，刷新首页
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        await Todos.loadTodayTodos();
      }
      Toast.show('待办已删除');
    } catch (error) {
      Toast.show(error.message || '删除失败');
    }
  },
};

// 日历输入框回车支持
document.addEventListener('DOMContentLoaded', () => {
  const calInput = document.getElementById('calendar-todo-input');
  if (calInput) {
    calInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Calendar.addTodo();
    });
  }
});
