# 火眼智擎前端（Vue + Nginx）

本项目为火眼智擎前端容器，生产环境通过 Nginx 提供静态资源，并将 `/api` 反向代理到后端容器。

## 部署目标

- 保持前后端分离 `docker-compose`。
- 前端和后端通过共享 Docker 网络 `huoyan_net` 互通。
- 前端请求统一走同源路径 `/api`，避免跨域和地址漂移。

## 前置条件

1. Docker / Docker Compose 可用。
2. 后端已按 `demo_test` 目录部署，并加入 `huoyan_net`。
3. 首次部署创建共享网络（只需一次）：

```bash
docker network create huoyan_net
```

## 启动前端

在当前目录执行：

```bash
docker compose up -d --build
```

默认访问地址：

- 前端首页：http://localhost:3000

## 关键配置

- `docker-compose.yml`
  - 仅启动 `frontend` 服务，不再依赖本地后端镜像。
  - 通过环境变量传递后端上游：
    - `BACKEND_HOST`（默认 `huoyan_backend`）
    - `BACKEND_PORT`（默认 `8001`）
- `nginx.conf`
  - `/api` 代理到 `http://${BACKEND_HOST}:${BACKEND_PORT}/api/`

## 自定义后端地址

若后端容器名不是 `huoyan_backend`，可在同目录创建 `.env`：

```env
BACKEND_HOST=your_backend_container_name
BACKEND_PORT=8001
```

然后重建前端：

```bash
docker compose up -d --build
```

## 常用命令

```bash
# 查看日志
docker compose logs -f frontend

# 停止并移除容器
docker compose down
```

## 联通自检

1. 后端健康检查可用：`http://<后端地址>:8001/health`
2. 前端页面可打开：`http://<前端地址>:3000`
3. 浏览器 Network 中业务请求均以 `/api/...` 发出
4. 登录成功后可访问案件列表，并可导出 CSV
