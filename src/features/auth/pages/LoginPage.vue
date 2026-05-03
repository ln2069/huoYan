<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, Connection } from '@element-plus/icons-vue';
import axios from 'axios';
import { saveJwtSession, saveBasicSession, saveUserInfo } from '@/services/auth/authService';

const router = useRouter();
const loading = ref(false);
const loginForm = ref({ username: '', password: '' });

const handleLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入账号和密码');
    return;
  }

  loading.value = true;
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

  try {
    // 调用后端 JWT 登录接口
    // 后端直接返回 { access_token, token_type, expires_in }（无 code/data 包装层）
    const res = await axios.post(`${apiBase}/auth/login`, {
      username: loginForm.value.username,
      password: loginForm.value.password,
    });

    const { access_token, expires_in } = res.data;
    if (!access_token) throw new Error('no_token');

    saveJwtSession(access_token, expires_in ?? 28800);
    saveUserInfo({ name: '检察官 李明', role: '高级分析员' });
    ElMessage.success('登录成功，欢迎回来');
    router.push('/dashboard');
  } catch (error: any) {
    if (error.response?.status === 401) {
      ElMessage.error('账号或密码错误，请检查后重试');
    } else if (error.response?.status === 404 || error.message === 'no_token') {
      // 后端未部署 JWT 接口时，降级为 Basic Auth 验证
      try {
        const authHeader = 'Basic ' + btoa(`${loginForm.value.username}:${loginForm.value.password}`);
        await axios.get(`${apiBase}/cases?limit=1`, { headers: { Authorization: authHeader } });
        saveBasicSession(loginForm.value.username, loginForm.value.password);
        saveUserInfo({ name: '检察官 李明', role: '高级分析员' });
        ElMessage.success('登录成功，欢迎回来');
        router.push('/dashboard');
      } catch (fallbackErr: any) {
        if (fallbackErr.response?.status === 401) {
          ElMessage.error('账号或密码错误，请检查后重试');
        } else {
          ElMessage.error('无法连接至分析后端，请检查服务器状态');
        }
      }
    } else {
      ElMessage.error('无法连接至分析后端，请检查服务器状态');
      console.error('Login Error:', error);
    }
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="grid-overlay"></div>
    </div>

    <div class="login-card">
      <div class="login-header">
        <div class="logo-area">
          <div class="logo-hex">
            <el-icon :size="30" color="#fff"><Connection /></el-icon>
          </div>
          <h1 class="brand-title">火眼智擎</h1>
        </div>
        <p class="brand-subtitle">汽配知产保护分析系统 | Intelligence Ops</p>
      </div>

      <div class="login-body">
        <div class="input-group">
          <el-input
            v-model="loginForm.username"
            placeholder="账号 / 警号"
            size="large"
            :prefix-icon="User"
          />
        </div>
        <div class="input-group">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="访问密码"
            size="large"
            show-password
            :prefix-icon="Lock"
            @keyup.enter="handleLogin"
          />
        </div>

        <el-button
          type="primary"
          class="login-submit"
          :loading="loading"
          @click="handleLogin"
        >
          进入系统
        </el-button>

        <div class="login-footer">
          <span class="secure-tag">🔒 JWT 加密通道已开启</span>
        </div>
      </div>
    </div>

    <div class="system-copyright">
      © 2026 智慧检务技术支持中心 | 数据安全分级：机密
    </div>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0F172A;
  overflow: hidden;
  position: relative;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(rgba(30, 41, 59, 0.5) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(30, 41, 59, 0.5) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(circle at center, black, transparent 80%);
}

.circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: #1E40AF;
  top: -100px;
  right: -50px;
  animation: float 15s infinite alternate;
}

.circle-2 {
  width: 500px;
  height: 500px;
  background: #C0392B;
  bottom: -150px;
  left: -100px;
  animation: float 20s infinite alternate-reverse;
}

@keyframes float {
  from { transform: translate(0, 0); }
  to { transform: translate(50px, 50px); }
}

.login-card {
  position: relative;
  z-index: 10;
  width: 420px;
  padding: 48px;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.logo-hex {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
}

.brand-title {
  color: #fff;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 2px;
  margin: 0;
}

.brand-subtitle {
  color: #94A3B8;
  font-size: 12px;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-group {
  margin-bottom: 20px;
}

:deep(.el-input__wrapper) {
  background-color: rgba(15, 23, 42, 0.6) !important;
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  padding: 8px 16px !important;
}

:deep(.el-input__inner) {
  color: #fff !important;
  height: 48px !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #3B82F6 !important;
  background-color: rgba(15, 23, 42, 0.8) !important;
}

.login-submit {
  width: 100%;
  height: 52px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(90deg, #3B82F6 0%, #2563EB 100%);
  border: none;
  margin-top: 10px;
  transition: all 0.3s;
}

.login-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.4);
}

.login-footer {
  margin-top: 32px;
  text-align: center;
}

.secure-tag {
  font-size: 11px;
  color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
}

.system-copyright {
  position: absolute;
  bottom: 24px;
  color: #475569;
  font-size: 11px;
  letter-spacing: 1px;
}
</style>
