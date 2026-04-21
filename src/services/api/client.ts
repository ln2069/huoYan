import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { ApiError, NetworkError, ValidationError } from "./errors";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TIMEOUT = 15000;

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT });

  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem("auth_token");
      if (token && config.headers) {
        config.headers["Authorization"] = `Bearer ${token}`;
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
        return Promise.reject(new ValidationError(serverMessage ?? "参数错误"));
      }
      if (status === 401 || status === 403) {
        localStorage.removeItem("auth_token");
        window.dispatchEvent(new CustomEvent("auth:expired"));
        return Promise.reject(new ApiError(status, "登录已过期，请重新登录"));
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
