import { defineConfig } from 'vitepress'
import { withDuxTheme } from '@duxweb/vitepress-theme/config'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/awesome/',
  lang: 'en-US',
  title: "首页",
  description: "描述",

  themeConfig: {
    logo: '/icon.png',
    siteTitle: 'Hello World',
    search: {
      provider: 'local'
    },
    footer: {
      message: 'Released under the CC-BY-SA-4.0 license.',
      copyright: `Copyright © 2018-${new Date().getFullYear()} <a href="https://github.com/doocs">Doocs</a>`
    },
    logo: '/icon.png',
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    editLink: {
      pattern: 'https://github.com/doocs/advanced-java/edit/main/docs/:path',
      text: '在 GitHub 编辑'
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '主页', link: '/' },
      { text: '更多', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: '示例',
        collapsed: false,
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' },
        ]
      },
        {
        text: 'java',
        collapsed: false,
        items: [
          { text: 'JavaIO基础知识总结', link: '/java/Java IO 基础知识总结' },
          { text: 'Java的happens-before 规则', link: '/java/Java 的 happens-before 规则' },
          { text: 'Java的JDBC 连接池实现原理（HikariCP）', link: '/java/Java 的 JDBC 连接池实现原理（HikariCP）' },
          { text: 'Java的volatile 关键字和内存可见性', link: '/java/Java 的 volatile 关键字和内存可见性' },
          { text: 'Java的泛型和类型擦除', link: '/java/Java 的泛型和类型擦除' },
          { text: 'Java的注解和自定义注解', link: '/java/Java 的注解和自定义注解' }
        ]
      },{
          text: 'jvm',
          items: [
            { text: 'JVM调优实践', link: '/jvm/JVM 调优实践（堆大小、GC 参数、监控工具）' }
          ],
        },{
          text: 'spring',
          items: [
            { text: 'SpringAOP的实现原理', link: '/spring/Spring AOP 的实现原理（JDK 动态代理 vs CGLIB）' }
          ],
        },{
          text: 'go',
          items: [
            { text: 'Go的GC（垃圾回收）采用什么算法？如何减少 GC 压力', link: '/go/Go的GC采用什么算法？如何减少 GC 压力？' },
            { text: 'Go的goroutine和线程有什么区别', link: '/go/Go的goroutine-和线程有什么区别' }
          ],
        }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress',ariaLabel:"代码库"},
        { icon: 'gitlab', link: 'https://github.com/vuejs/vitepress' }
    ],
    footer: {
      message: '依据 MIT 许可证发布。',
      copyright: '版权所有 © 2019-present Evan You'
    },
    lastUpdated: {
      text: '更新于',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    },
    externalLinkIcon: true
  }

})
