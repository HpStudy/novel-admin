<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, toggleUserStatus, updateUserVip } from '../../api/user'

const keyword = ref('')
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getUsers({ keyword: keyword.value, page: page.value, pageSize: pageSize.value })
    tableData.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '用户数据加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchData()
}

const handleToggle = async (row) => {
  try {
    await toggleUserStatus(row.id)
    ElMessage.success('状态已切换')
    await fetchData()
  } catch (error) {
    ElMessage.error(error.message || '状态更新失败')
  }
}

const handleVip = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入 VIP 等级（0-5）', '调整 VIP 等级', {
      inputValue: String(row.vipLevel),
      inputPattern: /^[0-5]$/,
      inputErrorMessage: 'VIP等级必须为0到5的整数'
    })
    const nextLevel = Number(value)
    await updateUserVip(row.id, nextLevel)
    ElMessage.success(`VIP等级已更新为 ${nextLevel}`)
    await fetchData()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message || 'VIP等级更新失败')
  }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="left">
        <el-input v-model="keyword" placeholder="按昵称/手机号搜索" clearable style="width: 260px" @keyup.enter="handleSearch" />
      </div>
      <div class="right"></div>
    </div>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column label="头像" width="80">
          <template #default="scope">
            <img :src="scope.row.avatar" class="avatar" />
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" min-width="120" />
        <el-table-column prop="phone" label="手机号" min-width="160" />
        <el-table-column prop="vipLevel" label="VIP等级" min-width="120" />
        <el-table-column prop="balance" label="余额" min-width="100" />
        <el-table-column prop="createdAt" label="注册时间" min-width="150" />
        <el-table-column label="状态" min-width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === '正常' ? 'success' : 'info'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="180">
          <template #default="scope">
            <el-button type="primary" link @click="handleToggle(scope.row)">{{ scope.row.status === '正常' ? '禁用' : '启用' }}</el-button>
            <el-button type="warning" link @click="handleVip(scope.row)">调整VIP</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-box">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, prev, pager, next, sizes"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>
