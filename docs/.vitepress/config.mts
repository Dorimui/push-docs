import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Echo酱',
  description: 'Echo酱推送服务说明文档',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/getting-started' },
      { text: 'App 功能', link: '/guide/app-usage' },
      { text: 'API 文档', link: '/guide/api' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '使用指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: 'App 功能说明', link: '/guide/app-usage' },
          ],
        },
        {
          text: '开发者接入',
          items: [{ text: 'API 文档', link: '/guide/api' }],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/dorimui/push-docs' },
    ],
    outline: {
      level: [2, 3],
      label: '本页目录',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    sidebarMenuLabel: '文档导航',
    returnToTopLabel: '返回顶部',
    skipToContentLabel: '跳到正文',
  },
})
