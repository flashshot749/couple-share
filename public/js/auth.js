/**
 * auth.js - 登录认证模块
 * 处理用户登录、退出、密码修改
 * 情侣双人记账系统 - 前端认证层
 */

const Auth = {
  /**
   * 用户登录
   */
  async login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    if (!username || !password) {
      errorEl.textContent = '请输入账号和密码';
      errorEl.classList.remove('hidden');
      return;
    }

    // 禁用按钮，显示加载状态
    btn.disabled = true;
    btn.textContent = '登录中...';
    errorEl.classList.add('hidden');

    try {
      const result = await API.login(username, password);
      App.currentUser = result.user;
      App.showApp();
      Toast.show(`欢迎回来，${result.user.display_name} 💕`);
    } catch (error) {
      errorEl.textContent = error.message || '登录失败';
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = '进入我们的空间';
    }
  },

  /**
   * 退出登录
   */
  async logout() {
    if (!confirm('确定要退出登录吗？')) return;
    try {
      await API.logout();
    } catch (e) {
      // 即使请求失败也清除本地状态
    }
    App.currentUser = null;
    App.showLogin();
  },

  /**
   * 检查登录状态（页面初始化时调用）
   */
  async checkSession() {
    try {
      const result = await API.getMe();
      App.currentUser = result.user;
      App.showApp();
    } catch (error) {
      // 未登录，显示登录页
      App.showLogin();
    }
  },
};

/**
 * 修改密码（在设置弹窗中调用）
 */
async function changePassword() {
  const oldPassword = document.getElementById('settings-old-password').value.trim();
  const newPassword = document.getElementById('settings-new-password').value.trim();
  const msgEl = document.getElementById('settings-password-msg');

  if (!oldPassword || !newPassword) {
    msgEl.textContent = '请填写原密码和新密码';
    msgEl.className = 'text-xs text-center mt-2 text-red-400';
    msgEl.classList.remove('hidden');
    return;
  }

  if (newPassword.length < 6) {
    msgEl.textContent = '新密码至少6位';
    msgEl.className = 'text-xs text-center mt-2 text-red-400';
    msgEl.classList.remove('hidden');
    return;
  }

  try {
    await API.changePassword(oldPassword, newPassword);
    msgEl.textContent = '✅ 密码修改成功！';
    msgEl.className = 'text-xs text-center mt-2 text-green-500';
    msgEl.classList.remove('hidden');
    // 清空输入框
    document.getElementById('settings-old-password').value = '';
    document.getElementById('settings-new-password').value = '';
  } catch (error) {
    msgEl.textContent = error.message || '修改失败';
    msgEl.className = 'text-xs text-center mt-2 text-red-400';
    msgEl.classList.remove('hidden');
  }
}

/**
 * 显示设置弹窗
 */
function showSettingsModal() {
  document.getElementById('settings-modal').classList.remove('hidden');
  document.getElementById('settings-password-msg').classList.add('hidden');
  document.getElementById('settings-old-password').value = '';
  document.getElementById('settings-new-password').value = '';
}

/**
 * 关闭设置弹窗
 */
function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

// 登录页面回车键触发登录
document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('login-password');
  if (passwordInput) {
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Auth.login();
    });
  }
});
