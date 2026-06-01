/**
 * database.js - SQLite 数据库模块（基于 sql.js WASM 引擎）
 * 纯 JavaScript 实现，无需任何原生编译工具
 * 情侣双人记账系统 - 数据持久化层
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'data', 'couple_share.db');

// SQL.js 数据库实例
let db = null;

// 事务嵌套标志：sql.js 中 db.export() 会结束事务，
// 所以事务期间必须跳过自动保存，等 COMMIT/ROLLBACK 后统一保存
let inTransaction = false;

// ============================================================
// sql.js 便捷封装器
// 提供类似 better-sqlite3 的 API（prepare / get / all / run）
// ============================================================

/** 执行查询，返回所有匹配行（对象数组） */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/** 执行查询，返回第一行（对象），无结果返回 undefined */
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

/** 执行写操作（INSERT/UPDATE/DELETE），返回 { changes, lastInsertRowid } */
function executeRun(sql, params = []) {
  db.run(sql, params);
  // sql.js 的 db.run() 不返回 changes/lastInsertRowid，用额外查询获取
  const lastId = queryOne('SELECT last_insert_rowid() as id');
  const changes = queryOne('SELECT changes() as count');
  // 事务期间不保存（db.export() 会结束事务），等 COMMIT 后统一保存
  if (!inTransaction) {
    saveDatabase();
  }
  return {
    changes: changes ? changes.count : 0,
    lastInsertRowid: lastId ? lastId.id : 0,
  };
}

/** 执行原始 SQL（CREATE TABLE 等 DDL），不自动保存 */
function executeRaw(sql) {
  db.exec(sql);
}

/**
 * 执行事务：回调中所有写操作在一个事务中完成
 * 注意：sql.js 中 db.export() 会结束事务，所以事务期间不保存，
 * 全部操作完成后统一持久化到磁盘
 */
function transaction(fn) {
  db.run('BEGIN TRANSACTION');
  inTransaction = true;
  try {
    fn();
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  } finally {
    inTransaction = false;
    saveDatabase();  // 事务结束后统一保存
  }
}

/** 将内存数据库持久化到磁盘 */
function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('[数据库] 保存失败:', err.message);
  }
}

// ============================================================
// 数据库初始化（异步：加载 WASM + 读取或创建数据库文件）
// ============================================================
async function initDatabase() {
  console.log('[数据库] 正在加载 SQL.js WASM 引擎...');

  // 初始化 sql.js（自动加载 WASM 文件）
  const SQL = await initSqlJs();

  // 尝试从磁盘加载已有数据库文件
  if (fs.existsSync(DB_PATH)) {
    console.log('[数据库] 加载已有数据库文件...');
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    console.log('[数据库] 创建新数据库...');
    db = new SQL.Database();
    // 确保 data 目录存在
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  console.log('[数据库] 正在初始化表结构...');

  // 创建表结构
  executeRaw(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  executeRaw(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense','income')),
      amount REAL NOT NULL CHECK(amount > 0),
      description TEXT NOT NULL DEFAULT '',
      bill_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  executeRaw(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      todo_date DATE NOT NULL,
      completed INTEGER DEFAULT 0,
      created_by INTEGER NOT NULL,
      completed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (completed_by) REFERENCES users(id)
    )
  `);

  executeRaw(`
    CREATE TABLE IF NOT EXISTS love_quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote TEXT NOT NULL,
      author TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // DDL 执行完后保存到磁盘
  saveDatabase();
  console.log('[数据库] 表结构初始化完成');
}

// ============================================================
// 用户相关操作
// ============================================================

function seedDefaultUsers() {
  const existing = queryOne('SELECT COUNT(*) as count FROM users');
  if (existing && existing.count > 0) {
    console.log('[数据库] 用户已存在，跳过初始化');
    return;
  }

  console.log('[数据库] 正在创建默认双人账号...');
  const salt = bcrypt.genSaltSync(10);
  const defaultPassword = bcrypt.hashSync('1314520', salt);

  executeRun('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)',
    ['哞哞', defaultPassword, '哞哞 ♀']);
  executeRun('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)',
    ['喵喵', defaultPassword, '喵喵 ♂']);

  console.log('[数据库] 默认账号创建完成：哞哞(女生) / 喵喵(男生)');
  console.log('[数据库] 🔑  初始密码：1314520');
}

function getUserByUsername(username) {
  return queryOne('SELECT * FROM users WHERE username = ?', [username]);
}

function getUserById(id) {
  return queryOne('SELECT id, username, display_name FROM users WHERE id = ?', [id]);
}

function updatePassword(userId, newPasswordHash) {
  return executeRun('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);
}

function updateDisplayName(userId, newName) {
  return executeRun('UPDATE users SET display_name = ? WHERE id = ?', [newName, userId]);
}

// ============================================================
// 账单相关操作
// ============================================================

function createBill(userId, type, amount, description, billDate) {
  const result = executeRun(
    'INSERT INTO bills (user_id, type, amount, description, bill_date) VALUES (?, ?, ?, ?, ?)',
    [userId, type, amount, description, billDate]
  );
  return result.lastInsertRowid;
}

function deleteBill(billId, userId) {
  const result = executeRun(
    'DELETE FROM bills WHERE id = ? AND user_id = ?',
    [billId, userId]
  );
  return result.changes > 0;
}

function updateBill(billId, userId, type, amount, description, billDate) {
  const result = executeRun(
    'UPDATE bills SET type=?, amount=?, description=?, bill_date=? WHERE id=? AND user_id=?',
    [type, amount, description, billDate, billId, userId]
  );
  return result.changes > 0;
}

function getBills(year, month) {
  let sql = `
    SELECT b.*, u.display_name as creator_name
    FROM bills b
    JOIN users u ON b.user_id = u.id
  `;
  const params = [];

  if (year && month) {
    sql += ` WHERE strftime('%Y', b.bill_date) = ? AND strftime('%m', b.bill_date) = ?`;
    params.push(String(year), String(month).padStart(2, '0'));
  }

  sql += ` ORDER BY b.bill_date DESC, b.created_at DESC`;
  return queryAll(sql, params);
}

function getBillById(billId) {
  return queryOne(`
    SELECT b.*, u.display_name as creator_name
    FROM bills b JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `, [billId]);
}

function getBillStats(userId, startDate, endDate) {
  let expenseSql = `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM bills
    WHERE type = 'expense' AND bill_date >= ? AND bill_date <= ?
  `;
  let incomeSql = `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM bills
    WHERE type = 'income' AND bill_date >= ? AND bill_date <= ?
  `;
  const params = [startDate, endDate];

  if (userId) {
    expenseSql += ' AND user_id = ?';
    incomeSql += ' AND user_id = ?';
    params.push(userId);
  }

  const expenseRow = queryOne(expenseSql, [...params]);
  // 重新构建 income 参数（因为上面 push 了 userId 两次）
  const incomeParams = [startDate, endDate];
  if (userId) incomeParams.push(userId);
  const incomeRow = queryOne(incomeSql, incomeParams);

  return {
    total_expense: expenseRow ? expenseRow.total : 0,
    total_income: incomeRow ? incomeRow.total : 0,
  };
}

// ============================================================
// 日程待办相关操作
// ============================================================

function createTodo(description, todoDate, createdBy) {
  const result = executeRun(
    'INSERT INTO todos (description, todo_date, created_by) VALUES (?, ?, ?)',
    [description, todoDate, createdBy]
  );
  return result.lastInsertRowid;
}

function toggleTodo(todoId, userId) {
  const todo = queryOne('SELECT * FROM todos WHERE id = ?', [todoId]);
  if (!todo) return null;

  const newStatus = todo.completed ? 0 : 1;
  const completedBy = newStatus ? userId : null;

  executeRun(
    'UPDATE todos SET completed = ?, completed_by = ? WHERE id = ?',
    [newStatus, completedBy, todoId]
  );

  return { completed: newStatus, completed_by: completedBy };
}

function updateTodo(todoId, description) {
  const result = executeRun(
    'UPDATE todos SET description = ? WHERE id = ?',
    [description, todoId]
  );
  return result.changes > 0;
}

function deleteTodo(todoId) {
  const result = executeRun('DELETE FROM todos WHERE id = ?', [todoId]);
  return result.changes > 0;
}

function getTodosByDate(date) {
  return queryAll(`
    SELECT t.*, u.display_name as creator_name,
           u2.display_name as completer_name
    FROM todos t
    JOIN users u ON t.created_by = u.id
    LEFT JOIN users u2 ON t.completed_by = u2.id
    WHERE t.todo_date = ?
    ORDER BY t.completed ASC, t.created_at DESC
  `, [date]);
}

function getTodayTodos() {
  const today = new Date().toISOString().split('T')[0];
  return getTodosByDate(today);
}

// ============================================================
// 情话相关操作
// ============================================================

function getRandomQuote() {
  return queryOne('SELECT * FROM love_quotes ORDER BY RANDOM() LIMIT 1');
}

function seedLoveQuotes() {
  const count = queryOne('SELECT COUNT(*) as count FROM love_quotes');
  if (count && count.count > 0) {
    console.log('[数据库] 情话库已有数据，跳过初始化');
    return;
  }

  console.log('[数据库] 正在导入情话素材库...');

  const quotes = [
    { quote: '遇见你，是我这辈子最美丽的意外。', author: '佚名' },
    { quote: '你是我遇见的所有美好里的刚刚好。', author: '佚名' },
    { quote: '世界很大，但我的心很小，小到只能装下你一个人。', author: '佚名' },
    { quote: '余生漫漫，爱你不止三千遍。', author: '佚名' },
    { quote: '和你在一起的日子，每一天都值得被珍藏。', author: '佚名' },
    { quote: '喜欢是乍见之欢，爱是久处不厌。', author: '佚名' },
    { quote: '我不想做你的路人，我只想做你的心上人。', author: '佚名' },
    { quote: '所谓幸福，就是有一个愿意听你讲废话的人。', author: '佚名' },
    { quote: '我的世界原本是一片荒芜，直到你来。', author: '佚名' },
    { quote: '最好的爱情，是两个人一起变成更好的人。', author: '佚名' },
    { quote: '有你的地方，就是家。', author: '佚名' },
    { quote: '你是我平淡生活里的光。', author: '佚名' },
    { quote: '一见钟情是你，日久生情也是你。', author: '佚名' },
    { quote: '你若安好，便是晴天。', author: '佚名' },
    { quote: '爱不是彼此凝视，而是一起朝同一个方向看。', author: '圣埃克苏佩里' },
    { quote: '陪伴是最长情的告白。', author: '佚名' },
    { quote: '在所有人声鼎沸的欢喜里，我唯独望向你。', author: '佚名' },
    { quote: '我目光短浅，眼里只有你。', author: '佚名' },
    { quote: '你若不离不弃，我必生死相依。', author: '佚名' },
    { quote: '爱你，是我做过的最好的事。', author: '佚名' },
    { quote: '人间烟火，山河远阔，无一是你，无一不是你。', author: '佚名' },
    { quote: '我想和你一起慢慢变老。', author: '佚名' },
    { quote: '你的笑容，是我每天最想看到的风景。', author: '佚名' },
    { quote: '三生有幸遇见你，纵使悲凉也是情。', author: '佚名' },
    { quote: '春风十里不如你。', author: '冯唐' },
    { quote: '这世间虽有千般好，但唯有你最珍贵。', author: '佚名' },
    { quote: '你是我患得患失的梦，我是你可有可无的人。', author: '佚名' },
    { quote: '愿得一人心，白首不相离。', author: '卓文君' },
    { quote: '山有木兮木有枝，心悦君兮君不知。', author: '佚名' },
    { quote: '执子之手，与子偕老。', author: '《诗经》' },
    { quote: '你是我始料不及的遇见，也是我突如其来的欢喜。', author: '佚名' },
    { quote: '在这善变的世界，我想和你看一看永远。', author: '佚名' },
    { quote: '一生至少该有一次，为了某个人而忘了自己。', author: '佚名' },
    { quote: '我想要的很简单，时光还在，你还在。', author: '佚名' },
    { quote: '你是年少的欢喜，倒过来念也是。', author: '佚名' },
    { quote: '和你在一起的时光，全都很耀眼。', author: '佚名' },
    { quote: '世间万物论沧桑，你在心上作中央。', author: '佚名' },
    { quote: '入目无别人，四下皆是你。', author: '佚名' },
    { quote: '从此以后，你有我，我有你，我们有一个家。', author: '佚名' },
    { quote: '往后余生，风雪是你，平淡是你，清贫也是你。', author: '马良' },
    { quote: '世间美好与你环环相扣。', author: '佚名' },
    { quote: '你是我的可遇不可求。', author: '佚名' },
    { quote: '喜欢一个人，始于颜值，陷于才华，忠于人品。', author: '佚名' },
    { quote: '乍见心欢，小别思恋，久处仍怦然。', author: '佚名' },
    { quote: '我携星辰以赠你，仍觉星辰不如你。', author: '佚名' },
    { quote: '你是我今生渡不过的劫，多看一眼就心软，拥抱一下就沦陷。', author: '佚名' },
    { quote: '愿岁月可回首，且以深情共白头。', author: '佚名' },
    { quote: '谢谢你，在这个世界的角落，找到了我。', author: '佚名' },
    { quote: '一天一月一起一年一生。', author: '佚名' },
    { quote: '因为有你，我变成了更好的自己。', author: '佚名' },
  ];

  transaction(() => {
    for (const item of quotes) {
      executeRun('INSERT INTO love_quotes (quote, author) VALUES (?, ?)',
        [item.quote, item.author]);
    }
  });

  console.log(`[数据库] 已导入 ${quotes.length} 条情话`);
}

// ============================================================
// 初始化执行（异步）
// ============================================================
async function initialize() {
  await initDatabase();
  seedDefaultUsers();
  seedLoveQuotes();
  console.log('[数据库] ✅ 数据库初始化全部完成');
}

// 导出模块接口（与 better-sqlite3 版本 API 一致）
module.exports = {
  initialize,
  // 用户
  getUserByUsername,
  getUserById,
  updatePassword,
  updateDisplayName,
  // 账单
  createBill,
  deleteBill,
  updateBill,
  getBills,
  getBillById,
  getBillStats,
  // 待办
  createTodo,
  toggleTodo,
  updateTodo,
  deleteTodo,
  getTodosByDate,
  getTodayTodos,
  // 情话
  getRandomQuote,
};
