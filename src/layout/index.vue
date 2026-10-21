<script setup>
import { computed, ref } from 'vue'
import Sidebar from './Sidebar.vue'
import Navbar from './Navbar.vue'

const collapsed = ref(false)
const asideWidth = computed(() => (collapsed.value ? '64px' : '220px'))
</script>

<template>
  <el-container class="layout-app">
    <el-aside :width="asideWidth">
      <Sidebar :collapsed="collapsed" />
    </el-aside>

    <el-container direction="vertical">
      <el-header>
        <Navbar @toggle-sidebar="collapsed = !collapsed" />
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-app {
  height: 100%;
}

.el-aside {
  height: 100%;
  transition: width 0.2s ease;
}

.el-main {
  padding: 20px;
}
</style>
