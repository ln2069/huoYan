# 火眼智擎 (FireEye) — 汽配领域知产保护分析助手

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.x-4fc08d?style=for-the-badge&logo=vue.js" alt="Vue 3">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6.x-646cff?style=for-the-badge&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind-3.x-38b2ac?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Element_Plus-2.x-409eff?style=for-the-badge&logo=element-plus" alt="Element Plus">
</p>

## 🌟 项目简介

**火眼智擎** 是一款专为汽配领域设计的知识产权保护分析助手。它通过集成后端 AI 分析能力，精准识别汽配领域的侵权犯罪行为。系统能够深度分析通讯记录、资金流水及物流信息，自动提取关键证据，并以可视化的方式展示上下游犯罪链条，为知识产权保护提供强有力的技术支撑。

### 🎯 核心价值
- **精准靶向**：深耕汽配领域，内置行业敏感词库与侵权逻辑。
- **证据溯源**：所有分析结果均关联原始证据，支持关键词高亮与原文引用。
- **全案画像**：自动生成案件拓扑图，揭示嫌疑人角色及组织架构。
- **风险量化**：基于主观明知评分规则，量化嫌疑人犯罪意图。

---

## 🐳 Docker 部署 (生产环境)

本项目前端支持通过 Nginx 容器化部署，生产环境通过 Nginx 提供静态资源，并将 `/api` 反向代理到后端容器。

### 部署目标

- 保持前后端分离 `docker-compose`。
- 前端和后端通过共享 Docker 网络 `huoyan_net` 互通。
- 前端请求统一走同源路径 `/api`，避免跨域和地址漂移。

### 前置条件

1. Docker / Docker Compose 可用。
2. 后端已按 `demo_test` 目录部署，并加入 `huoyan_net`。
3. 首次部署创建共享网络（只需一次）：

```bash
docker network create huoyan_net
```

### 启动前端

在当前目录执行：

```bash
docker compose up -d --build
```

默认访问地址：
- 前端首页：http://localhost:3000

### 关键配置

- `docker-compose.yml`: 仅启动 `frontend` 服务，通过环境变量传递后端上游（`BACKEND_HOST`, `BACKEND_PORT`）。
- `nginx.conf`: 将 `/api` 代理到 `http://${BACKEND_HOST}:${BACKEND_PORT}/api/`

---

## ✨ 核心功能

### 1. 📊 数据看板 (Dashboard)
- **全局概览**：实时统计案件总数、可疑线索、涉案总金额及重点布控人员。
- **动态趋势**：多维度可视化分析案件增长趋势、品牌分布及资金流向。

### 2. 📁 案件管理 (Case Management)
- **档案中心**：系统化管理案件基础信息（嫌疑人、品牌、涉案金额等）。
- **详情穿透**：一站式查看案件关联的所有原始数据及分析结论。

### 3. 🧠 智能证据解析 (Evidence Analysis)
- **文本审计**：自动识别聊天记录中的价格异常、主观明知话术。
- **实体提取**：智能提取人名、角色、联系方式及交易金额。

### 4. 🕸️ 关联分析 (Relationship Mapping)
- **供应链图谱**：可视化展示上游供货商、核心嫌疑人及下游买家的动态关系。
- **跨案关联**：通过技术手段识别不同案件间的重合人员，挖掘幕后团伙。

### 5. 📒 数据台账 (Ledger)
- **人员台账**：全量人员库，支持角色分类、主观明知评分及非法经营额统计。
- **报告生成**：一键生成标准化的分析报告（Text/PDF），支持导出下载。

---

## 🛠️ 技术架构

- **前端框架**: Vue 3 (Composition API) + Vite + TypeScript
- **状态管理**: Pinia
- **UI 组件**: Element Plus
- **图表/拓扑**: ECharts
- **样式**: Tailwind CSS
- **后端集成**: FastAPI (RESTful API)

---

## 🚀 开发环境快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env` 并配置：
```env
VITE_REPO_TYPE=real
VITE_API_BASE_URL=http://localhost:8000/api
```

### 3. 启动开发服务器
```bash
npm run dev
```

---

## 🔒 安全与合规
- **隐私保护**：自动脱敏敏感信息。
- **访问控制**：支持 HTTP Basic Auth 鉴权。

## 📄 开源协议
本项目遵循 MIT 协议。
