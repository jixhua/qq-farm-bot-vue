# QQ经典农场助手 - 架构设计文档

## 1. 技术栈选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Electron | 跨平台桌面应用，打包为 exe |
| 前端框架 | Vue 3 + TypeScript | Composition API |
| UI 组件库 | Element Plus | 暗色主题 |
| 构建工具 | Vite | 前端构建 |
| 打包工具 | electron-builder | 输出 Windows exe |
| 后端逻辑 | 现有 Node.js 模块 | 运行在 Electron 主进程 |
| 通信协议 | Protobuf + WebSocket | 保持现有不变 |
| 进程通信 | Electron IPC | 主进程 ↔ 渲染进程 |

## 2. 系统分层

```
┌─────────────────────────────────────────────────┐
│                  渲染进程 (Renderer)              │
│                                                  │
│   Vue 3 + TypeScript + Element Plus              │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│   │ 首页视图  │ │ 设置视图  │ │ 日志视图  │       │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘       │
│        └─────────────┼───────────┘               │
│                      │                           │
│              ┌───────┴───────┐                   │
│              │  IPC Client   │                   │
│              │  (preload.ts) │                   │
│              └───────┬───────┘                   │
├──────────────────────┼──────────────────────────┤
│                Electron IPC                      │
├──────────────────────┼──────────────────────────┤
│                  主进程 (Main)                    │
│              ┌───────┴───────┐                   │
│              │  IPC Handler  │                   │
│              │  (ipc.js)     │                   │
│              └───────┬───────┘                   │
│                      │                           │
│              ┌───────┴───────┐                   │
│              │  Bot Core     │                   │
│              │  (bot.js)     │                   │
│              └───────┬───────┘                   │
│                      │                           │
│   ┌──────────────────┼──────────────────────┐   │
│   │          现有模块（保持不变）              │   │
│   │                                          │   │
│   │  config.js  utils.js  proto.js           │   │
│   │  network.js farm.js   friend.js          │   │
│   │  task.js    warehouse.js  invite.js      │   │
│   │  gameConfig.js  status.js  decode.js     │   │
│   └──────────────────────────────────────────┘   │
│                                                  │
│   ┌──────────────────────────────────────────┐   │
│   │  新增模块                                 │   │
│   │  store.js    - 配置持久化                  │   │
│   │  planner.js  - 种植策略计算                │   │
│   └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 3. 模块划分

### 3.1 主进程新增模块

#### bot.js - 机器人核心控制器

对现有模块的封装层，提供统一的控制接口。**不修改现有模块代码**，通过包装调用实现控制。

```
职责：
- 管理机器人生命周期（启动/停止/重连）
- 管理功能开关状态
- 收集状态数据供 UI 展示
- 转发日志到渲染进程

对外接口：
- connect(code, platform) → 连接登录
- disconnect() → 断开连接
- getStatus() → 获取当前状态
- setFeatureEnabled(feature, enabled) → 开关功能
- getFeatureStates() → 获取所有功能开关状态
```

#### ipc.js - IPC 通信处理

处理渲染进程发来的请求，调用 bot.js 并返回结果。

```
IPC 通道定义：
- bot:connect        → 连接登录
- bot:disconnect     → 断开连接
- bot:status         → 获取状态
- bot:feature-toggle → 切换功能开关
- bot:get-config     → 获取配置
- bot:save-config    → 保存配置
- bot:get-friends    → 获取好友列表
- bot:get-plant-plan → 获取种植策略
- bot:log            → 日志推送（主进程 → 渲染进程）
- bot:status-update  → 状态更新推送
```

#### store.js - 配置持久化

使用 JSON 文件存储配置，路径为 Electron 的 userData 目录。

```
存储内容：
- code（上次使用的 code，仅做展示参考）
- platform（qq/wx）
- features（功能开关状态）
- farmInterval（农场巡查间隔）
- friendInterval（好友巡查间隔）
- plantMode（auto/manual）
- plantSeedId（手动选择的种子ID）
```

#### planner.js - 种植策略计算

从现有 tools/analyze-exp-24h-lv24.js 的逻辑提取，集成到运行时。

```
职责：
- 根据用户等级，查询商店可购买种子
- 计算每种作物的 经验/秒 效率
- 返回排序后的推荐列表
- 提供最优种子选择

输入：用户等级、商店数据、植物配置
输出：[{ seedId, name, growTime, expPerHour, rank }]
```

### 3.2 现有模块改造点

**原则：最小改动，不破坏现有逻辑。**

| 模块 | 改造内容 |
|------|----------|
| utils.js | `log` / `logWarn` 增加事件发射，让 bot.js 能监听日志 |
| farm.js | `findBestSeed` 支持外部指定种子ID（当用户手动选择时） |
| config.js | 功能开关字段由 bot.js 在运行时注入 |
| status.js | Electron 环境下禁用终端 ANSI 状态栏（改为 IPC 推送） |

### 3.3 渲染进程（前端）

```
src/renderer/
├── main.ts              # Vue 应用入口
├── App.vue              # 根组件（左侧导航 + 右侧路由）
├── router/
│   └── index.ts         # 路由：首页/设置/日志
├── views/
│   ├── HomeView.vue     # 首页：状态卡片 + 登录 + 功能开关 + 种植策略 + 最近日志
│   ├── SettingsView.vue # 设置：参数配置 + 好友列表 + 种植效率排行
│   └── LogView.vue      # 日志：筛选 + 滚动日志列表
├── components/
│   ├── StatusCard.vue   # 状态卡片组件
│   ├── LoginPanel.vue   # 登录面板组件
│   ├── FeatureSwitch.vue# 功能开关组件
│   ├── PlantPlan.vue    # 种植策略组件
│   ├── LogList.vue      # 日志列表组件
│   └── FriendTable.vue  # 好友列表组件
├── composables/
│   ├── useBot.ts        # 机器人状态管理（IPC 调用封装）
│   └── useLog.ts        # 日志管理
├── types/
│   └── index.ts         # TypeScript 类型定义
└── styles/
    └── dark-theme.css   # 暗色主题变量
```

## 4. 数据流设计

### 4.1 登录流程

```
[渲染进程]                    [主进程]
LoginPanel                    ipc.js → bot.js
    │                              │
    │── bot:connect(code,platform)─→│
    │                              │── connect(code) → network.js
    │                              │       │
    │                              │←── 登录成功回调
    │                              │── bot:status-update ──→│
    │←── 返回登录结果 ──────────────│                        │
    │                              │                        │
    │  (状态卡片自动更新)            │                        │
```

### 4.2 日志推送流程

```
[现有模块]              [bot.js]              [渲染进程]
utils.log()
    │
    │── emit('log', data) ──→│
                              │── bot:log(data) ──→│
                              │                    │── 追加到日志列表
                              │                    │── 更新最近操作
```

### 4.3 功能开关流程

```
[渲染进程]                    [主进程]
FeatureSwitch                 ipc.js → bot.js
    │                              │
    │── bot:feature-toggle ────→│
    │   (feature, enabled)       │── 启动/停止对应模块循环
    │                              │── store.save()
    │←── 返回新状态 ────────────│
```

### 4.4 种植策略流程

```
[渲染进程]                    [主进程]
PlantPlan                     ipc.js → bot.js → planner.js
    │                              │
    │── bot:get-plant-plan ────→│
    │                              │── 读取用户等级
    │                              │── 读取植物配置
    │                              │── 计算效率排行
    │←── 返回排行列表 ──────────│
    │                              │
    │── bot:save-config ────────→│
    │   (plantMode, seedId)      │── 更新 farm.js 种子选择
    │                              │── store.save()
```

## 5. 项目目录结构

```
qq-farm-bot/
├── electron/                    # Electron 主进程
│   ├── main.js                  # Electron 入口
│   ├── preload.js               # 预加载脚本（IPC 桥接）
│   ├── ipc.js                   # IPC 通道处理
│   ├── bot.js                   # 机器人核心控制器
│   ├── store.js                 # 配置持久化
│   ├── planner.js               # 种植策略计算
│   └── tray.js                  # 系统托盘管理
├── src/                         # 现有后端模块（保持不变）
│   ├── config.js
│   ├── utils.js                 # 微调：增加日志事件
│   ├── proto.js
│   ├── network.js
│   ├── farm.js                  # 微调：支持外部指定种子
│   ├── friend.js
│   ├── task.js
│   ├── status.js                # 微调：Electron 下禁用终端状态栏
│   ├── warehouse.js
│   ├── invite.js
│   ├── gameConfig.js
│   └── decode.js
├── renderer/                    # 前端 Vue 3 应用
│   ├── index.html
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   ├── views/
│   ├── components/
│   ├── composables/
│   ├── types/
│   └── styles/
├── proto/                       # Protobuf 定义（不变）
├── gameConfig/                  # 游戏配置数据（不变）
├── docs/                        # 文档
├── package.json                 # 更新：增加 Electron + Vue 依赖
├── vite.config.ts               # Vite 配置
├── electron-builder.yml         # 打包配置
└── tsconfig.json                # TypeScript 配置
```

## 6. API 契约定义

### 6.1 IPC 通道 - 请求/响应

```typescript
// === 连接登录 ===
// 通道: bot:connect
// 请求: { code: string, platform: 'qq' | 'wx' }
// 响应: { success: boolean, error?: string }

// === 断开连接 ===
// 通道: bot:disconnect
// 请求: void
// 响应: { success: boolean }

// === 获取状态 ===
// 通道: bot:status
// 请求: void
// 响应: BotStatus

interface BotStatus {
  connected: boolean
  gid: number
  name: string
  level: number
  gold: number
  exp: number
  features: Record<string, boolean>
  currentPlant: { name: string, seedId: number } | null
  landSummary: { total: number, growing: number, harvestable: number, empty: number }
}

// === 功能开关 ===
// 通道: bot:feature-toggle
// 请求: { feature: string, enabled: boolean }
// 响应: { success: boolean, features: Record<string, boolean> }

// === 获取/保存配置 ===
// 通道: bot:get-config
// 请求: void
// 响应: AppConfig

// 通道: bot:save-config
// 请求: Partial<AppConfig>
// 响应: { success: boolean }

interface AppConfig {
  platform: 'qq' | 'wx'
  farmInterval: number      // 秒
  friendInterval: number    // 秒
  plantMode: 'auto' | 'manual'
  plantSeedId: number       // 手动模式下的种子ID
  features: Record<string, boolean>
}

// === 种植策略 ===
// 通道: bot:get-plant-plan
// 请求: void
// 响应: PlantPlanResult

interface PlantPlanResult {
  currentLevel: number
  recommended: PlantOption
  options: PlantOption[]
}

interface PlantOption {
  seedId: number
  name: string
  growTime: number          // 秒（原始）
  growTimeWithFert: number  // 秒（施肥后）
  expPerHarvest: number
  expPerHour: number        // 经验/小时
  rank: number
}

// === 好友列表 ===
// 通道: bot:get-friends
// 请求: void
// 响应: FriendInfo[]

interface FriendInfo {
  gid: number
  name: string
  level: number
  lastAction: string        // 最近互动描述
}
```

### 6.2 IPC 通道 - 主进程推送

```typescript
// === 日志推送 ===
// 通道: bot:log
// 数据: LogEntry

interface LogEntry {
  time: string              // HH:mm:ss
  category: 'farm' | 'friend' | 'task' | 'system' | 'shop'
  level: 'info' | 'warn'
  message: string
}

// === 状态更新推送 ===
// 通道: bot:status-update
// 数据: Partial<BotStatus>
```

## 7. 与需求/UI 一致性校验

| 需求 | 架构支撑 |
|------|----------|
| F01 登录管理 | bot:connect / bot:disconnect / bot:status |
| F02 农场状态看板 | bot:status + bot:status-update 推送 |
| F03 操作日志 | bot:log 推送 + 前端 useLog |
| F04 功能开关 | bot:feature-toggle + bot.js 控制 |
| F05 最优种植策略 | planner.js + bot:get-plant-plan |
| F06 系统托盘 | tray.js |
| F07 参数配置 | bot:save-config + store.js |
| F08 好友列表 | bot:get-friends |
| F09 断线重连 | bot:status-update 推送断线事件 |
| F10 配置持久化 | store.js |
