/**
 * server.js - Express 后端服务器主入口
 * 情侣双人记账系统 - 提供 REST API + 静态文件服务
 *
 * 启动方式：node server.js
 * 默认端口：3000
 */

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 中间件配置
// ============================================================

// 解析 JSON 请求体
app.use(express.json());

// Session 会话配置（用于登录状态保持）
app.use(session({
  secret: 'couple-share-secret-key-change-in-production-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,       // 本地开发用 false，生产环境 HTTPS 改为 true
    httpOnly: true,      // 防止 XSS 攻击
    maxAge: 7 * 24 * 60 * 60 * 1000  // 登录有效期 7 天
  }
}));

// 静态文件服务（前端页面、CSS、JS）
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// 认证中间件：检查用户是否已登录
// ============================================================
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  next();
}

// ============================================================
// API 路由 - 认证相关
// ============================================================

/**
 * POST /api/login - 用户登录
 * Body: { username, password }
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码' });
  }

  // 查找用户
  const user = db.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: '账号不存在' });
  }

  // 验证密码
  const passwordValid = bcrypt.compareSync(password, user.password_hash);
  if (!passwordValid) {
    return res.status(401).json({ error: '密码错误' });
  }

  // 设置登录会话
  req.session.userId = user.id;
  req.session.username = user.username;

  // 返回用户信息（不含密码）
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name
    }
  });
});

/**
 * POST /api/logout - 退出登录
 */
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '退出失败' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

/**
 * GET /api/me - 获取当前登录用户信息
 */
app.get('/api/me', requireAuth, (req, res) => {
  const user = db.getUserById(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json({ user });
});

/**
 * PUT /api/user/password - 修改密码
 * Body: { oldPassword, newPassword }
 */
app.put('/api/user/password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少6位' });
  }

  const user = db.getUserById(req.session.userId);
  const fullUser = db.getUserByUsername(user.username);
  if (!bcrypt.compareSync(oldPassword, fullUser.password_hash)) {
    return res.status(400).json({ error: '原密码错误' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);
  db.updatePassword(req.session.userId, newHash);

  res.json({ success: true, message: '密码修改成功' });
});

// ============================================================
// API 路由 - 账单相关
// ============================================================

/**
 * GET /api/bills - 获取账单列表
 * Query: ?year=2024&month=6 （可选，按月筛选）
 */
app.get('/api/bills', requireAuth, (req, res) => {
  const { year, month } = req.query;
  const bills = db.getBills(year || null, month || null);
  res.json({ bills });
});

/**
 * POST /api/bills - 新增账单
 * Body: { type: 'expense'|'income', amount, description, billDate }
 */
app.post('/api/bills', requireAuth, (req, res) => {
  const { type, amount, description, billDate } = req.body;

  // 参数校验
  if (!type || !['expense', 'income'].includes(type)) {
    return res.status(400).json({ error: '请选择支出或收入' });
  }
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: '请输入有效金额' });
  }
  if (!billDate) {
    return res.status(400).json({ error: '请选择日期' });
  }

  const billId = db.createBill(
    req.session.userId,
    type,
    Number(amount),
    description || '',
    billDate
  );

  // 返回新建的账单
  const bill = db.getBillById(billId);
  res.json({ success: true, bill });
});

/**
 * PUT /api/bills/:id - 编辑账单（仅创建者可编辑）
 */
app.put('/api/bills/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { type, amount, description, billDate } = req.body;

  const success = db.updateBill(
    Number(id),
    req.session.userId,
    type,
    Number(amount),
    description || '',
    billDate
  );

  if (!success) {
    return res.status(403).json({ error: '无权修改此账单，只能编辑自己创建的账单' });
  }

  const bill = db.getBillById(Number(id));
  res.json({ success: true, bill });
});

/**
 * DELETE /api/bills/:id - 删除账单（仅创建者可删除）
 */
app.delete('/api/bills/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const success = db.deleteBill(Number(id), req.session.userId);

  if (!success) {
    return res.status(403).json({ error: '无权删除此账单，只能删除自己创建的账单' });
  }

  res.json({ success: true });
});

/**
 * GET /api/bills/stats - 获取账单统计数据
 * Query: ?period=day|month|year
 */
app.get('/api/bills/stats', requireAuth, (req, res) => {
  const { period } = req.query;
  const userId = req.session.userId;
  const now = new Date();

  let startDate, endDate;

  switch (period) {
    case 'day': {
      // 今日：当天 00:00:00 到 23:59:59
      const today = now.toISOString().split('T')[0];
      startDate = today;
      endDate = today;
      break;
    }
    case 'month': {
      // 本月：当月1号到最后一天
      const year = now.getFullYear();
      const month = now.getMonth();
      startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      break;
    }
    case 'year': {
      // 本年：1月1日到12月31日
      const year = now.getFullYear();
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
      break;
    }
    default:
      return res.status(400).json({ error: '请指定统计周期：day/month/year' });
  }

  // 查自己的
  const myStats = db.getBillStats(userId, startDate, endDate);
  // 查两人合计的
  const allStats = db.getBillStats(null, startDate, endDate);

  res.json({
    period,
    startDate,
    endDate,
    my: myStats,
    all: allStats
  });
});

// ============================================================
// API 路由 - 日程待办相关
// ============================================================

/**
 * GET /api/todos - 获取指定日期待办
 * Query: ?date=2024-06-01
 */
app.get('/api/todos', requireAuth, (req, res) => {
  const { date } = req.query;
  const queryDate = date || new Date().toISOString().split('T')[0];
  const todos = db.getTodosByDate(queryDate);
  res.json({ todos, date: queryDate });
});

/**
 * GET /api/todos/today - 获取今日待办（首页用）
 */
app.get('/api/todos/today', requireAuth, (req, res) => {
  const todos = db.getTodayTodos();
  const today = new Date().toISOString().split('T')[0];
  res.json({ todos, date: today });
});

/**
 * POST /api/todos - 新增待办
 * Body: { description, date }
 */
app.post('/api/todos', requireAuth, (req, res) => {
  const { description, date } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: '请输入待办内容' });
  }
  if (!date) {
    return res.status(400).json({ error: '请选择日期' });
  }

  const todoId = db.createTodo(description.trim(), date, req.session.userId);

  // 返回该日期的所有待办
  const todos = db.getTodosByDate(date);
  res.json({ success: true, todos });
});

/**
 * PUT /api/todos/:id - 更新待办内容
 */
app.put('/api/todos/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { description, date } = req.body;

  const success = db.updateTodo(Number(id), description.trim());
  if (!success) {
    return res.status(404).json({ error: '待办不存在' });
  }

  // 返回该日期的所有待办
  const todos = db.getTodosByDate(date);
  res.json({ success: true, todos });
});

/**
 * PUT /api/todos/:id/toggle - 切换待办完成状态
 */
app.put('/api/todos/:id/toggle', requireAuth, (req, res) => {
  const { id } = req.params;
  const { date } = req.body;

  const result = db.toggleTodo(Number(id), req.session.userId);
  if (!result) {
    return res.status(404).json({ error: '待办不存在' });
  }

  // 返回该日期的所有待办
  const todos = db.getTodosByDate(date);
  res.json({ success: true, todos, toggleResult: result });
});

/**
 * DELETE /api/todos/:id - 删除待办
 */
app.delete('/api/todos/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { date } = req.query;

  const success = db.deleteTodo(Number(id));
  if (!success) {
    return res.status(404).json({ error: '待办不存在' });
  }

  // 返回该日期的所有待办
  const todos = db.getTodosByDate(date || new Date().toISOString().split('T')[0]);
  res.json({ success: true, todos });
});

// ============================================================
// API 路由 - 情话相关
// ============================================================

/**
 * GET /api/quote - 获取随机情话
 */
app.get('/api/quote', (req, res) => {
  const quote = db.getRandomQuote();
  res.json({ quote });
});

// ============================================================
// SPA 路由回退（所有非 API 请求返回首页）
// ============================================================
app.get('*', (req, res) => {
  // API 请求的 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: '接口不存在' });
  }
  // 其余请求返回前端 SPA 页面
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// 启动服务器（异步：先初始化数据库再监听端口）
// ============================================================

(async () => {
  try {
    // 异步初始化数据库（加载 SQL.js WASM 引擎）
    await db.initialize();

    // 启动 HTTP 监听
    app.listen(PORT, '0.0.0.0', () => {
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║  💕  情侣双人记账共享系统 启动成功！          ║');
      console.log(`║  📡  本地访问：http://localhost:${PORT}              ║`);
      console.log('║  👫  专属双人账号：哞哞(女生) / 喵喵(男生)     ║');
      console.log('║  🔑  初始密码：1314520                         ║');
      console.log('╚════════════════════════════════════════════════╝');
    });
  } catch (err) {
    console.error('[服务器] 启动失败:', err.message);
    process.exit(1);
  }
})();
