/**
 * authService.ts — 统一鉴权服务
 *
 * 后端鉴权事实（以 main.py / api/auth.py 为准）：
 *   - POST /api/auth/login  → { access_token, token_type, expires_in }  (根层级，无 code/data 包装)
 *   - 后端同时接受 Bearer JWT 和 Basic Auth（向后兼容）
 *   - Token 有效期：480 分钟 = 28800 秒（8 小时）
 *   - GET /api/auth/status  → { username, expires_at, remaining_seconds }
 *
 * localStorage key 约定（唯一权威定义）：
 *   jwt_access_token   — JWT Bearer token 字符串
 *   jwt_expires_at     — token 过期时间戳（毫秒，Date.now() 格式）
 *   basic_auth_username / basic_auth_password — 旧 Basic Auth，仅向后兼容保留
 *   user_info          — JSON 字符串 { name, role }
 */

const KEYS = {
  JWT_TOKEN: 'jwt_access_token',
  JWT_EXPIRES_AT: 'jwt_expires_at',
  BASIC_USER: 'basic_auth_username',
  BASIC_PASS: 'basic_auth_password',
  USER_INFO: 'user_info',
} as const;

/** 获取当前有效的 Authorization 头值（JWT 优先，Basic Auth 降级） */
export function getAuthHeader(): string | null {
  const token = localStorage.getItem(KEYS.JWT_TOKEN);
  if (token) return `Bearer ${token}`;

  const u = localStorage.getItem(KEYS.BASIC_USER);
  const p = localStorage.getItem(KEYS.BASIC_PASS);
  if (u && p) return `Basic ${btoa(`${u}:${p}`)}`;

  return null;
}

/** JWT token 是否存在且未过期（含 30 秒冗余） */
export function isTokenValid(): boolean {
  const token = localStorage.getItem(KEYS.JWT_TOKEN);
  if (!token) return false;
  const expiresAt = Number(localStorage.getItem(KEYS.JWT_EXPIRES_AT) ?? 0);
  return expiresAt > Date.now() + 30_000;
}

/** 是否已登录（JWT 或 Basic Auth 任一有效即可） */
export function isLoggedIn(): boolean {
  if (isTokenValid()) return true;
  // Basic Auth 降级：有 username 视为已登录（实际有效性由后端 401 决定）
  return !!localStorage.getItem(KEYS.BASIC_USER);
}

/** 保存 JWT 登录结果（后端 /api/auth/login 原始响应） */
export function saveJwtSession(accessToken: string, expiresIn: number): void {
  localStorage.setItem(KEYS.JWT_TOKEN, accessToken);
  localStorage.setItem(KEYS.JWT_EXPIRES_AT, String(Date.now() + expiresIn * 1000));
  // 登录成功后清除旧 Basic Auth，避免双凭据并存
  localStorage.removeItem(KEYS.BASIC_USER);
  localStorage.removeItem(KEYS.BASIC_PASS);
}

/** 保存 Basic Auth 凭据（降级兼容，后端 /api/auth/login 不可用时使用） */
export function saveBasicSession(username: string, password: string): void {
  localStorage.setItem(KEYS.BASIC_USER, username);
  localStorage.setItem(KEYS.BASIC_PASS, password);
}

/** 清除所有本地凭据（退出登录 / 401 时调用） */
export function clearSession(): void {
  localStorage.removeItem(KEYS.JWT_TOKEN);
  localStorage.removeItem(KEYS.JWT_EXPIRES_AT);
  localStorage.removeItem(KEYS.BASIC_USER);
  localStorage.removeItem(KEYS.BASIC_PASS);
  localStorage.removeItem(KEYS.USER_INFO);
}

/** 获取已登录用户名（JWT payload sub 字段，或 Basic Auth username） */
export function getUsername(): string {
  // 尝试从 user_info 读取
  try {
    const info = JSON.parse(localStorage.getItem(KEYS.USER_INFO) ?? '{}');
    if (info?.name) return info.name;
  } catch { /* ignore */ }

  return localStorage.getItem(KEYS.BASIC_USER) ?? '未知用户';
}

/** 保存用户信息 */
export function saveUserInfo(info: { name: string; role: string }): void {
  localStorage.setItem(KEYS.USER_INFO, JSON.stringify(info));
}
