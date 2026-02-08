# QQ经典农场助手 - 任务清单

## 阶段一：项目基础搭建

- [x] T01 - 初始化 Electron + Vue3 + TypeScript 项目结构
- [x] T02 - 配置 Vite + Electron 开发环境（热重载）
- [x] T03 - 配置 electron-builder 打包

## 阶段二：主进程核心模块

- [x] T04 - 实现 store.js 配置持久化模块
- [x] T05 - 实现 planner.js 种植策略计算模块
- [x] T06 - 改造现有模块（utils.js 日志事件、farm.js 种子指定、status.js 禁用终端）
- [x] T07 - 实现 bot.js 机器人核心控制器
- [x] T08 - 实现 ipc.js IPC 通道处理
- [x] T09 - 实现 tray.js 系统托盘
- [x] T10 - 实现 Electron 主进程入口 main.js + preload.js

## 阶段三：前端页面开发

- [x] T11 - 搭建前端框架（App.vue + 路由 + 暗色主题 + IPC 桥接）
- [x] T12 - 实现首页 - 状态卡片 + 登录面板
- [x] T13 - 实现首页 - 功能开关区
- [x] T14 - 实现首页 - 种植策略区 + 最近操作
- [x] T15 - 实现设置页 - 参数配置 + 种植效率排行
- [x] T16 - 实现日志页 - 筛选 + 滚动日志

## 阶段四：联调与打包

- [x] T17 - 主进程与渲染进程联调测试
- [x] T18 - electron-builder 打包为 exe
- [x] T19 - 编写部署文档 deployment.md
