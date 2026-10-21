<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const emit = defineEmits(['toggle-sidebar'])

const breadcrumbs = computed(() => {
  const path = route.path
  const map = {
    '/dashboard': '数据看板',
    '/book/list': '书籍管理',
    '/book/edit': '书籍编辑',
    '/chapter/list': '章节管理',
    '/chapter/upload': '批量上传章节',
    '/category': '分类管理',
    '/user': '用户管理',
    '/order': '订单管理',
    '/banner': 'Banner管理',
    '/comment': '评论管理',
    '/setting': '系统设置'
  }

  return [{ path, title: map[path] || '首页' }]
})

const logout = () => {
  auth.clearAuth()
  router.push('/login')
}
</script>

<template>
  <div class="navbar">
    <div class="crumbs">
      <el-button class="collapse-button" text @click="emit('toggle-sidebar')">
        <el-icon><Fold /></el-icon>
      </el-button>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
          {{ item.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="user-box">
      <el-avatar :size="32" :src="auth.user.avatar || 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80'" />
      <span>{{ auth.user.nickname || auth.user.username }}</span>
      <el-button text @click="logout">退出登录</el-button>
    </div>
  </div>
</template>

<style scoped>
.navbar {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.crumbs {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 18px;
}

.collapse-button {
  font-size: 18px;
}

.user-box {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #333;
}
</style>
