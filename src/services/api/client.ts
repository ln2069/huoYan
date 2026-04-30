import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { ApiError, NetworkError, ValidationError, TableFormatError } from "./errors";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TIMEOUT = 60000;

/**
 * 从 localStorage 获取 Basic Auth 凭据，构建 Authorization 头
 * 首次加载时如果 localStorage 无凭据，则从 env 变量注入默认值
 */
function getBasicAuthHeader(): string | null {
  let username = localStorage.getItem("basic_auth_username");
  let password = localStorage.getItem("basic_auth_password");

  if (!username || !password) return null;
  const encoded = btoa(`${username}:${password}`);
  return `Basic ${encoded}`;
}

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT });

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // 注入 HTTP Basic Auth 头
      const authHeader = getBasicAuthHeader();
      if (authHeader && config.headers) {
        config.headers["Authorization"] = authHeader;
      }
      if (import.meta.env.DEV) {
        config.headers["X-Request-From"] = "fe";
      }
      return config;
    },
    (_err: unknown) => Promise.reject(new NetworkError("请求配置错误"))
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === "ECONNABORTED") {
        return Promise.reject(new NetworkError("请求超时，请稍后重试"));
      }
      if (!error.response) {
        return Promise.reject(new NetworkError("网络连接失败，请检查网络"));
      }
      const { status, data } = error.response;
      const serverMessage = data?.message ?? data?.detail;

      if (status === 400) {
        const detail = data?.detail ?? data?.message ?? "";
        // 表格格式错误 — 上传校验专项处理
        if (typeof detail === "string" && detail.includes("表格格式错误")) {
          return Promise.reject(new TableFormatError(detail));
        }
        return Promise.reject(new ValidationError(serverMessage ?? "参数错误"));
      }
      if (status === 422) {
        const detail = data?.detail ?? data?.message ?? "";
        return Promise.reject(new ValidationError(detail || "请求字段与最新后端契约不一致，请更新前端请求体"));
      }
      if (status === 401) {
        // 清除无效凭据
        localStorage.removeItem("basic_auth_username");
        localStorage.removeItem("basic_auth_password");
        
        // 强制跳转至登录页 (仅当不在登录页时执行，防止循环)
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        
        return Promise.reject(new ApiError(status, "未授权访问，请输入账号密码"));
      }
      if (status === 403) {
        return Promise.reject(new ApiError(status, "无权限访问"));
      }
      if (status === 404) {
        return Promise.reject(new ApiError(404, serverMessage ?? "资源不存在"));
      }
      if (status >= 500) {
        return Promise.reject(new ApiError(status, serverMessage ?? "服务器异常，请稍后重试"));
      }
      return Promise.reject(new ApiError(status, serverMessage ?? "请求失败"));
    }
  );

  return client;
}

export const httpClient = createClient();

export async function get<T>(url: string, config?: AxiosRequestConfig) {
  const res = await httpClient.get<unknown, { code: number; message: string; data: T }>(url, config);
  return res.data;
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  const res = await httpClient.post<unknown, { code: number; message: string; data: T }>(url, data, config);
  return res.data;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  const res = await httpClient.put<unknown, { code: number; message: string; data: T }>(url, data, config);
  return res.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig) {
  const res = await httpClient.delete<unknown, { code: number; message: string; data: T }>(url, config);
  return res.data;
}
