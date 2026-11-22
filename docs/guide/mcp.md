# MCP 接入

通过 Echo酱 MCP，可以在 Codex、Claude Code 或其他支持 Streamable HTTP 的客户端里发送通知、发起决策和查询结果。

## 创建访问令牌

在[网页工作台](/guide/web-console#访问令牌)创建个人访问令牌（PAT），按需要勾选权限。

| 用途 | 权限 |
|---|---|
| 查看频道 | `channel.read` |
| 发送通知 | `notification.write` |
| 查询消息和投递结果 | `message.read` |
| 发起决策或提交选项 | `decision.write` |
| 查询决策结果 | `decision.read` |

如果只需要发送和查询通知，选择前 3 项即可。创建后，将令牌放在启动客户端的环境变量 `PUSHFLOW_MCP_PAT` 中，配置文件只引用变量名。

## 配置客户端

服务地址为 `https://echo.dorimu.cn/mcp`，传输方式为 Streamable HTTP。通用客户端可添加 `Authorization: Bearer <PAT>` 请求头。

### Codex

在 `~/.codex/config.toml` 中添加下面的配置，然后重新启动 Codex。终端可以运行 `codex mcp list` 查看配置。

```toml
[mcp_servers.echo]
url = "https://echo.dorimu.cn/mcp"
bearer_token_env_var = "PUSHFLOW_MCP_PAT"
```

更多配置项见 [Codex MCP 文档](https://learn.chatgpt.com/docs/extend/mcp#streamable-http-servers)。

### Claude Code

在项目根目录的 `.mcp.json` 中添加 `echo` 服务。已有其他 MCP 时，将 `echo` 加进现有的 `mcpServers`。重新打开 Claude Code 后，可用 `/mcp` 查看连接状态。

```json
{
  "mcpServers": {
    "echo": {
      "type": "http",
      "url": "https://echo.dorimu.cn/mcp",
      "headers": {
        "Authorization": "Bearer ${PUSHFLOW_MCP_PAT}"
      }
    }
  }
}
```

配置格式见 [Claude Code MCP 文档](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json)。Echo酱当前使用 PAT 认证，需要客户端能设置 Bearer 请求头。

## 连接问题

| 现象 | 处理方式 |
|---|---|
| HTTP `401` | 确认 PAT 未过期或撤销，且客户端启动时能读到 `PUSHFLOW_MCP_PAT`。 |
| 列表里找不到工具 | 检查令牌是否有对应权限，例如发送通知需要 `notification.write`。 |
| 查不到投递记录 | 确认使用的是发送返回的 `message_id`，再稍等片刻查询。 |
