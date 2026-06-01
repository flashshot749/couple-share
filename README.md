# 💕 情侣双人专属记账共享系统

> 双人记账 + 共享日历待办 + 每日恋爱情话 · 专属二人世界

---

## 📋 功能模块

### 💰 双人记账
- 支出/收入录入，填写金额、事由、日期
- 当日/月度/年度统计：单人 + 两人合计
- 账本相互可见，但只能编辑删除自己的账单
- 按月筛选查看，日期倒序排列

### 📅 共享日历待办
- 公历月历组件，点击任意日期管理待办
- 首页顶部醒目展示【今日待办】
- 双方实时同步（刷新页面即时更新）
- 标记已完成（划线变色样式区分）

### 💌 每日情话
- 每次打开首页随机展示一句恋爱甜句
- 内置 50 条情话素材库
- 支持手动换一句

---

## 🚀 快速启动

### 环境要求
- **Node.js** >= 16.x（推荐 18.x LTS）
- 无需额外安装数据库（SQLite 内嵌）

### 1. 安装依赖
```bash
cd couple-share
npm install
```

### 2. 启动项目
```bash
npm start
```

### 3. 访问系统
浏览器打开：
```
http://localhost:3000
```

### 4. 登录账号
| 用户名 | 默认密码 | 显示名称 |
|--------|---------|---------|
| `哞哞` | `1314520` | 哞哞（女生） |
| `喵喵` | `1314520` | 喵喵（男生） |

> ⚠️ **重要**：首次登录后请立即在设置中修改密码！

---

## 🌐 部署上线（生成公网访问链接）

### 方式一：云服务器部署（推荐）

**1. 购买云服务器**（阿里云/腾讯云/华为云均可，最低 1核1G）

**2. 安装 Node.js**
```bash
# Ubuntu/Debian 系统
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**3. 上传项目并安装依赖**
```bash
# 将整个 couple-share 文件夹上传到服务器
scp -r couple-share root@你的服务器IP:/home/
ssh root@你的服务器IP
cd /home/couple-share
npm install
```

**4. 使用 PM2 守护进程运行**
```bash
npm install -g pm2
pm2 start server.js --name couple-share
pm2 save
pm2 startup  # 设置开机自启
```

**5. 配置防火墙开放端口**
```bash
# 云服务器控制台安全组中开放 3000 端口
# 或使用 Nginx 反向代理到 80 端口（推荐）
```

**6. 访问**
```
http://你的服务器IP:3000
```

---

### 方式二：使用 Nginx 反向代理 + 域名访问

```nginx
# /etc/nginx/sites-available/couple-share
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/couple-share /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

访问：`http://your-domain.com`

---

### 方式三：免费快速部署（推荐新手）

使用 **Railway** / **Render** / **Fly.io** 等 PaaS 平台免费部署：

1. 将项目上传到 GitHub 仓库
2. 在 Railway/Render 中导入该仓库
3. 设置启动命令：`npm start`
4. 自动生成公网访问 URL

---

## 🔧 自定义修改指南

### 修改账号密码

**方式一：在网页中修改（推荐）**
登录后 → 点击右上角 ⚙️ 设置 → 修改密码

**方式二：重置所有数据重新开始**
```bash
# 删除数据库文件（重启项目会自动重建）
rm data/couple_share.db
npm start
```

**方式三：直接修改数据库**
```bash
# 安装 sqlite3 命令行工具后
sqlite3 data/couple_share.db
# 查看用户
SELECT * FROM users;
# 手动更新密码（需要 bcrypt 加密，建议用方式一）
```

### 修改默认账号信息

编辑 `database.js`，找到 `seedDefaultUsers` 函数：

```javascript
// 修改默认用户名和显示名称
insertUser.run('你的账号名', defaultPassword, '你的昵称');
insertUser.run('她的账号名', defaultPassword, '她的昵称');
```

修改后删除 `data/couple_share.db` 重新启动即可。

### 添加/修改情话库

编辑 `database.js`，找到 `seedLoveQuotes` 函数中的 `quotes` 数组：

```javascript
const quotes = [
  { quote: '你的情话内容', author: '出处（可选）' },
  { quote: '另一条情话', author: '' },
  // ... 继续添加
];
```

添加后删除 `data/couple_share.db` 重新启动，或直接操作数据库新增。

### 修改默认端口

```bash
# 启动时指定端口
PORT=8080 npm start
```

或在 `server.js` 中修改 `PORT` 变量默认值。

---

## 📁 项目目录结构

```
couple-share/
├── server.js              # Express 后端主入口 + API 路由
├── database.js            # SQLite 数据库初始化 + 查询函数
├── package.json           # 项目依赖配置
├── README.md              # 本文档
├── data/                  # SQLite 数据库文件（自动创建）
│   └── couple_share.db
└── public/                # 前端静态文件
    ├── index.html         # 主页面 SPA（登录页 + 首页 + 记账 + 日历）
    ├── css/
    │   └── style.css      # 自定义样式（动画、日历、待办）
    └── js/
        ├── api.js         # API 通信封装
        ├── auth.js        # 登录/认证模块
        ├── app.js         # 主应用入口 + 页面切换
        ├── bills.js       # 记账模块
        ├── todos.js       # 首页待办模块
        └── calendar.js    # 日历 + 日历待办模块
```

---

## 📡 API 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 登录 |
| POST | `/api/logout` | 退出 |
| GET | `/api/me` | 获取当前用户 |
| PUT | `/api/user/password` | 修改密码 |
| GET | `/api/bills` | 获取账单列表 |
| POST | `/api/bills` | 新增账单 |
| PUT | `/api/bills/:id` | 编辑账单 |
| DELETE | `/api/bills/:id` | 删除账单 |
| GET | `/api/bills/stats` | 统计数据 |
| GET | `/api/todos` | 获取待办 |
| GET | `/api/todos/today` | 今日待办 |
| POST | `/api/todos` | 新增待办 |
| PUT | `/api/todos/:id` | 更新待办 |
| PUT | `/api/todos/:id/toggle` | 切换完成 |
| DELETE | `/api/todos/:id` | 删除待办 |
| GET | `/api/quote` | 随机情话 |

---

## ⚠️ 安全注意事项

1. **立即修改默认密码**：首次登录后务必修改 partner1 和 partner2 的密码
2. **生产环境 Session Secret**：编辑 `server.js` 修改 `secret` 值为随机字符串
3. **HTTPS**：公网部署时强烈建议配置 SSL 证书（Let's Encrypt 免费）
4. **防火墙**：仅开放必要端口，建议使用 Nginx 反向代理

---

## 🛠 技术栈

- **前端**：HTML5 + TailwindCSS (CDN) + Vanilla JavaScript
- **后端**：Node.js + Express
- **数据库**：SQLite (better-sqlite3)
- **认证**：Session-based + bcryptjs
- **部署**：单进程 Node 服务，零外部依赖数据库

---

💕 Made with love for two.
