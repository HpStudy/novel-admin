<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { closeConversation, getConversations, takeOver } from '../../../api/ai.js'
import { useAiStatsStore } from '../../../store/ai.js'

const router = useRouter()
const aiStats = useAiStatsStore()
const loading = ref(false)
const statsLoading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const dateRange = ref([])
const stats = reactive({
  pendingTransfer: 0,
  todayConversations: 0,
  takenOver: 0,
  aiResolutionRate: 0
})
const filters = reactive({ status: '', keyword: '' })
const busyIds = ref(new Set())
let refreshTimer

const statusOptions = [
  { value: 0, label: '进行中' },
  { value: 1, label: '待转人工' },
  { value: 2, label: '人工已接管' },
  { value: 3, label: '已结束' }
]

const asStatus = (value) => {
  const status = Number(value)
  return Number.isInteger(status) ? status : -1
}

const statusLabel = (value) => statusOptions.find((option) => option.value === asStatus(value))?.label || '未知'
const statusTagLabel = (value) => (asStatus(value) === 2 ? '已接管' : statusLabel(value))
const statusType = (value) => ({ 0: 'primary', 1: 'warning', 2: 'success', 3: 'info' })[asStatus(value)] || 'info'
const sourceLabel = (value) =>
  ({ home: '首页', book: '书籍详情', chapter: '章节页', user: '个人中心' })[value] || value || '-'
const formatTime = (value) => value ? new Date(value).toLocaleString() : '-'
const formatDateParam = (value) => {
  if (!value) return undefined
  const date = new Date(value)
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
const resolutionRate = computed(() => {
  const rate = Number(stats.aiResolutionRate) || 0
  return `${Math.round((rate <= 1 ? rate : rate / 100) * 100)}%`
})
const userLabel = (row) =>
  row.user?.nickname || row.nickname || row.userNickname || row.user_nickname || `用户 ${row.userId || row.user?.id || '-'}`
const displayRows = computed(() => [...rows.value].sort((a, b) => {
  const pendingA = asStatus(a.status) === 1 ? 0 : 1
  const pendingB = asStatus(b.status) === 1 ? 0 : 1
  if (pendingA !== pendingB) return pendingA - pendingB
  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
}))

const loadStats = async () => {
  statsLoading.value = true
  try {
    const data = await aiStats.refresh()
    Object.assign(stats, data)
  } catch (error) {
    ElMessage.error(error.message || 'AI 会话统计加载失败')
  } finally {
    statsLoading.value = false
  }
}

const loadRows = async () => {
  loading.value = true
  try {
    const response = await getConversations({
      page: page.value,
      pageSize: pageSize.value,
      status: filters.status === '' ? undefined : filters.status,
      keyword: filters.keyword.trim() || undefined,
      startTime: formatDateParam(dateRange.value?.[0]),
      endTime: formatDateParam(dateRange.value?.[1])
    })
    rows.value = response.data?.list || []
    total.value = Number(response.data?.total) || 0
  } catch (error) {
    ElMessage.error(error.message || '会话列表加载失败')
  } finally {
    loading.value = false
  }
}

const search = () => {
  page.value = 1
  loadRows()
}

const reset = () => {
  filters.status = ''
  filters.keyword = ''
  dateRange.value = []
  page.value = 1
  loadRows()
}

const confirmAction = async (row, action) => {
  const takeover = action === 'take-over'
  try {
    await ElMessageBox.confirm(
      takeover ? '接管后，AI 将停止回复该会话，确认接管？' : '结束后该会话将不可继续回复，确认结束？',
      takeover ? '接管会话' : '结束会话',
      { type: 'warning', confirmButtonText: takeover ? '确认接管' : '确认结束', cancelButtonText: '取消' }
    )
    busyIds.value = new Set(busyIds.value).add(row.id)
    if (takeover) await takeOver(row.id)
    else await closeConversation(row.id)
    ElMessage.success(takeover ? '会话已接管' : '会话已结束')
    await Promise.all([loadRows(), loadStats()])
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || (takeover ? '接管会话失败' : '结束会话失败'))
    }
  } finally {
    const next = new Set(busyIds.value)
    next.delete(row.id)
    busyIds.value = next
  }
}

const rowClassName = ({ row }) => asStatus(row.status) === 1 ? 'pending-transfer-row' : ''

onMounted(() => {
  loadRows()
  loadStats()
  refreshTimer = window.setInterval(() => {
    loadRows()
    loadStats()
  }, 30000)
})

onBeforeUnmount(() => window.clearInterval(refreshTimer))
</script>

<template>
  <div class="ai-conversation-page">
    <div class="page-header">
      <h2>AI 会话管理</h2>
      <el-button :loading="loading || statsLoading" @click="search">刷新</el-button>
    </div>

    <div class="stats-grid" v-loading="statsLoading">
      <el-card shadow="never">
        <div class="stat-label">待转人工</div>
        <div class="stat-value warning">{{ stats.pendingTransfer ?? 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="stat-label">今日会话</div>
        <div class="stat-value">{{ stats.todayConversations ?? 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="stat-label">已接管</div>
        <div class="stat-value">{{ stats.takenOver ?? 0 }}</div>
      </el-card>
      <el-card shadow="never">
        <div class="stat-label">AI 解决率</div>
        <div class="stat-value">{{ resolutionRate }}</div>
      </el-card>
    </div>

    <el-card>
      <div class="filter-bar">
        <el-select v-model="filters.status" clearable placeholder="全部状态" class="status-filter">
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
        <el-input
          v-model="filters.keyword"
          clearable
          placeholder="搜索会话编号或用户昵称"
          class="keyword-filter"
          @keyup.enter="search"
        />
        <el-button type="primary" @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <el-table :data="displayRows" v-loading="loading" stripe :row-class-name="rowClassName">
        <el-table-column prop="sessionNo" label="会话编号" min-width="170">
          <template #default="{ row }">{{ row.sessionNo || `#${row.id}` }}</template>
        </el-table-column>
        <el-table-column label="用户" min-width="140">
          <template #default="{ row }">{{ userLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="来源" width="110">
          <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="light">{{ statusTagLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="消息数" width="90">
          <template #default="{ row }">{{ row.messageCount ?? row.messagesCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="最后消息时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.lastMessageAt) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="router.push(`/ai/conversations/${row.id}`)">详情</el-button>
            <el-button
              v-if="asStatus(row.status) === 1"
              link
              type="success"
              :loading="busyIds.has(row.id)"
              @click="confirmAction(row, 'take-over')"
            >接管</el-button>
            <el-button
              v-if="asStatus(row.status) !== 3"
              link
              type="danger"
              :loading="busyIds.has(row.id)"
              @click="confirmAction(row, 'close')"
            >结束</el-button>
            <el-button v-else link disabled>已结束</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无会话记录" />
        </template>
      </el-table>

      <div class="pagination-box">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="search"
          @current-change="loadRows"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.stat-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-value.warning {
  color: #e6a23c;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.status-filter {
  width: 150px;
}

.keyword-filter {
  width: 260px;
}

.pagination-box {
  display: flex;
  justify-content: flex-end;
  padding-top: 18px;
}

:deep(.pending-transfer-row td) {
  background: #fdf6ec !important;
}

@media (max-width: 1000px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
