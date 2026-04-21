# 前端接口对接文档（FastAPI）

更新时间：2026-04-20

## 1. 服务概览

- 服务名称：火眼智擎—汽配领域知产保护分析助手
- 本地默认地址：`http://localhost:8000`
- 在线文档：
  - Swagger UI：`/docs`
  - OpenAPI JSON：`/openapi.json`
- 健康检查：`GET /health`
- CORS：已全开放（`allow_origins=["*"]`）
- 认证：当前版本无鉴权（无 Token/JWT）

## 2. 通用约定

### 2.1 请求格式

- JSON 接口：`Content-Type: application/json`
- 文件上传接口：`Content-Type: multipart/form-data`

### 2.2 时间字段

- 大多数返回时间为 ISO 8601 字符串，如：`2026-04-20T14:25:11.123456`
- 少数关系分析返回中，时间字段可能是 `str(datetime)` 风格（如 `2026-04-20 14:25:11`）

### 2.3 分页约定

多个列表接口采用：
- `limit`：条数上限
- `offset`：偏移量

注意：接口本身通常只返回数组，不返回 `total`。前端若要总数需自行二次查询或扩展后端。

### 2.4 错误返回

标准 FastAPI 错误结构：

```json
{
  "detail": "错误描述"
}
```

常见状态码：
- `400` 参数错误/业务校验失败
- `404` 资源不存在
- `500` 服务内部异常

## 3. 核心数据结构（前端 TypeScript 建议）

```ts
export interface CaseItem {
  id: number;
  case_no: string;
  suspect_name: string;
  brand: string | null;
  amount: number;
  created_at: string | null;
}

export interface TransactionItem {
  id: number;
  case_id: number;
  case_no?: string;
  transaction_time: string | null;
  payer: string;
  payee: string;
  amount: number;
  payment_method: string | null;
  remark: string | null;
}

export interface CommunicationItem {
  id: number;
  case_id: number;
  communication_time: string | null;
  initiator: string;
  receiver: string;
  content: string | null;
}

export interface LogisticsItem {
  id: number;
  case_id: number;
  shipping_time: string | null;
  tracking_no: string | null;
  sender: string;
  sender_address: string | null;
  receiver: string;
  receiver_address: string | null;
  description: string | null;
  weight: number | null;
}

export interface SuspiciousClueItem {
  id: number;
  case_id: number;
  clue_type: string;
  evidence_text: string;
  hit_keywords: string[] | string | null;
  score: number;
  crime_type: string | null;
  severity_level: string | null;
}
```

## 4. 接口清单

## 4.1 基础接口

### 4.1.1 根路由
- 方法/路径：`GET /`
- 作用：服务欢迎信息
- 响应示例：

```json
{
  "message": "火眼智擎—汽配领域知产保护分析助手",
  "status": "running"
}
```

### 4.1.2 健康检查
- 方法/路径：`GET /health`
- 响应示例：

```json
{
  "status": "healthy"
}
```

## 4.2 数据导入（upload）

前缀：`/api/upload`

### 4.2.1 上传资金流水
- 方法/路径：`POST /api/upload/transactions`
- 请求类型：`multipart/form-data`
- 表单字段：
  - `file` 必填，支持 `.xlsx/.xls/.csv`
  - `case_id` 可选，数字
  - `case_no` 可选，字符串（`case_id` 未传时可用）
- 成功响应：

```json
{
  "success": true,
  "message": "成功导入10条资金流水",
  "case_id": 1,
  "case_no": "A2024001",
  "total_records": 10,
  "saved_records": 10
}
```

### 4.2.2 上传通讯记录
- 方法/路径：`POST /api/upload/communications`
- 请求格式同上
- 成功响应字段同 4.2.1

### 4.2.3 上传物流记录
- 方法/路径：`POST /api/upload/logistics`
- 请求格式同上
- 成功响应字段同 4.2.1

### 4.2.4 上传文件列名约定（建议）

资金流水：
- `交易发生时间`
- `打款方 (账号/姓名)` 或 `打款方`
- `收款方 (账号/姓名)` 或 `收款方`
- `交易金额 (元)` 或 `交易金额`
- `支付方式`
- `交易备注 / 转账留言` 或 `交易备注`

通讯记录：
- `联络时间`
- `发起方 (微信号/姓名)`
- `接收方 (微信号/姓名)`
- `聊天内容`

物流记录：
- `发货时间`
- `快递单号`
- `发件人/网点`
- `收件人/地址`
- `寄件物品描述`
- `包裹重量(公斤)`

## 4.3 案件管理（cases）

前缀：`/api/cases`

### 4.3.1 案件列表
- 方法/路径：`GET /api/cases`
- Query 参数：
  - `case_no` 可选，模糊匹配
  - `suspect_name` 可选，模糊匹配
  - `brand` 可选，模糊匹配
  - `limit` 可选，默认 `100`，范围 `1-500`
  - `offset` 可选，默认 `0`
- 响应：`CaseItem[]`

### 4.3.2 案件详情
- 方法/路径：`GET /api/cases/{case_id}`
- Path 参数：`case_id` 数字
- 响应结构：
  - `case`: 案件信息
  - `transactions`: 交易列表
  - `communications`: 通讯列表
  - `logistics`: 物流列表
  - `persons`: 人员数组（仅 `{name}`）
  - `suspicious_clues`: 线索列表
  - `statistics`: 统计信息

统计字段示例：

```json
{
  "transaction_count": 20,
  "communication_count": 15,
  "logistics_count": 9,
  "suspicious_clue_count": 6,
  "person_count": 12,
  "total_transaction_amount": 58200.5
}
```

### 4.3.3 创建案件
- 方法/路径：`POST /api/cases`
- Body：

```json
{
  "case_no": "A2026001",
  "suspect_name": "张某",
  "brand": "奥迪",
  "amount": 120000
}
```

- 失败：
  - `400`：案件编号已存在

### 4.3.4 更新案件
- 方法/路径：`PUT /api/cases/{case_id}`
- Body：字段可选（`suspect_name/brand/amount`）

### 4.3.5 删除案件
- 方法/路径：`DELETE /api/cases/{case_id}`
- 响应：

```json
{
  "success": true,
  "message": "案件已删除"
}
```

## 4.4 可疑线索（clues）

### 4.4.1 获取案件可疑线索
- 方法/路径：`GET /api/cases/{case_id}/suspicious`
- 响应结构：

```json
{
  "suspicion_clues": [
    {
      "id": 10,
      "case_id": 1,
      "clue_type": "主观明知",
      "evidence_text": "...",
      "hit_keywords": ["高仿", "别声张"],
      "score": 9,
      "crime_type": "涉嫌销售假冒注册商标的商品罪",
      "severity_level": "刑事犯罪"
    }
  ],
  "price_clues": [],
  "role_clues": []
}
```

### 4.4.2 线索详情
- 方法/路径：`GET /api/clues/{clue_id}`
- 失败：`404` 线索不存在

## 4.5 智能分析（analyze）

前缀：`/api/analyze`

### 4.5.1 单条证据分析
- 方法/路径：`POST /api/analyze/evidence`
- Body：

```json
{
  "evidence_text": "这批不是原厂，280元拿货，电话13812345678",
  "evidence_type": "communication"
}
```

- 响应结构：

```json
{
  "original_text": "...",
  "masked_text": "...138****5678...",
  "price_anomaly": {
    "has_anomaly": true,
    "quoted_price": 280,
    "reference_price": 700,
    "ratio": 0.4,
    "anomaly_level": "中等"
  },
  "subjective_knowledge": {
    "score": 8,
    "level": "高度可疑",
    "hit_keywords": ["不是原厂"],
    "categories": {
      "暗示非正品类": 1
    },
    "crime_type": "涉嫌销售假冒注册商标的商品罪"
  },
  "key_actors": [
    {
      "name": "张三",
      "role": null,
      "contact": "138****5678",
      "mentioned_in": "communication"
    }
  ]
}
```

### 4.5.2 全案分析
- 方法/路径：`POST /api/analyze/case/{case_id}`
- 响应：
  - `case_id`
  - `case_no`
  - `chain_analysis`（与 4.6.1 相同结构）

### 4.5.3 关键主体分析
- 方法/路径：`GET /api/analyze/actors/{case_id}`
- 响应：数组，每项包含：
  - `name`
  - `role`
  - `crime_type`
  - `behavior_role`
  - `keyword_roles`
  - `evidence`（含 transactions/logistics/communications）

## 4.6 关联分析（relations）

前缀：`/api/relations`

### 4.6.1 单案关系链
- 方法/路径：`GET /api/relations/chain/{case_id}`
- 响应结构：

```json
{
  "case_id": 1,
  "relation_graph": {
    "nodes": [
      {
        "id": "张三",
        "name": "张三",
        "money_in": 10000,
        "money_out": 5000,
        "is_upstream": false,
        "is_downstream": false,
        "is_core": true,
        "comm_frequency": 4
      }
    ],
    "edges": [
      {
        "source": "张三",
        "target": "李四",
        "type": "money",
        "amount": 5000,
        "time": "2026-04-20 10:00:00"
      },
      {
        "source": "张三",
        "target": "王五",
        "type": "logistics",
        "description": "刹车片",
        "time": "2026-04-20 11:00:00"
      }
    ],
    "statistics": {
      "total_persons": 5,
      "total_transactions": 20,
      "total_logistics": 8,
      "total_communications": 10,
      "pre_transfer_count": 3,
      "hidden_source_count": 1
    },
    "upstream": ["供货商A"],
    "downstream": ["买家B"],
    "core": ["张三"],
    "hidden_sources": [],
    "pre_transfer_links": []
  },
  "role_analysis": {
    "producers": ["张三"],
    "sellers": [],
    "middlemen": ["李四"],
    "buyers": ["王五"],
    "unknown": []
  },
  "amount_summary": {
    "total_transaction_amount": 100000,
    "illegal_business_amount": 100000,
    "illegal_income": 70000,
    "cost_ratio": 0.3,
    "threshold_check": {
      "threshold_met": true,
      "crime_type": "假冒注册商标罪",
      "suggestion": "非法经营数额已达刑事门槛"
    }
  },
  "upstream_count": 1,
  "downstream_count": 1,
  "core_count": 2
}
```

### 4.6.2 跨案关联
- 方法/路径：`GET /api/relations/cross-case`
- 响应示例：

```json
[
  {
    "person": "张三",
    "case_ids": [1, 3],
    "case_count": 2,
    "case_details": [
      {"case_no": "A2024001", "suspect_name": "张三", "brand": "奥迪"},
      {"case_no": "A2024003", "suspect_name": "李四", "brand": "宝马"}
    ]
  }
]
```

### 4.6.3 累犯检测
- 方法/路径：`GET /api/relations/recidivism/{person_name}`
- 响应包含：
  - `person_name`
  - `is_recidivist`
  - `check_date`
  - `threshold_years`（固定 2）
  - `related_cases`
  - `case_count`

### 4.6.4 上游供货商
- 方法/路径：`GET /api/relations/upstream/{case_id}`
- 响应项字段：
  - `name`
  - `total_out_amount`
  - `counterparties`
  - `evidence`（transactions/logistics）

### 4.6.5 下游买家
- 方法/路径：`GET /api/relations/downstream/{case_id}`
- 响应项字段：
  - `name`
  - `total_in_amount`
  - `counterparties`
  - `evidence`

### 4.6.6 核心嫌疑人
- 方法/路径：`GET /api/relations/core-suspects/{case_id}`
- 响应项字段：
  - `name`
  - `role`
  - `crime_type`
  - `behavior_role`
  - `keyword_roles`
  - `evidence`

## 4.7 数据台账（ledger）

前缀：`/api/ledger`

### 4.7.1 人员台账
- 方法/路径：`GET /api/ledger/persons`
- Query 参数：
  - `name`（模糊）
  - `role`（精确）
  - `limit`（1-500，默认100）
  - `offset`（默认0）
- 响应项字段：
  - `id`
  - `name`
  - `role`
  - `case_no`
  - `is_authorized`
  - `subjective_knowledge_score`
  - `illegal_business_amount`
  - `linked_cases`

### 4.7.2 人员详情
- 方法/路径：`GET /api/ledger/persons/{name}`
- 响应字段：
  - `name`
  - `role`
  - `is_authorized`
  - `subjective_knowledge_score`
  - `linked_cases`
  - `total_transaction_amount`
  - `transactions`
  - `communications`
  - `logistics`
  - `case_ids`

### 4.7.3 交易台账
- 方法/路径：`GET /api/ledger/transactions`
- Query 参数：
  - `case_no`、`payer`、`payee`
  - `start_date`、`end_date`（当前版本后端未实际过滤）
  - `limit`、`offset`
- 响应：`TransactionItem[]`（附带 `case_no`）

### 4.7.4 高频交易人员
- 方法/路径：`GET /api/ledger/high-frequency`
- Query 参数：`limit` 默认 10，范围 1-100
- 响应示例：

```json
[
  {
    "name": "张三",
    "transaction_count": 25,
    "total_amount": 181000
  }
]
```

### 4.7.5 证据清单
- 方法/路径：`GET /api/ledger/evidence-inventory/{case_id}`
- 响应字段：
  - `case_id`
  - `case_no`
  - `total_evidence_count`
  - `communication_evidence_count`
  - `price_anomaly_evidence_count`
  - `logistics_evidence_count`
  - `evidence_list`

`evidence_list` 的 item 可能是三种类型（通讯/交易备注/物流描述），共同包含：
- `type`
- `id`
- `case_no`
- `time`
- `hit_keywords`
- `score`
- `severity_level`
- `crime_type`

### 4.7.6 案件摘要
- 方法/路径：`GET /api/ledger/case-summary/{case_id}`
- 响应字段：
  - `case_id`
  - `case_no`
  - `suspect_name`
  - `brand`
  - `total_amount`
  - `transaction_count`
  - `communication_count`
  - `logistics_count`
  - `person_count`
  - `suspicious_clue_count`
  - `high_risk_clue_count`
  - `medium_risk_clue_count`

## 4.8 数据导出（export）

前缀：`/api/export`

### 4.8.1 CSV 导出
- 方法/路径：`GET /api/export/csv`
- Query 参数：
  - `type` 必填：`transactions | persons | evidence`
  - `case_id` 可选（`type=evidence` 时必填）
  - `case_no` 可选
- 返回：`text/csv` 流（`attachment` 下载）
- 文件名：`{type}_{case_no or case_id}.csv`

## 4.9 报告生成（report）

前缀：`/api/report`

### 4.9.1 生成报告
- 方法/路径：`POST /api/report/generate`
- 参数：`case_id`（Query 参数，不是 JSON Body）
- 响应：

```json
{
  "success": true,
  "report_id": "report_A2024001_20260420143001.txt",
  "download_url": "/api/report/download/report_A2024001_20260420143001.txt",
  "message": "报告生成成功"
}
```

### 4.9.2 下载报告
- 方法/路径：`GET /api/report/download/{filename}`
- 返回：文件流（`application/octet-stream`）

### 4.9.3 获取报告状态
- 方法/路径：`GET /api/report/{case_id}`
- 响应字段：
  - `case_id`
  - `case_no`
  - `report_available`（当前实现固定为 `true`）
  - `summary`（案件摘要）

## 5. 前端页面与接口映射建议

### 5.1 数据看板
- 顶部统计：
  - `GET /api/cases`（长度）
  - `GET /api/ledger/high-frequency`
  - 可疑线索计数：可从案件详情统计聚合，或后端补聚合接口
- 趋势图：当前无专门时间序列聚合接口，建议前端按 `created_at` 临时聚合

### 5.2 案件管理
- 列表：`GET /api/cases`
- 新建：`POST /api/cases`
- 详情弹窗：`GET /api/cases/{case_id}`
- 编辑：`PUT /api/cases/{case_id}`
- 删除：`DELETE /api/cases/{case_id}`
- 导入三类数据：3 个 upload 接口

### 5.3 智能证据解析
- 输入分析：`POST /api/analyze/evidence`
- 结果展示：`price_anomaly`、`subjective_knowledge`、`key_actors`

### 5.4 关联分析
- 单案图谱：`GET /api/relations/chain/{case_id}`
- 跨案网络：`GET /api/relations/cross-case`
- 右侧人物情报：`GET /api/ledger/persons/{name}` + `GET /api/relations/recidivism/{person_name}`

### 5.5 数据台账
- 人员台账：`GET /api/ledger/persons`
- 人员详情：`GET /api/ledger/persons/{name}`
- 交易台账：`GET /api/ledger/transactions`
- 证据清单：`GET /api/ledger/evidence-inventory/{case_id}`
- 导出：`GET /api/export/csv`

## 6. 联调注意事项（重要）

1. 上传接口实现与解析服务方法签名当前存在不一致风险。
- `api/upload.py` 内调用 `UploadService.parse_transactions(df)` 等方式。
- `services/upload_service.py` 当前定义为 `parse_transactions(file_path, case_id)`。
- 如遇上传 `500`，需优先修复后端该签名问题。

2. 可疑线索接口会写库，重复调用可能产生重复线索。
- `GET /api/cases/{case_id}/suspicious` 会执行检测并 `create` 新线索。
- 前端避免高频轮询该接口，建议采用“手动触发检测”模式。

3. 部分接口未做不存在保护，可能返回 `500`。
- 如 `GET /api/ledger/evidence-inventory/{case_id}`、`GET /api/ledger/case-summary/{case_id}` 对非法 case_id 可能触发数据库异常。
- 前端需统一兜底错误提示。

4. 交易台账的 `start_date/end_date` 参数当前未生效。
- 前端可先保留筛选 UI，但要提示“后端日期过滤待完善”。

5. 接口无统一 `code/message/data` 包装。
- 当前绝大多数成功响应为“直接对象/数组”。
- 前端 HTTP 层建议写通用适配器，兼容对象、数组、文件流三种响应形态。

## 7. 推荐前端封装

- Axios 基础配置：
  - `baseURL = http://localhost:8000`
  - 请求超时建议 30s（报告生成可适当加长）
- 统一错误拦截：从 `error.response.data.detail` 取后端错误文案
- 文件下载：`responseType = 'blob'`
- 图谱渲染：建议直接消费 `relation_graph.nodes` 与 `relation_graph.edges`

## 8. 最小联调流程（建议）

1. 调用 `POST /api/cases` 创建案件。
2. 调用 3 个上传接口导入交易/通讯/物流。
3. 调用 `GET /api/cases/{id}` 验证数据落库。
4. 调用 `GET /api/relations/chain/{id}` 渲染单案图谱。
5. 调用 `GET /api/ledger/evidence-inventory/{id}` 渲染证据清单。
6. 调用 `POST /api/report/generate?case_id={id}` 生成报告并下载。

---

如需，我可以继续输出一版“可直接复制到前端项目”的 TypeScript API SDK（按模块拆分 `cases.ts / relations.ts / ledger.ts`）。
