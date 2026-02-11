<template>
  <div class="app-container">
    <!-- 自定义标题栏 -->
    <div class="titlebar">
      <span class="titlebar-title">QQ经典农场助手</span>
      <div class="status-dot" :class="statusClass" :title="statusText"></div>
    </div>

    <!-- 主体区域 -->
    <div class="main-layout">
      <!-- 左侧导航 -->
      <div class="sidebar">
        <div class="nav-items">
          <div
            v-for="item in navItems"
            :key="item.path"
            class="nav-item"
            :class="{ active: route.path === item.path }"
            @click="router.push(item.path)"
            :title="item.label"
          >
            <span class="nav-icon">{{ item.icon }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧内容 -->
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const connected = ref(false)

const navItems = [
  { path: '/', icon: '🏠', label: '首页' },
  { path: '/settings', icon: '⚙️', label: '设置' },
  { path: '/logs', icon: '📋', label: '日志' },
]

const statusClass = computed(() => (connected.value ? 'online' : 'offline'))
const statusText = computed(() => (connected.value ? '在线' : '离线'))

// 监听状态更新
if (window.electronAPI) {
  window.electronAPI.on('bot:status-update', (data) => {
    if (data && typeof data.connected === 'boolean') {
      connected.value = data.connected
    }
  })
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background-color: var(--bg-primary);
}

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 72px;
  background-color: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 12px;
  flex-shrink: 0;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  margin: 0 auto;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.active {
  background: var(--color-accent);
}

.nav-icon {
  font-size: 20px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: background 0.3s;
}

.status-dot.online {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
}

.status-dot.offline {
  background: var(--color-danger);
  box-shadow: 0 0 6px var(--color-danger);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 16px;
}

.content > * {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.titlebar-title {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    flex-direction: row;
    padding: 0;
    order: 2;
    border-top: 1px solid var(--color-border);
  }

  .nav-items {
    flex-direction: row;
    flex: 1;
    justify-content: space-around;
    gap: 0;
  }

  .nav-item {
    flex: 1;
    max-width: 64px;
    height: 52px;
    border-radius: 0;
  }

  .content {
    padding: 12px;
    padding-bottom: env(safe-area-inset-bottom, 12px);
  }
}
</style>
