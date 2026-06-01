/**
 * bills.js - 双人记账模块
 * 处理账单的新增、编辑、删除、列表展示、统计
 * 情侣双人记账系统 - 前端账单模块
 */

const Bills = {
  // 当前编辑的账单ID（null 表示新增模式）
  editingBillId: null,
  // 当前选中的账单类型
  currentType: 'expense',

  /**
   * 初始化：设置默认日期、绑定筛选事件
   */
  init() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bill-date').value = today;
    document.getElementById('bill-month-filter').value = '';
  },

  /**
   * 选择账单类型（支出/收入）
   */
  selectType(type) {
    this.currentType = type;
    const expenseBtn = document.getElementById('bill-type-expense');
    const incomeBtn = document.getElementById('bill-type-income');

    if (type === 'expense') {
      expenseBtn.className = 'flex-1 py-3 rounded-xl border-2 border-love-300 bg-love-50 text-love-600 font-semibold transition-all';
      incomeBtn.className = 'flex-1 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-500 transition-all';
    } else {
      incomeBtn.className = 'flex-1 py-3 rounded-xl border-2 border-green-300 bg-green-50 text-green-600 font-semibold transition-all';
      expenseBtn.className = 'flex-1 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-500 transition-all';
    }
  },

  /**
   * 显示新增账单弹窗
   */
  showAddModal() {
    this.editingBillId = null;
    this.currentType = 'expense';
    document.getElementById('bill-modal-title').textContent = '✏️ 记一笔';
    document.getElementById('bill-amount').value = '';
    document.getElementById('bill-description').value = '';
    document.getElementById('bill-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('bill-submit-btn').textContent = '保存';
    document.getElementById('bill-delete-btn').classList.add('hidden');
    this.selectType('expense');
    document.getElementById('bill-modal').classList.remove('hidden');
  },

  /**
   * 显示编辑账单弹窗
   */
  showEditModal(bill) {
    this.editingBillId = bill.id;
    this.currentType = bill.type;
    document.getElementById('bill-modal-title').textContent = '✏️ 编辑账单';
    document.getElementById('bill-amount').value = bill.amount;
    document.getElementById('bill-description').value = bill.description;
    document.getElementById('bill-date').value = bill.bill_date;
    document.getElementById('bill-submit-btn').textContent = '更新';
    document.getElementById('bill-delete-btn').classList.remove('hidden');
    this.selectType(bill.type);
    document.getElementById('bill-modal').classList.remove('hidden');
  },

  /**
   * 关闭弹窗
   */
  closeAddModal() {
    document.getElementById('bill-modal').classList.add('hidden');
    this.editingBillId = null;
  },

  /**
   * 提交账单（新增或编辑）
   */
  async submitBill() {
    const amount = parseFloat(document.getElementById('bill-amount').value);
    const description = document.getElementById('bill-description').value.trim();
    const billDate = document.getElementById('bill-date').value;

    // 表单校验
    if (!amount || amount <= 0) {
      Toast.show('请输入有效金额');
      return;
    }
    if (!billDate) {
      Toast.show('请选择日期');
      return;
    }

    try {
      if (this.editingBillId) {
        // 编辑模式
        await API.updateBill(this.editingBillId, this.currentType, amount, description, billDate);
        Toast.show('账单已更新 ✅');
      } else {
        // 新增模式
        await API.createBill(this.currentType, amount, description, billDate);
        Toast.show('记账成功 💰');
      }

      this.closeAddModal();
      // 刷新账单列表和统计数据
      await this.loadBills();
      await App.loadHomeStats();
    } catch (error) {
      Toast.show(error.message || '操作失败');
    }
  },

  /**
   * 删除当前编辑的账单
   */
  async deleteCurrentBill() {
    if (!this.editingBillId) return;
    if (!confirm('确定要删除这笔账单吗？此操作不可撤销。')) return;

    try {
      await API.deleteBill(this.editingBillId);
      Toast.show('账单已删除 🗑');
      this.closeAddModal();
      await this.loadBills();
      await App.loadHomeStats();
    } catch (error) {
      Toast.show(error.message || '删除失败');
    }
  },

  /**
   * 加载账单列表
   */
  async loadBills() {
    const monthFilter = document.getElementById('bill-month-filter').value;
    let year = null, month = null;

    if (monthFilter) {
      // monthFilter 格式为 "YYYY-MM"
      [year, month] = monthFilter.split('-');
    }

    const container = document.getElementById('bills-list');
    container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">加载中...</p>';

    try {
      const data = await API.getBills(year, month);
      this.renderBills(data.bills);
      this.renderMonthStats(data.bills);
    } catch (error) {
      container.innerHTML = `<p class="text-red-400 text-sm text-center py-8">${error.message || '加载失败'}</p>`;
    }
  },

  /**
   * 渲染账单列表
   */
  renderBills(bills) {
    const container = document.getElementById('bills-list');

    if (!bills || bills.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10">
          <div class="text-5xl mb-3">📭</div>
          <p class="text-gray-400 text-sm">还没有账单记录</p>
          <p class="text-gray-300 text-xs mt-1">点击上方按钮记一笔吧</p>
        </div>
      `;
      return;
    }

    // 按日期分组
    const grouped = {};
    bills.forEach(bill => {
      if (!grouped[bill.bill_date]) grouped[bill.bill_date] = [];
      grouped[bill.bill_date].push(bill);
    });

    let html = '';
    const isCurrentUser = (bill) => bill.user_id === App.currentUser?.id;

    for (const [date, dateBills] of Object.entries(grouped)) {
      // 日期标题
      const dateObj = new Date(date);
      const weekDay = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()];
      const dateDisplay = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 周${weekDay}`;

      html += `
        <div class="mb-1">
          <span class="text-xs text-gray-400 font-medium">📅 ${dateDisplay}</span>
        </div>
      `;

      // 该日期下的账单
      dateBills.forEach((bill, idx) => {
        const isMine = isCurrentUser(bill);
        const typeIcon = bill.type === 'expense' ? '💸' : '💰';
        const amountColor = bill.type === 'expense' ? 'text-red-400' : 'text-green-500';
        const typeLabel = bill.type === 'expense' ? '支出' : '收入';
        const sign = bill.type === 'expense' ? '-' : '+';
        const billId = `bill-${bill.id}`;

        // 把账单数据存到全局 Map，避免 inline onclick 中的 JSON 转义问题
        if (!window._billsData) window._billsData = {};
        window._billsData[billId] = bill;

        html += `
          <div class="bg-white rounded-xl p-3 mb-2 shadow-sm border border-love-50 ${isMine ? '' : 'border-l-2 border-l-love-200'} animate-fade-in">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="text-lg">${typeIcon}</span>
                <div class="min-w-0">
                  <p class="text-sm text-gray-700 truncate">${escHtml(bill.description) || typeLabel}</p>
                  <p class="text-xs text-gray-400">${escHtml(bill.creator_name)}</p>
                </div>
              </div>
              <div class="text-right ml-3">
                <p class="font-semibold ${amountColor}">${sign}¥${bill.amount.toFixed(2)}</p>
                ${isMine ? `
                  <button
                    data-bill-id="${billId}"
                    class="bill-edit-btn text-xs text-love-400 hover:text-love-600 mt-0.5"
                  >
                    编辑
                  </button>
                ` : `
                  <span class="text-xs text-gray-300">对方</span>
                `}
              </div>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = html;

    // 事件委托：绑定编辑按钮点击
    container.querySelectorAll('.bill-edit-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const billId = this.dataset.billId;
        const bill = window._billsData && window._billsData[billId];
        if (bill) Bills.showEditModal(bill);
      });
    });
  },

  /**
   * 渲染月份统计小条
   */
  renderMonthStats(bills) {
    const container = document.getElementById('bills-month-stats');
    const monthFilter = document.getElementById('bill-month-filter').value;

    if (!bills || bills.length === 0) {
      const label = monthFilter ? '该月' : '最近';
      container.innerHTML = `<span class="text-gray-400">${label}暂无账单</span>`;
      return;
    }

    let totalExpense = 0, totalIncome = 0;
    bills.forEach(bill => {
      if (bill.type === 'expense') totalExpense += bill.amount;
      else totalIncome += bill.amount;
    });

    container.innerHTML = `
      <span class="text-red-400">💸 支出 ¥${totalExpense.toFixed(2)}</span>
      <span class="text-gray-300">|</span>
      <span class="text-green-500">💰 收入 ¥${totalIncome.toFixed(2)}</span>
      <span class="text-gray-300">|</span>
      <span class="text-gray-500">结余 ¥${(totalIncome - totalExpense).toFixed(2)}</span>
    `;
  },
};

/**
 * HTML 转义（防止 XSS）
 */
function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
