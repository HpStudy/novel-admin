<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getComments, toggleCommentStatus } from '../../api/comment'

const tableData = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getComments({ page: page.value, pageSize: pageSize.value })
    tableData.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '评论数据加载失败')
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (row) => {
  try {
    await toggleCommentStatus(row.id)
    ElMessage.success('状态已切换')
    await fetchData()
  } catch (error) {
    ElMessage.error(error.message || '状态更新失败')
  }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="user" label="用户" width="120" />
        <el-table-column prop="book" label="书籍" width="180" />
        <el-table-column prop="content" label="评论内容" />
        <el-table-column prop="likes" label="点赞数" width="100" />
        <el-table-column prop="createdAt" label="时间" width="180" />
        <el-table-column label="操作" width="140">
          <template #default="scope">
            <el-button type="primary" link @click="toggleStatus(scope.row)">
              {{ scope.row.status === '显示' ? '隐藏' : '显示' }}
            </el-button>
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

<style scoped>
.pagination-box {
  display: flex;
  justify-content: flex-end;
  padding-top: 18px;
}
</style>
