# 消息中心 API

消息中心 API 用于查询账号内的消息和设备投递记录，也可以标记已读、删除或置顶消息。接口地址为 `https://echo.dorimu.cn`。

## 接入方式

在[网页工作台](/guide/web-console#访问令牌)创建个人访问令牌（PAT），调用时使用 `Authorization: Bearer <PAT>`。

| 用途 | 需要的权限 |
|---|---|
| 查询列表、详情、投递记录和未读摘要 | `message.read` |
| 标记已读、删除、置顶和稍后处理 | `message.write` |
| 通过指定频道发送通知 | `notification.write` |

API 响应格式见 [API 文档](/guide/api#响应格式)。下面的命令使用终端环境变量 `ECHO_PAT` 读取令牌。

## 通过频道发送消息

使用 `POST /v1/channel/{channel_id}/notifications` 向已授权的频道发送通知。将示例中的 `{channel_id}` 换成频道 ID。通过 [Webhook](/guide/api#消息推送)发送时使用的是 `push_id`。

```bash
curl -X POST 'https://echo.dorimu.cn/v1/channel/{channel_id}/notifications' \
  -H "Authorization: Bearer $ECHO_PAT" \
  -H 'Content-Type: application/json' \
  -d '{"title":"构建完成","content":"可以查看本次构建结果了。","topic":"构建通知"}'
```

请求支持 [Webhook 消息字段](/guide/api#消息推送)，包括 `topic` 和 `privacy`。受理成功后，使用 `result.message_id` 查询后续状态。

## 查询消息

| 接口 | 说明 |
|---|---|
| `GET /v1/message` | 消息列表，支持 `page`、`limit`、`channel_id` 和状态筛选 |
| `GET /v1/message/search` | 关键词搜索，使用 `keyword`，并可按类型和状态筛选 |
| `GET /v1/message/{message_id}` | 查询单条消息，结果在 `result.message` |
| `GET /v1/message/{message_id}/deliveries` | 查询各设备的投递状态 |
| `GET /v1/message/unread/summary` | 查询未读总数和分类未读数 |

**示例 — 查询未读消息**

```bash
curl 'https://echo.dorimu.cn/v1/message?page=1&limit=20&unread_only=true' \
  -H "Authorization: Bearer $ECHO_PAT"
```

每页最多 100 条。`message_type` 支持 `normal`、`chat`、`decision` 和 `system`。还可以用 `needs_action`、`pinned_only` 和 `snoozed_only` 传入 `true`，只查看对应状态。普通列表默认隐藏仍在稍后处理时段内的消息。

消息的 `title` 和 `content` 保留原文。设置过的 `topic` 和 `privacy` 会随消息返回，旧消息可能没有这两个字段。`delivery_summary` 里的投递计数在 JSON 中使用十进制字符串。

## 处理消息

| 接口 | 说明 |
|---|---|
| `POST /v1/message/{message_id}/read` | 标记单条消息已读，请求体可传 `{}` |
| `POST /v1/message/batch/read` | 批量标记已读，请求体传 `message_ids` 数组 |
| `DELETE /v1/message/{message_id}` | 删除单条消息 |
| `POST /v1/message/batch/delete` | 批量删除，请求体传 `message_ids` 数组 |
| `POST /v1/message/{message_id}/pin` | 请求体传 `pinned=true` 置顶，传 `false` 取消 |
| `POST /v1/message/{message_id}/snooze` | 使用 `snoozed_until` 指定将来的 RFC3339 时间，传空字符串可取消 |

批量操作可能只成功一部分。可以根据返回的 `success_message_ids` 和 `errors` 确认每条消息的处理结果。稍后处理时，`snooze_mode` 默认是 `inbox`，到期后消息会重新出现在列表中。需要到期发送设备通知时，可以使用 `push`。
