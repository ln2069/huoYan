import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { ApiError, NetworkError, ValidationError, TableFormatError } from "./errors";
import { getAuthHeader, clearSession } from "@/services/auth/authService";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TIMEOUT = 60000;

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT });

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // 注入 Authorization 头（JWT Bearer 优先，Basic Auth 降级兼容）
      const authHeader = getAuthHeader();
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
        // 无法识别文件类型 — 统一上传端点特有错误
        if (typeof detail === "string" && detail.includes("无法识别文件类型")) {
          return Promise.reject(new TableFormatError(detail));
        }
        return Promise.reject(new ValidationError(serverMessage ?? "参数错误"));
      }
      if (status === 422) {
        const detail = data?.detail ?? data?.message ?? "";
        return Promise.reject(new ValidationError(detail || "请求字段与最新后端契约不一致，请更新前端请求体"));
      }
      if (status === 401) {
        // 清除所有本地凭据并跳转登录页
        clearSession();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(new ApiError(status, "登录已过期，请重新登录"));
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
