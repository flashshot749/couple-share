/**
 * server.js - Express 服务器（兼容本地开发 + Vercel Serverless）
 * 情侣双人记账系统
 */

const express = require('express');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 中间件
// ============================================================
app.use(express.json());

// cookie-session：会话数据加密存储在 cookie 中，无需服务器存储，兼容 Vercel Serverless
app.use(cookieSession({
  name: 'session',
  keys: ['couple-share-secret-' + (process.env.SESSION_SECRET || 'dev')],
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax',
}));

app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// 认证中间件
// ============================================================
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '请先登录' });
  next();
}

// ============================================================
// 认证路由
// ============================================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' });
    const user = await db.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: '账号不存在' });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: '密码错误' });
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true, user: { id: user.id, username: user.username, display_name: user.display_name } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const user = await db.getUserById(req.session.userId);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/user/password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: '新密码至少6位' });
    const fullUser = await db.getUserByUsername(req.session.username);
    if (!bcrypt.compareSync(oldPassword, fullUser.password_hash)) return res.status(400).json({ error: '原密码错误' });
    const salt = bcrypt.genSaltSync(10);
    await db.updatePassword(req.session.userId, bcrypt.hashSync(newPassword, salt));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// 账单路由
// ============================================================
app.get('/api/bills', requireAuth, async (req, res) => {
  try {
    const { year, month } = req.query;
    const bills = await db.getBills(year || null, month || null);
    res.json({ bills });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bills', requireAuth, async (req, res) => {
  try {
    const { type, amount, description, billDate } = req.body;
    if (!type || !['expense', 'income'].includes(type)) return res.status(400).json({ error: '请选择支出或收入' });
    if (!amount || isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ error: '请输入有效金额' });
    if (!billDate) return res.status(400).json({ error: '请选择日期' });
    const billId = await db.createBill(req.session.userId, type, Number(amount), description || '', billDate);
    const bill = await db.getBillById(billId);
    res.json({ success: true, bill });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/bills/:id', requireAuth, async (req, res) => {
  try {
    const { type, amount, description, billDate } = req.body;
    const ok = await db.updateBill(Number(req.params.id), req.session.userId, type, Number(amount), description || '', billDate);
    if (!ok) return res.status(403).json({ error: '无权修改此账单，只能编辑自己创建的账单' });
    const bill = await db.getBillById(Number(req.params.id));
    res.json({ success: true, bill });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/bills/:id', requireAuth, async (req, res) => {
  try {
    const ok = await db.deleteBill(Number(req.params.id), req.session.userId);
    if (!ok) return res.status(403).json({ error: '无权删除此账单，只能删除自己创建的账单' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/bills/stats', requireAuth, async (req, res) => {
  try {
    const { period } = req.query;
    const now = new Date();
    let sd, ed;
    switch (period) {
      case 'day': sd = ed = now.toISOString().split('T')[0]; break;
      case 'month': {
        sd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
        ed = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()).padStart(2,'0')}`;
        break;
      }
      case 'year': sd = `${now.getFullYear()}-01-01`; ed = `${now.getFullYear()}-12-31`; break;
      default: return res.status(400).json({ error: '请指定 period: day/month/year' });
    }
    const [my, all] = await Promise.all([db.getBillStats(req.session.userId, sd, ed), db.getBillStats(null, sd, ed)]);
    res.json({ period, startDate: sd, endDate: ed, my, all });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// 待办路由
// ============================================================
app.get('/api/todos', requireAuth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const todos = await db.getTodosByDate(date);
    res.json({ todos, date });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/todos/today', requireAuth, async (req, res) => {
  try {
    const todos = await db.getTodayTodos();
    res.json({ todos, date: new Date().toISOString().split('T')[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/todos', requireAuth, async (req, res) => {
  try {
    const { description, date } = req.body;
    if (!description || !description.trim()) return res.status(400).json({ error: '请输入待办内容' });
    if (!date) return res.status(400).json({ error: '请选择日期' });
    await db.createTodo(description.trim(), date, req.session.userId);
    const todos = await db.getTodosByDate(date);
    res.json({ success: true, todos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/todos/:id', requireAuth, async (req, res) => {
  try {
    const { description, date } = req.body;
    await db.updateTodo(Number(req.params.id), description.trim());
    const todos = await db.getTodosByDate(date);
    res.json({ success: true, todos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/todos/:id/toggle', requireAuth, async (req, res) => {
  try {
    const { date } = req.body;
    const result = await db.toggleTodo(Number(req.params.id), req.session.userId);
    if (!result) return res.status(404).json({ error: '待办不存在' });
    const todos = await db.getTodosByDate(date);
    res.json({ success: true, todos, toggleResult: result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/todos/:id', requireAuth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    await db.deleteTodo(Number(req.params.id));
    const todos = await db.getTodosByDate(date);
    res.json({ success: true, todos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// 情话路由
// ============================================================
app.get('/api/quote', async (req, res) => {
  try {
    const quote = await db.getRandomQuote();
    res.json({ quote });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// SPA 回退
// ============================================================
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: '接口不存在' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// 启动（本地开发用，Vercel 不走这里）
// ============================================================
if (require.main === module) {
  (async () => {
    try {
      await db.initialize();
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`💕 情侣记账系统 http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('启动失败:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = app;
