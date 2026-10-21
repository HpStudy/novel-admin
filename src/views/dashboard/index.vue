<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { getDashboardStats } from '../../api/stats'

const stats = ref({
  totalBooks: 0,
  totalUsers: 0,
  todayOrders: 0,
  todayRevenue: 0
})
const orderTrend = ref([])
const categoryRatio = ref([])
const lineChart = ref(null)
const pieChart = ref(null)
let lineChartInstance
let pieChartInstance

const initCharts = () => {
  if (lineChart.value) {
    lineChartInstance?.dispose()
    lineChartInstance = echarts.init(lineChart.value)
    lineChartInstance.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
      yAxis: { type: 'value' },
      series: [{
        data: orderTrend.value,
        type: 'line',
        smooth: true,
        areaStyle: {},
        itemStyle: { color: '#409eff' },
        lineStyle: { width: 3 }
      }]
    })
  }

  if (pieChart.value) {
    pieChartInstance?.dispose()
    pieChartInstance = echarts.init(pieChart.value)
    pieChartInstance.setOption({
      tooltip: { trigger: 'item' },
      legend: { orient: 'vertical', left: 'left' },
      series: [{
        type: 'pie',
        radius: '70%',
        data: categoryRatio.value.map((item) => ({ name: item.name, value: item.value })),
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.2)' } }
      }]
    })
  }
}

const load = async () => {
  try {
    const res = await getDashboardStats()
    if (res.code === 0) {
      stats.value = res.data
      orderTrend.value = res.data.orderTrend || []
      categoryRatio.value = res.data.categoryRatio || []
      await nextTick()
      initCharts()
    }
  } catch (error) {
    ElMessage.error(error.message || '看板数据加载失败')
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <div>
    <div class="stats-grid">
      <el-card v-for="item in [
        { label: '总书籍数', value: stats.totalBooks, icon: 'Reading', color: '#409eff' },
        { label: '总用户数', value: stats.totalUsers, icon: 'User', color: '#67c23a' },
        { label: '今日订单数', value: stats.todayOrders, icon: 'ShoppingCart', color: '#f56c6c' },
        { label: '今日营收', value: `¥${stats.todayRevenue}`, icon: 'Coin', color: '#e6a23c' }
      ]" :key="item.label" class="stat-card">
        <div class="stat-body">
          <div>
            <div class="stat-label">{{ item.label }}</div>
            <div class="stat-value">{{ item.value }}</div>
          </div>
          <div class="stat-icon" :style="{ background: item.color }">
            <el-icon><component :is="item.icon" /></el-icon>
          </div>
        </div>
      </el-card>
    </div>

    <div class="chart-grid">
      <el-card header="近7天订单趋势" class="chart-card">
        <div v-if="orderTrend.length" ref="lineChart" class="chart-box"></div>
        <el-empty v-else description="暂无订单趋势数据" :image-size="80" />
      </el-card>

      <el-card header="分类书籍分布" class="chart-card">
        <div v-if="categoryRatio.length" ref="pieChart" class="chart-box"></div>
        <el-empty v-else description="暂无分类分布数据" :image-size="80" />
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 14px;
}

.stat-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.stat-value {
  margin-top: 8px;
  font-size: 32px;
  font-weight: 700;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 20px;
}

.chart-card {
  min-height: 360px;
}

.chart-box {
  width: 100%;
  height: 280px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
