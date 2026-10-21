import request from './request.js'
import { isMockMode, paginate } from './mockStorage.js'

const orderList = [
  { id: 'NO2024110001', user: '清风', type: 'VIP订阅', amount: 22.0, status: '已支付', paidAt: '2024-11-18 14:20:10' },
  { id: 'NO2024110002', user: '小夏', type: '单章购买', amount: 5.0, status: '待支付', paidAt: '2024-11-18 15:05:00' },
  { id: 'NO2024110003', user: '墨年', type: '会员充值', amount: 99.0, status: '已支付', paidAt: '2024-11-17 08:30:22' },
  { id: 'NO2024110004', user: '流年', type: '单章购买', amount: 5.0, status: '已退款', paidAt: '2024-11-16 09:15:00' }
]

export const getOrders = async (params = {}) => {
  if (!isMockMode) {
    const [response, userResponse] = await Promise.all([
      request.get('/orders'),
      request.get('/users')
    ])
    const userNames = new Map(userResponse.data.map((user) => [String(user.id), user.nickname]))
    const keyword = (params.keyword || '').trim().toLowerCase()
    const status = params.status || '全部'
    const orders = response.data.map((order) => ({
      id: order.orderNo,
      user: userNames.get(String(order.userId)) || `用户 ${order.userId}`,
      type: Number(order.type) === 1 ? '单章购买' : `类型 ${order.type}`,
      amount: Number(order.amount) || 0,
      status: ({ 0: '待支付', 1: '已支付', 2: '已退款' })[Number(order.status)] || `未知状态 (${order.status})`,
      paidAt: order.paidAt ? String(order.paidAt).replace('T', ' ').slice(0, 19) : ''
    }))
    const filtered = orders.filter((order) => (
      (!keyword || order.id.toLowerCase().includes(keyword)) &&
      (status === '全部' || order.status === status)
    ))
    return { ...response, data: paginate(filtered, params.page, params.pageSize) }
  }

  const keyword = (params.keyword || '').trim().toLowerCase()
  const status = params.status || '全部'
  const filtered = orderList.filter((item) => {
    const matchesKeyword = !keyword || item.id.toLowerCase().includes(keyword)
    const matchesStatus = status === '全部' || item.status === status
    return matchesKeyword && matchesStatus
  })

  return {
    code: 0,
    message: 'success',
    data: paginate(filtered, params.page, params.pageSize)
  }
}
