<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";

const visible = ref(false);
const username = ref("");
const password = ref("");
const loading = ref(false);

function checkCredentials() {
  const u = localStorage.getItem("basic_auth_username");
  const p = localStorage.getItem("basic_auth_password");
  if (!u || !p) {
    visible.value = true;
  }
}

function onAuthRequired() {
  visible.value = true;
  ElMessage.warning("认证失败或已过期，请重新输入账号密码");
}

onMounted(() => {
  checkCredentials();
  window.addEventListener("auth:required", onAuthRequired);
});

onUnmounted(() => {
  window.removeEventListener("auth:required", onAuthRequired);
});

function handleSubmit() {
  if (!username.value.trim() || !password.value.trim()) {
    ElMessage.warning("请输入账号和密码");
    return;
  }
  loading.value = true;
  localStorage.setItem("basic_auth_username", username.value.trim());
  localStorage.setItem("basic_auth_password", password.value.trim());
  visible.value = false;
  loading.value = false;
  ElMessage.success("认证信息已保存");
  // 刷新当前页面，让所有请求带上新凭据
  window.location.reload();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="auth-fade">
      <div v-if="visible" class="auth-overlay" @click.self>
        <div class="auth-dialog">
          <!-- Header -->
          <div class="auth-header">
            <div class="auth-icon">🔐</div>
            <h2 class="auth-title">系统身份验证</h2>
            <p class="auth-subtitle">火眼智擎 — 请输入授权账号密码</p>
          </div>

          <!-- Form -->
          <div class="auth-body">
            <div class="auth-field">
              <label class="auth-label">账号</label>
              <input
                v-model="username"
                type="text"
                class="auth-input"
                placeholder="请输入用户名"
                autocomplete="username"
                @keyup.enter="handleSubmit"
              />
            </div>
            <div class="auth-field">
              <label class="auth-label">密码</label>
              <input
                v-model="password"
                type="password"
                class="auth-input"
                placeholder="请输入密码"
                autocomplete="current-password"
                @keyup.enter="handleSubmit"
              />
            </div>
          </div>

          <!-- Footer -->
          <div class="auth-footer">
            <button
              class="auth-submit"
              :disabled="loading"
              @click="handleSubmit"
            >
              {{ loading ? '验证中...' : '登 录' }}
            </button>
            <p class="auth-hint">
              <span class="auth-hint-icon">ℹ️</span>
              内部系统，仅授权人员可访问
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.auth-dialog {
  width: 400px;
  max-width: 90vw;
  background: #fff;
  border-radius: 16px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  animation: auth-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes auth-slide-up {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.auth-header {
  background: linear-gradient(135deg, #1A3A5C 0%, #1E4060 50%, #2C5F8A 100%);
  padding: 32px 32px 28px;
  text-align: center;
}

.auth-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.auth-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px;
  letter-spacing: 0.5px;
}

.auth-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
}

.auth-body {
  padding: 28px 32px 8px;
}

.auth-field {
  margin-bottom: 20px;
}

.auth-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.auth-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  border: 1.5px solid #D1D5DB;
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;
  background: #F9FAFB;
  color: #1F2937;
  box-sizing: border-box;
}

.auth-input:focus {
  border-color: #1A3A5C;
  box-shadow: 0 0 0 3px rgba(26, 58, 92, 0.12);
  background: #fff;
}

.auth-input::placeholder {
  color: #9CA3AF;
}

.auth-footer {
  padding: 8px 32px 28px;
}

.auth-submit {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #1A3A5C 0%, #2C5F8A 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 2px;
}

.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(26, 58, 92, 0.35);
}

.auth-submit:active:not(:disabled) {
  transform: translateY(0);
}

.auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: #9CA3AF;
  margin: 16px 0 0;
}

.auth-hint-icon {
  font-size: 12px;
}

/* Transition */
.auth-fade-enter-active,
.auth-fade-leave-active {
  transition: opacity 0.25s ease;
}
.auth-fade-enter-from,
.auth-fade-leave-to {
  opacity: 0;
}
</style>
