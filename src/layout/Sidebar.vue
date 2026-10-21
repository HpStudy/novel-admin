<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const menu = [
  { title: '数据看板', icon: 'House', index: '/dashboard' },
  {
    title: '内容管理',
    icon: 'FolderOpened',
    index: '/content',
    children: [
      { title: '书籍管理', index: '/book/list' },
      { title: '章节管理', index: '/chapter/list' },
      { title: '分类管理', index: '/category' },
      { title: 'Banner管理', index: '/banner' }
    ]
  },
  { title: '用户管理', icon: 'User', index: '/user' },
  { title: '订单管理', icon: 'ShoppingCart', index: '/order' },
  { title: '评论管理', icon: 'ChatLineRound', index: '/comment' },
  { title: '系统设置', icon: 'Setting', index: '/setting' }
]

const activePath = computed(() => {
  if (route.path === '/book/edit') return '/book/list'
  if (route.path === '/chapter/upload') return '/chapter/list'
  return route.path
})

const go = (path) => router.push(path)
</script>

<template>
  <div class="sidebar-wrap">
    <div class="logo-box">
      <div class="logo-icon">N</div>
      <span v-if="!props.collapsed">小说后台</span>
    </div>

    <el-menu
      :default-active="activePath"
      :collapse="props.collapsed"
      :collapse-transition="false"
      :router="false"
      class="nav-menu"
      background-color="#001529"
      text-color="#c6d1de"
      active-text-color="#fff"
      :default-openeds="['/content']"
      unique-opened
    >
      <template v-for="item in menu" :key="item.index">
        <el-sub-menu v-if="item.children" :index="item.index">
          <template #title>
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </template>
          <el-menu-item
            v-for="child in item.children"
            :key="child.index"
            :index="child.index"
            @click="go(child.index)"
          >
            {{ child.title }}
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item v-else :index="item.index" @click="go(item.index)">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </template>
    </el-menu>
  </div>
</template>

<style scoped>
.sidebar-wrap {
  height: 100%;
  background: #001529;
  color: #fff;
}

.logo-box {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-weight: 700;
  font-size: 18px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff, #67c23a);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.nav-menu {
  border-right: none;
}
</style>
