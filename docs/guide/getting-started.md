# 快速开始

欢迎使用 Echo酱推送服务。本文档将帮助你快速了解和接入推送服务。

## 简介

Echo酱是一个消息推送服务，帮助你将消息快速推送到手机等终端设备。

## 客户端下载

Echo酱已上架以下应用商店，搜索「Echo酱」即可下载：

- 华为应用市场（鸿蒙原生推送）
- OPPO 软件商店（OPPO 原生推送）
- 小米应用商店（小米原生推送）
- 荣耀应用商店（荣耀原生推送）
- vivo应用商店（vivo原生推送）

原生推送通道无需保活后台，消息即时送达，省电高效。

## 管理后台

登录 [管理后台](https://echo.dorimu.cn/dashboard/user/) 可以：

- 创建和管理推送渠道
- 查看消息推送记录
- 管理设备和通知偏好
- 创建 Robot 和 PAT 令牌

## 推送消息

获取渠道的 `push_id` 后，通过一个 HTTP 请求即可推送消息：

```bash
curl -X POST https://echo.dorimu.cn/push/{push_id} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello",
    "content": "这是一条测试消息"
  }'
```

需要了解消息、频道、Robot 会话和通知设置，请参阅 [App 功能说明](/guide/app-usage)。

更多接口详情请参阅 [API 文档](/guide/api)。
