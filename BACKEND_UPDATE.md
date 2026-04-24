# 后端修改记录 (Backend Modification Records)

## 日期: 2026-04-23

### 1. 数据一致性修复：删除案件时级联删除已生效 (`models/database.py`)
- **问题**: 删除案件后，关联流水/通讯/物流/线索可能残留。
- **修复**:
  - SQLite 连接已启用外键约束：`pragmas={"foreign_keys": 1}`。
  - 现有外键 `on_delete="CASCADE"` 现在可真正生效。
- **前端对接影响**:
  - 删除接口 `DELETE /api/cases/{case_id}` 的调用方式不变。
  - 行为变化：删除案件后，其关联数据会同步删除，前端应同步清理关联视图缓存。

### 2. 案件金额改为自动汇总，不再手工输入 (`services/case_service.py`, `api/cases.py`, `api/upload.py`)
- **问题**: `case.amount` 允许手工写入，可能与真实交易流水不一致。
- **修复**:
  - 新建案件时 `amount` 固定初始化为 `0`。
  - 新增金额重算逻辑：`CaseService.recalculate_case_amount(case_id)`，按当前 `transactions.amount` 求和回写案件金额。
  - 在交易导入接口中自动执行金额重算。
- **前端对接影响**:
  - `POST /api/cases` 和 `PUT /api/cases/{case_id}` 不再接收 `amount`。
  - 交易导入 `POST /api/upload/transactions` 成功响应新增：
    - `case_amount`: 重算后的案件金额（number）
  - 前端展示案件金额时，应以后端返回值为准，不再本地输入或缓存计算。

### 3. 嫌疑人/品牌改为自动推导，不再手工维护 (`services/case_service.py`, `api/cases.py`, `api/upload.py`)
- **问题**: `suspect_name`、`brand` 手工维护导致与证据数据易不一致。
- **修复**:
  - 新增推导逻辑：
    - `CaseService.infer_suspect_name(case_id)`
    - `CaseService.infer_brand(case_id)`
    - `CaseService.auto_update_inferred_fields(case_id)`
  - 嫌疑人推导策略：
    - 优先基于交易记录（收款方权重高于打款方，金额参与加权）；
    - 无交易时回退到通讯/物流主体高频统计。
  - 品牌推导策略：
    - 从交易备注、物流描述、通讯内容提取文本；
    - 使用品牌关键词库匹配，按命中次数选主品牌。
  - 创建案件时默认 `suspect_name = "待推导"`，后续由数据驱动更新。
  - 三类导入接口在保存后都会自动执行推导更新。

### 4. API 契约变化（前端重点）
- **案件创建** `POST /api/cases`
  - **旧请求体**: 可带 `case_no/suspect_name/brand/amount`
  - **新请求体**: 仅支持 `case_no`
  - 若传入未定义字段会被拒绝（`extra=forbid`，返回 422）。

- **案件更新** `PUT /api/cases/{case_id}`
  - `amount/suspect_name/brand` 不再允许通过该接口手工修改。
  - 当前接口用于保持兼容占位（存在性校验），推导字段请走自动推导链路。

- **新增手动触发推导接口** `POST /api/cases/{case_id}/infer-fields`
  - 用途：前端可在导入后主动触发一次推导刷新。
  - 返回：`case`（最新案件信息）+ `inference`（推导结果）。

- **导入接口成功响应新增字段**
  - `POST /api/upload/transactions`:
    - 新增 `case_amount`、`case_suspect_name`、`case_brand`
  - `POST /api/upload/communications`:
    - 新增 `case_suspect_name`、`case_brand`
  - `POST /api/upload/logistics`:
    - 新增 `case_suspect_name`、`case_brand`

### 5. 前端联调建议
- 创建案件页：提交字段改为仅 `case_no`。
- 导入完成后：直接使用导入响应中的 `case_amount/case_suspect_name/case_brand` 刷新页面。
- 列表/详情刷新策略：在导入后追加调用 `GET /api/cases/{case_id}`，避免页面与推导结果不同步。
- 对 422 统一提示："请求字段与最新后端契约不一致，请更新前端请求体"。
