/**
 * database.js - 数据库模块（Vercel Postgres 版）
 * 基于 @vercel/postgres，免费 256MB，两人用绰绰有余
 * 情侣双人记账系统 - 数据持久化层
 */

const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

// ============================================================
// 数据库初始化：创建表结构（幂等，重复执行无副作用）
// ============================================================
async function initDatabase() {
  console.log('[数据库] 初始化表结构...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bills (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('expense','income')),
      amount REAL NOT NULL CHECK(amount > 0),
      description TEXT NOT NULL DEFAULT '',
      bill_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      description TEXT NOT NULL,
      todo_date DATE NOT NULL,
      completed INTEGER DEFAULT 0,
      created_by INTEGER NOT NULL REFERENCES users(id),
      completed_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS love_quotes (
      id SERIAL PRIMARY KEY,
      quote TEXT NOT NULL,
      author TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  console.log('[数据库] 表结构初始化完成');
}

// ============================================================
// 初始数据填充（首次运行时自动插入）
// ============================================================
async function seedDefaultUsers() {
  const { rowCount } = await sql`SELECT COUNT(*) as count FROM users`;
  if (rowCount > 0 && (await sql`SELECT COUNT(*) as count FROM users`).rows[0].count > 0) {
    console.log('[数据库] 用户已存在，跳过初始化');
    return;
  }

  console.log('[数据库] 创建默认双人账号...');
  const salt = bcrypt.genSaltSync(10);
  const pwd = bcrypt.hashSync('1314520', salt);

  await sql`INSERT INTO users (username, password_hash, display_name) VALUES ('哞哞', ${pwd}, '哞哞 ♀')`;
  await sql`INSERT INTO users (username, password_hash, display_name) VALUES ('喵喵', ${pwd}, '喵喵 ♂')`;

  console.log('[数据库] ✅ 哞哞(女生) / 喵喵(男生) 已创建');
}

async function seedLoveQuotes() {
  const { rows } = await sql`SELECT COUNT(*) as count FROM love_quotes`;
  if (rows[0].count > 0) { console.log('[数据库] 情话库已存在'); return; }

  console.log('[数据库] 导入情话...');
  const quotes = [
    ['遇见你，是我这辈子最美丽的意外。','佚名'],
    ['你是我遇见的所有美好里的刚刚好。','佚名'],
    ['世界很大，但我的心很小，小到只能装下你一个人。','佚名'],
    ['余生漫漫，爱你不止三千遍。','佚名'],
    ['和你在一起的日子，每一天都值得被珍藏。','佚名'],
    ['喜欢是乍见之欢，爱是久处不厌。','佚名'],
    ['我不想做你的路人，我只想做你的心上人。','佚名'],
    ['所谓幸福，就是有一个愿意听你讲废话的人。','佚名'],
    ['我的世界原本是一片荒芜，直到你来。','佚名'],
    ['最好的爱情，是两个人一起变成更好的人。','佚名'],
    ['有你的地方，就是家。','佚名'],
    ['你是我平淡生活里的光。','佚名'],
    ['一见钟情是你，日久生情也是你。','佚名'],
    ['你若安好，便是晴天。','佚名'],
    ['爱不是彼此凝视，而是一起朝同一个方向看。','圣埃克苏佩里'],
    ['陪伴是最长情的告白。','佚名'],
    ['在所有人声鼎沸的欢喜里，我唯独望向你。','佚名'],
    ['我目光短浅，眼里只有你。','佚名'],
    ['你若不离不弃，我必生死相依。','佚名'],
    ['爱你，是我做过的最好的事。','佚名'],
    ['人间烟火，山河远阔，无一是你，无一不是你。','佚名'],
    ['我想和你一起慢慢变老。','佚名'],
    ['你的笑容，是我每天最想看到的风景。','佚名'],
    ['三生有幸遇见你，纵使悲凉也是情。','佚名'],
    ['春风十里不如你。','冯唐'],
    ['这世间虽有千般好，但唯有你最珍贵。','佚名'],
    ['愿得一人心，白首不相离。','卓文君'],
    ['山有木兮木有枝，心悦君兮君不知。','佚名'],
    ['执子之手，与子偕老。','《诗经》'],
    ['你是我始料不及的遇见，也是我突如其来的欢喜。','佚名'],
    ['在这善变的世界，我想和你看一看永远。','佚名'],
    ['一生至少该有一次，为了某个人而忘了自己。','佚名'],
    ['我想要的很简单，时光还在，你还在。','佚名'],
    ['你是年少的欢喜，倒过来念也是。','佚名'],
    ['和你在一起的时光，全都很耀眼。','佚名'],
    ['世间万物论沧桑，你在心上作中央。','佚名'],
    ['入目无别人，四下皆是你。','佚名'],
    ['从此以后，你有我，我有你，我们有一个家。','佚名'],
    ['往后余生，风雪是你，平淡是你，清贫也是你。','马良'],
    ['世间美好与你环环相扣。','佚名'],
    ['你是我的可遇不可求。','佚名'],
    ['喜欢一个人，始于颜值，陷于才华，忠于人品。','佚名'],
    ['乍见心欢，小别思恋，久处仍怦然。','佚名'],
    ['我携星辰以赠你，仍觉星辰不如你。','佚名'],
    ['你是我今生渡不过的劫，多看一眼就心软，拥抱一下就沦陷。','佚名'],
    ['愿岁月可回首，且以深情共白头。','佚名'],
    ['谢谢你，在这个世界的角落，找到了我。','佚名'],
    ['一天一月一起一年一生。','佚名'],
    ['因为有你，我变成了更好的自己。','佚名'],
  ];
  for (const [q, a] of quotes) {
    await sql`INSERT INTO love_quotes (quote, author) VALUES (${q}, ${a})`;
  }
  console.log(`[数据库] ✅ ${quotes.length} 条情话已导入`);
}

// ============================================================
// 用户相关
// ============================================================
async function getUserByUsername(username) {
  const { rows } = await sql`SELECT * FROM users WHERE username = ${username}`;
  return rows[0];
}
async function getUserById(id) {
  const { rows } = await sql`SELECT id, username, display_name FROM users WHERE id = ${id}`;
  return rows[0];
}
async function updatePassword(userId, hash) {
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`;
}

// ============================================================
// 账单相关
// ============================================================
async function createBill(userId, type, amount, description, billDate) {
  const { rows } = await sql`
    INSERT INTO bills (user_id, type, amount, description, bill_date)
    VALUES (${userId}, ${type}, ${amount}, ${description}, ${billDate})
    RETURNING id
  `;
  return rows[0].id;
}

async function deleteBill(billId, userId) {
  const { rowCount } = await sql`DELETE FROM bills WHERE id = ${billId} AND user_id = ${userId}`;
  return rowCount > 0;
}

async function updateBill(billId, userId, type, amount, description, billDate) {
  const { rowCount } = await sql`
    UPDATE bills SET type=${type}, amount=${amount}, description=${description}, bill_date=${billDate}
    WHERE id=${billId} AND user_id=${userId}
  `;
  return rowCount > 0;
}

async function getBills(year, month) {
  let query = sql`
    SELECT b.*, u.display_name as creator_name
    FROM bills b JOIN users u ON b.user_id = u.id
  `;
  if (year && month) {
    query = sql`${query} WHERE EXTRACT(YEAR FROM b.bill_date) = ${Number(year)} AND EXTRACT(MONTH FROM b.bill_date) = ${Number(month)}`;
  }
  query = sql`${query} ORDER BY b.bill_date DESC, b.created_at DESC`;
  const { rows } = await query;
  return rows;
}

async function getBillById(billId) {
  const { rows } = await sql`
    SELECT b.*, u.display_name as creator_name
    FROM bills b JOIN users u ON b.user_id = u.id WHERE b.id = ${billId}
  `;
  return rows[0];
}

async function getBillStats(userId, startDate, endDate) {
  let expenseQuery = sql`SELECT COALESCE(SUM(amount), 0) as total FROM bills WHERE type = 'expense' AND bill_date >= ${startDate} AND bill_date <= ${endDate}`;
  let incomeQuery = sql`SELECT COALESCE(SUM(amount), 0) as total FROM bills WHERE type = 'income' AND bill_date >= ${startDate} AND bill_date <= ${endDate}`;
  if (userId) {
    expenseQuery = sql`${expenseQuery} AND user_id = ${userId}`;
    incomeQuery = sql`${incomeQuery} AND user_id = ${userId}`;
  }
  const [er, ir] = await Promise.all([expenseQuery, incomeQuery]);
  return { total_expense: er.rows[0].total, total_income: ir.rows[0].total };
}

// ============================================================
// 待办相关
// ============================================================
async function createTodo(description, todoDate, createdBy) {
  const { rows } = await sql`
    INSERT INTO todos (description, todo_date, created_by) VALUES (${description}, ${todoDate}, ${createdBy})
    RETURNING id
  `;
  return rows[0].id;
}
async function toggleTodo(todoId, userId) {
  const { rows } = await sql`SELECT * FROM todos WHERE id = ${todoId}`;
  if (!rows[0]) return null;
  const todo = rows[0];
  const newStatus = todo.completed ? 0 : 1;
  await sql`UPDATE todos SET completed = ${newStatus}, completed_by = ${newStatus ? userId : null} WHERE id = ${todoId}`;
  return { completed: newStatus, completed_by: newStatus ? userId : null };
}
async function updateTodo(todoId, description) {
  const { rowCount } = await sql`UPDATE todos SET description = ${description} WHERE id = ${todoId}`;
  return rowCount > 0;
}
async function deleteTodo(todoId) {
  const { rowCount } = await sql`DELETE FROM todos WHERE id = ${todoId}`;
  return rowCount > 0;
}
async function getTodosByDate(date) {
  const { rows } = await sql`
    SELECT t.*, u.display_name as creator_name, u2.display_name as completer_name
    FROM todos t
    JOIN users u ON t.created_by = u.id
    LEFT JOIN users u2 ON t.completed_by = u2.id
    WHERE t.todo_date = ${date}
    ORDER BY t.completed ASC, t.created_at DESC
  `;
  return rows;
}
async function getTodayTodos() {
  return getTodosByDate(new Date().toISOString().split('T')[0]);
}

// ============================================================
// 情话
// ============================================================
async function getRandomQuote() {
  const { rows } = await sql`SELECT * FROM love_quotes ORDER BY RANDOM() LIMIT 1`;
  return rows[0];
}

// ============================================================
// 初始化（异步）
// ============================================================
async function initialize() {
  await initDatabase();
  await seedDefaultUsers();
  await seedLoveQuotes();
  console.log('[数据库] ✅ 初始化完成');
}

module.exports = {
  initialize, getUserByUsername, getUserById, updatePassword,
  createBill, deleteBill, updateBill, getBills, getBillById, getBillStats,
  createTodo, toggleTodo, updateTodo, deleteTodo, getTodosByDate, getTodayTodos,
  getRandomQuote,
};
