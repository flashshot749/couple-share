/**
 * api/index.js - Vercel Serverless 入口
 * 每个请求进来时初始化数据库连接，然后交给 Express 处理
 */

const app = require('../server.js');
const db = require('../database.js');

// Vercel Serverless 冷启动时初始化数据库
let initialized = false;

module.exports = async function handler(req, res) {
  if (!initialized) {
    await db.initialize();
    initialized = true;
  }
  return app(req, res);
};
