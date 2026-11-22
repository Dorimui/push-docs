# API 文档

Echo酱推送服务对外提供 Webhook HTTP 接口，用于消息推送、决策任务投递和 Robot 接入。

需要用访问令牌发送通知、查询或处理消息时，请参阅[消息中心 API](/guide/message-api)。从 AI 客户端接入请参阅 [MCP 接入](/guide/mcp)。

## 接入地址

```
https://echo.dorimu.cn
```

## 目录

- [通用约定](#通用约定) — 响应格式、错误码
- [消息推送](#消息推送) — 通过 Webhook 推送消息到设备
- [签名凭证管理](#签名凭证管理) — 创建和撤销渠道签名密钥
- [决策任务](#决策任务) — 创建审批/确认类任务并获取结果
- [Robot 接入](#robot-接入) — Robot 连接、接收任务、回复消息
- [内容类型说明](#内容类型说明) — text / markdown / card / ocard / pass

---

## 通用约定

### 响应格式

所有接口统一返回以下 JSON 结构：

```json
// 成功（有结果）
{ "code": 200, "result": { ... } }

// 成功（空响应）
{ "code": 200 }

// 失败
{ "code": 401, "message": "未授权访问" }
```

### 错误码

| code | 含义 |
|---|---|
| 400 | 参数错误 / 校验失败 |
| 401 | 未认证 / token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 限流 |
| 500 | 内部错误 |

---

## 消息推送

### POST `/push/{push_id}`

通过渠道的 `push_id` 推送消息到绑定的设备。`push_id` 可在 [管理后台](https://echo.dorimu.cn/dashboard/user/) 创建渠道后获取。

**鉴权策略：**

- 当渠道 `require_signature = true` 时，必须携带签名头（见下方签名计算规则）
- 当渠道 `require_signature = false` 时，无需签名即可推送

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `format` | `string` | 否 | 消息格式，默认 `normal`。可选：`normal` / `image` / `button` |
| `title` | `string` | 是 | 消息标题，最长 120 字符 |
| `description` | `string` | 否 | 消息摘要，最多保留 256 字符 |
| `content` | `string` | `normal` 时必填 | 消息内容，最多保留 4000 字符 |
| `image_url` | `string` | `image` 时必填 | 图片地址，必须为 `https` |
| `buttons` | `array` | `button` 时必填 | 按钮列表，1-5 项，每项含 `text` 和 `url` |
| `message_type` | `string` | 否 | 消息类型，默认 `normal`。可选：`normal` / `system` |
| `notification_profile` | `string` | 否 | 通知配置。可选：`general` / `system_alert`；未传时，普通消息默认 `general`，系统消息默认 `system_alert` |
| `topic` | `string` | 否 | 消息主题，最长 120 个字符。消息中心可以按相同主题折叠 |
| `privacy` | `object` | 否 | [隐私推送设置](#topic-and-privacy)，用于自定义设备系统通知的标题和正文 |

**示例 — 普通文本消息：**

```bash
curl -X POST https://echo.dorimu.cn/push/{push_id} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "服务器告警",
    "content": "CPU 使用率超过 90%"
  }'
```

**示例 — 图片消息：**

```json
{
  "format": "image",
  "title": "监控截图",
  "image_url": "https://example.com/screenshot.png"
}
```

**示例 — 按钮消息：**

```json
{
  "format": "button",
  "title": "构建完成",
  "description": "main 分支构建 #128 成功",
  "buttons": [
    { "text": "查看详情", "url": "https://ci.example.com/builds/128" },
    { "text": "查看日志", "url": "https://ci.example.com/builds/128/logs" }
  ]
}
```

**返回示例：**

```json
{
  "code": 200,
  "result": {
    "message_id": "uuid",
    "status": "queued"
  }
}
```

### 消息主题与隐私推送 {#topic-and-privacy}

给多条消息传入相同的 `topic`，App 和网页消息中心就能把它们折叠成一组。发送时可以只设置主题，也可以同时启用隐私推送。

| `privacy` 内的字段 | 类型 | 说明 |
|---|---|---|
| `enable` | `bool` | 设为 `true` 时启用替代文案。省略整个对象或设为 `false` 时，沿用常规推送文案 |
| `title` | `string` | 设备系统通知的替代标题，最长 120 个字符。留空时显示「PushFlow」 |
| `content` | `string` | 设备系统通知的替代正文，最长 256 个字符。留空时显示「你收到一条新消息」 |

启用后，设备系统通知和 App 中设置的稍后推送提醒都使用替代标题和正文，原消息的图片和按钮只在应用内查看。消息中心继续显示外层 `title` 和 `content` 对应的原文。

**示例 — 工单主题与隐私推送**

```json
{
  "title": "工单 #123 已分配",
  "content": "请在今天下班前处理工单 #123。",
  "topic": "工单",
  "privacy": {
    "enable": true,
    "title": "工作通知",
    "content": "你有一条新通知，请打开应用查看。"
  }
}
```

设备通知显示「工作通知」。打开 App 或网页消息详情后，可以查看工单原文和「工单」主题。

### 签名计算规则

当渠道开启签名校验时，请求需携带以下 Header：

| Header | 说明 |
|---|---|
| `X-Timestamp` | 当前 Unix 秒 |
| `X-Signature-256` | `sha256=<hex>` |

计算方式：

1. 拼接原文：`<timestamp>.<raw_body>`
2. 使用渠道密钥计算：`HMAC-SHA256(secret, 原文)`
3. 设置头值：`sha256=<hex结果>`

时间容忍窗口为 5 分钟，超出将被拒绝。

---

## 签名凭证管理

渠道签名密钥通过以下接口管理。鉴权需要在 Header 中携带 `Authorization: Bearer <token>`，token 为登录后获取的会话令牌或在管理后台创建的 PAT（`pf_` 前缀）。仅渠道所有者可操作。

### POST `/push/{push_id}/credentials`

创建或轮换该渠道的签名密钥。

```json
{
  "code": 200,
  "result": {
    "secret": "hex-encoded-secret"
  }
}
```

::: warning 注意
`secret` 仅创建时返回一次，请妥善保存。丢失后只能重新轮换生成新密钥。
:::

### DELETE `/push/{push_id}/credentials`

撤销该渠道的活动凭证。撤销后，若渠道 `require_signature = true`，推送请求将返回 `401`。

```json
{
  "code": 200,
  "message": "credential revoked"
}
```

---

## 决策任务

决策任务用于创建需要用户确认/审批的交互场景（如发布审批、告警确认）。流程：

1. 通过 Webhook 创建决策任务 → 用户在客户端收到通知
2. 用户做出选择 → 任务状态变更
3. 你的服务通过轮询、长轮询或 WebSocket 获取结果

### POST `/push/{push_id}/decision`

创建决策任务，任务自动归属到该渠道的所有者。

**鉴权：** 同消息推送接口，按渠道配置决定是否要求签名。

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | `string` | 是 | 任务标题，1-255 字符 |
| `description` | `string` | 否 | 任务描述 |
| `options` | `array` | 是 | 选项列表，2-10 项 |
| `options[].key` | `string` | 是 | 选项标识，1-50 字符 |
| `options[].label` | `string` | 是 | 选项显示文本，1-100 字符 |
| `options[].description` | `string` | 否 | 选项描述 |
| `default_policy` | `string` | 否 | 超时策略，默认 `auto_reject`。可选：`auto_approve` / `auto_reject` / `escalate` |
| `expires_in_seconds` | `int64` | 是 | 过期时间（秒），60-600 |
| `idempotency_key` | `string` | 否 | 幂等键，最长 64 字符 |

**示例：**

```bash
curl -X POST https://echo.dorimu.cn/push/{push_id}/decision \
  -H "Content-Type: application/json" \
  -d '{
    "title": "是否执行生产发布",
    "description": "main 分支 #128 即将部署到生产环境",
    "options": [
      { "key": "approve", "label": "批准发布" },
      { "key": "reject", "label": "拒绝" }
    ],
    "default_policy": "auto_reject",
    "expires_in_seconds": 300
  }'
```

**返回示例：**

```json
{
  "code": 200,
  "result": {
    "task_id": "uuid",
    "state": "pending",
    "expires_at": "2026-02-22T10:00:00Z",
    "created_at": "2026-02-22T09:55:00Z"
  }
}
```

### GET `/push/{push_id}/decision/{task_id}`

查询单个决策任务当前状态。

**返回字段：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `task_id` | `string` | 决策任务 ID |
| `title` | `string` | 任务标题 |
| `state` | `string` | 状态：`pending` / `decided` / `expired` / `escalated` |
| `default_policy` | `string` | 超时策略 |
| `decision_key` | `string` | 用户选择的选项 key（未决时为空） |
| `decided_by` | `string` | 决策者 ID（未决时为空） |
| `decided_at` | `string` | 决策时间（RFC3339，可选） |
| `expires_at` | `string` | 过期时间（RFC3339） |
| `created_at` | `string` | 创建时间（RFC3339） |
| `updated_at` | `string` | 最后更新时间（RFC3339） |
| `is_final` | `bool` | 是否为终态 |

### GET `/push/{push_id}/decision/{task_id}/wait`

长轮询等待决策任务状态变化。适合不方便使用 WebSocket 的场景。

**Query 参数：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `timeout` | `int` | 否 | 等待超时（秒），默认 25，最大 30 |

**行为：**

- 窗口内状态变化时立即返回
- 无变化则超时返回当前快照
- 任务已是终态时立即返回

**返回字段：** 包含上方查询接口的所有字段，额外新增：

| 字段 | 类型 | 说明 |
|---|---|---|
| `changed` | `bool` | 本次请求期间是否发生变化 |
| `wait_timeout` | `bool` | 是否等待超时 |

### GET `/push/{push_id}/decision/ws`

建立决策专用 WebSocket，实时等待任务结果。适合需要即时响应的场景。

**Query 参数：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `task_id` | `string` | 是 | 决策任务 ID |

**连接行为：**

- 建连后立即推送 `decision.snapshot`（当前状态快照）
- 状态变化时推送 `decision.updated`
- 每 25 秒推送 `heartbeat` 保活
- 单连接最长 10 分钟，超时前推送 `decision.timeout` 后断开

**帧格式：**

```json
// 状态更新
{"type": "decision.updated", "result": {"task_id": "...", "state": "decided", "decision_key": "approve"}}

// 心跳
{"type": "heartbeat", "timestamp": 1708677300123}

// 超时断开
{"type": "decision.timeout", "result": {"task_id": "...", "state": "expired"}}
```

---

## Robot 接入

Robot 是 Echo酱的聊天机器人能力。接入流程：

1. 在 [管理后台](https://echo.dorimu.cn/dashboard/user/) 或通过客户端创建 Robot，获取 `robot_id` 和 `endpoint_secret`
2. Robot 主动连接服务端（WebSocket / SSE / 长轮询）接收用户消息
3. Robot 处理后回传结果（回执或主动消息）

### 鉴权方式

所有 Robot 接口使用签名鉴权，需在请求头中携带：

| Header | 说明 |
|---|---|
| `X-Robot-ID` | Robot ID |
| `X-Timestamp` | 当前 Unix 秒（容忍窗口 60 秒） |
| `X-Nonce` | 随机字符串（10 分钟内不可重复） |
| `X-Signature-256` | `sha256=<hex>` |

**签名计算：**

1. 拼接原文：`<timestamp>.<nonce>.<METHOD>.<path>.<sha256(raw_body)>`
2. 计算：`HMAC-SHA256(endpoint_secret, 原文)`
3. 设置头值：`sha256=<hex结果>`

注意事项：
- `METHOD` 使用 HTTP 大写方法名（`GET`、`POST`）
- `path` 仅路径部分，不含 query string
- GET 请求的 `raw_body` 为空字节串，其 SHA256 固定为 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- 每次请求必须使用新的 `nonce`

### 连接方式

Robot 有三种连接方式，按推荐顺序：

| 方式 | 接口 | 说明 |
|---|---|---|
| WebSocket（推荐） | `GET /robot/ws` | 双向通信，任务推送 + 回执均在 WS 内完成 |
| SSE | `GET /robot/events` | 单向接收任务，回执通过 `POST /robot/reply` |
| 长轮询 | `GET /robot/poll` | 拉取单条任务，回执通过 `POST /robot/reply` |

`GET /robot/poll` 支持 `timeout` 参数（秒，默认 20，最大 30）。

### 任务下发体

当用户发送消息或点击卡片按钮时，Robot 会收到以下结构的任务：

| 字段 | 类型 | 说明 |
|---|---|---|
| `job_id` | `string` | 任务唯一 ID（回执时必须回传） |
| `session_id` | `string` | 会话 ID |
| `message_id` | `string` | 触发消息 ID |
| `robot_id` | `string` | Robot ID |
| `user_id` | `string` | 用户 ID |
| `content` | `string` | 消息内容 |
| `type` | `string` | 任务类型：`chat.message`（用户消息）/ `action_clicked`（按钮点击） |
| `action_id` | `string` | 按钮 ID（仅 `action_clicked`） |
| `action_value` | `string` | 按钮附加数据（仅 `action_clicked`） |
| `target_message_id` | `string` | 被点击的卡片消息 ID（仅 `action_clicked`） |
| `clicked_user_id` | `string` | 点击按钮的用户 ID（仅 `action_clicked`，可选） |
| `created_at` | `string` | 创建时间（RFC3339） |
| `expires_at` | `string` | 任务过期时间（RFC3339，可选） |

### POST `/robot/reply`

Robot 回执上报（配合 SSE / Poll 模式使用，WS 模式直接在连接内发送 `type=reply`）。

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `job_id` | `string` | 是 | 对应任务的 `job_id` |
| `content` | `string` | `content_type` 非 `pass` 时必填 | 回复内容；`content_type=pass` 时可为空 |
| `is_complete` | `bool` | 是 | 是否为完整回复（流式输出时先发 `false`，最后一条发 `true`） |
| `content_type` | `string` | 否 | 默认 `text`。可选：`text` / `markdown` / `card` / `ocard` / `pass` |
| `action` | `string` | 否 | 默认 `append`。可选：`append` / `edit` |
| `target_message_id` | `string` | `edit` 时必填 | 要编辑的目标消息 ID |

### POST `/robot/messages`

Robot 主动发送消息，不依赖用户先发消息。

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `session_id` | `string` | 是 | 会话 ID |
| `action` | `string` | 否 | 默认 `append`。可选：`append`（追加）/ `edit`（编辑）/ `recall`（撤回） |
| `target_message_id` | `string` | `edit` / `recall` 时必填 | 目标消息 ID |
| `content` | `string` | `append` / `edit` 时必填 | 消息内容 |
| `content_type` | `string` | 否 | 默认 `text`。可选：`text` / `markdown` / `card` / `ocard` |
| `is_complete` | `bool` | 否 | 默认 `true` |
| `idempotency_key` | `string` | 否 | 幂等键，最长 128 字符；也可以通过 `Idempotency-Key` Header 传入 |

**幂等重试：**

- `idempotency_key` 与 `Idempotency-Key` Header 同时存在时，两者必须一致，否则返回 `400`
- 同一个 Robot 使用相同幂等键和相同请求内容重试时，返回相同的稳定 `message_id`，不会重复创建消息
- 相同幂等键用于不同请求内容时返回 `409`
- 幂等记录至少保留 24 小时

**返回示例：**

```json
{
  "code": 200,
  "result": {
    "message_id": "uuid",
    "status": "queued"
  }
}
```

### GET `/robot/sessions`

查询当前 Robot 关联的会话列表。

**Query 参数：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `state` | `string` | 否 | 默认 `active`，可传 `archived` 查看归档会话 |
| `page` | `int` | 否 | 页码，默认 1 |
| `limit` | `int` | 否 | 每页数量，默认 20，最大 100 |

**返回字段：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `sessions[].session_id` | `string` | 会话 ID |
| `sessions[].user_id` | `string` | 用户 ID |
| `sessions[].title` | `string` | 会话标题 |
| `sessions[].state` | `string` | 会话状态 |
| `sessions[].last_active_at` | `string` | 最后活跃时间 |
| `sessions[].created_at` | `string` | 创建时间 |
| `sessions[].updated_at` | `string` | 最后更新时间 |
| `total` | `int` | 总数 |
| `page` | `int` | 当前页码 |
| `limit` | `int` | 当前每页数量 |

### GET `/robot/history`

查询指定会话的历史消息，用于 Robot 获取对话上下文。返回当前会话的最新消息，按消息序号倒序排列。

**Query 参数：**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `session_id` | `string` | 是 | 会话 ID |
| `limit` | `int` | 否 | 返回条数，默认 30，最大 30 |

**返回字段：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `messages[].message_id` | `string` | 消息 ID |
| `messages[].sender_type` | `string` | 发送者类型：`user` / `robot` |
| `messages[].sender_id` | `string` | 发送者 ID |
| `messages[].content_type` | `string` | 内容类型：`text` / `markdown` / `card` / `ocard` |
| `messages[].content` | `string` | 消息内容 |
| `messages[].sequence_num` | `int64` | 消息序号 |
| `messages[].is_complete` | `bool` | 是否完整消息 |
| `messages[].recalled` | `bool` | 是否已撤回 |
| `messages[].parent_id` | `string` | 父消息 ID（Robot 回复时指向用户原始消息） |
| `messages[].created_at` | `string` | 创建时间（RFC3339） |
| `total` | `int` | 当前会话的消息总数 |

---

## 内容类型说明

Robot 回复支持以下内容类型（`content_type`）：

| 值 | 说明 | 使用方 |
|---|---|---|
| `text` | 纯文本（默认） | 用户、Robot |
| `markdown` | Markdown 格式文本，客户端负责渲染 | 用户、Robot |
| `card` | 卡片 JSON，支持结构化内容和交互按钮 | 仅 Robot |
| `ocard` | 一次性卡片，用户点击按钮后自动撤回该消息 | 仅 Robot |
| `pass` | 确认收到但不回复，不创建消息、不推送通知 | 仅 Robot（回执） |

### Card JSON 格式

`card` 和 `ocard` 的 `content` 字段为 JSON 字符串：

```json
{
  "title": "审批单",
  "body": "请审批发布 #1024（支持 Markdown）",
  "actions": [
    { "id": "approve", "label": "通过", "style": "primary", "value": "1024" },
    { "id": "reject", "label": "驳回", "style": "danger", "value": "1024" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | `string` | 是 | 卡片标题 |
| `body` | `string` | 是 | 卡片正文，支持 Markdown |
| `actions` | `array` | 否 | 交互按钮列表 |
| `actions[].id` | `string` | 是 | 按钮唯一标识，对应 `action_clicked` 任务中的 `action_id` |
| `actions[].label` | `string` | 是 | 按钮显示文本 |
| `actions[].style` | `string` | 否 | 按钮样式：`primary` / `danger` / `default` |
| `actions[].value` | `string` | 否 | 按钮携带的附加数据，对应 `action_value` |

用户点击按钮后，Robot 会收到 `type=action_clicked` 的任务，包含 `action_id` 和 `action_value`。若消息类型为 `ocard`，按钮点击后该消息会被自动撤回。
