<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getOrders } from '../../api/order'

const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const status = ref('全部')
const statusOptions = ['全部', '已支付', '待支付', '已退款']
const loading = ref(false)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getOrders({ keyword: keyword.value, status: status.value, page: page.value, pageSize: pageSize.value })
    tableData.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '订单数据加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="left">
        <el-input v-model="keyword" placeholder="按订单号搜索" clearable style="width: 220px" @keyup.enter="handleSearch" />
        <el-select v-model="status" placeholder="状态筛选" style="width: 140px" @change="handleSearch">
          <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </div>
      <div class="right"></div>
    </div>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="id" label="订单号" min-width="180" />
        <el-table-column prop="user" label="用户" min-width="110" />
        <el-table-column prop="type" label="类型" min-width="120" />
        <el-table-column prop="amount" label="金额" min-width="100" />
        <el-table-column label="状态" min-width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === '已支付' ? 'success' : scope.row.status === '待支付' ? 'warning' : 'info'">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="paidAt" label="支付时间" min-width="180" />
      </el-table>

      <div class="pagination-box">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          :total="total"
          layout="total, prev, pager, next, sizes"
          :page-sizes="[10, 20, 50]"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>
