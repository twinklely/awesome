import { defineConfig } from 'vitepress'
import { withDuxTheme } from '@duxweb/vitepress-theme/config'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/awesome/',
  title: "Awesome",
  description: "描述",
  themeConfig: {
    logo: '/icon.png',
    siteTitle: 'Awesome',
    search: {
      provider: 'local'
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    outline: {
      level: [2, 4],
      label: '本页目录'
    },
    editLink: {
      pattern: 'https://github.com/twinklely/awesome/edit/main/docs/:path',
      text: '在 GitHub 编辑'
    },
    nav: [
      { text: '主页', link: '/' },
      { text: '更多', link: '/info/base' }
    ],
    sidebar: [
      {
        text: '通用',
        collapsed: false,
        items: [
          { text: '如何在一天内彻底改变你的人生', link: '/info/base' },
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
      }, {
        text: 'jvm',
        items: [
          { text: 'JVM调优实践', link: '/jvm/JVM 调优实践（堆大小、GC 参数、监控工具）' }
        ],
      }, {
        text: 'spring',
        items: [
          { text: 'SpringAOP的实现原理', link: '/spring/Spring AOP 的实现原理（JDK 动态代理 vs CGLIB）' }
        ],
      }, {
        text: 'go',
        items: [
          { text: 'Go的GC（垃圾回收）采用什么算法？如何减少 GC 压力', link: '/go/Go的GC采用什么算法？如何减少 GC 压力？' },
          { text: 'Go的goroutine和线程有什么区别', link: '/go/Go的goroutine-和线程有什么区别' }
        ],
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/twinklely/awesome' }
    ],
    footer: {
      message: 'Released under the CC-BY-SA-4.0 license.',
      copyright: `Copyright © 2018-${new Date().getFullYear()} <a href="https://github.com/twinklely/awesome">Awesome</a>`
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
