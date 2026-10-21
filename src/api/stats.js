import request from './request.js'
import { isMockMode } from './mockStorage.js'

const dashboardStats = {
  totalBooks: 1286,
  totalUsers: 23451,
  todayOrders: 390,
  todayRevenue: 24680,
  orderTrend: [120, 210, 180, 280, 260, 340, 390],
  categoryRatio: [
    { name: '都市', value: 35 },
    { name: '修真', value: 22 },
    { name: '玄幻', value: 18 },
    { name: '历史', value: 14 },
    { name: '校园', value: 11 }
  ]
}

export const getDashboardStats = async () => {
  if (!isMockMode) {
    return request.get('/stats')
  }

  return Promise.resolve({
    code: 0,
    message: 'success',
    data: dashboardStats
  })
}
