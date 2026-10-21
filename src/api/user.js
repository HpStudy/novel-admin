import request from './request.js'
import { isMockMode, paginate, readMockList, writeMockList } from './mockStorage.js'

const storageKey = 'novel_admin_users'
const userList = [
  { id: 1, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', nickname: '清风', phone: '13800000001', vipLevel: 5, balance: 128.5, createdAt: '2024-01-10', status: '正常' },
  { id: 2, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', nickname: '流年', phone: '13800000002', vipLevel: 2, balance: 58.0, createdAt: '2024-03-12', status: '已禁用' },
  { id: 3, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80', nickname: '小夏', phone: '13800000003', vipLevel: 4, balance: 96.8, createdAt: '2024-05-29', status: '正常' },
  { id: 4, avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', nickname: '墨年', phone: '13800000004', vipLevel: 1, balance: 24.6, createdAt: '2024-07-22', status: '正常' }
]

export const getUsers = async (params = {}) => {
  if (!isMockMode) {
    const response = await request.get('/users')
    const keyword = (params.keyword || '').trim().toLowerCase()
    const users = response.data.map((user) => ({
      id: user.id,
      avatar: user.avatarUrl || '',
      nickname: user.nickname,
      phone: user.phone || '',
      vipLevel: Number(user.vipLevel) || 0,
      balance: Number(user.balance) || 0,
      createdAt: user.createdAt ? String(user.createdAt).slice(0, 10) : '',
      status: Number(user.status) === 1 ? '正常' : '已禁用'
    }))
    const filtered = users.filter((user) => (
      !keyword || user.nickname.toLowerCase().includes(keyword) || user.phone.includes(keyword)
    ))
    return { ...response, data: paginate(filtered, params.page, params.pageSize) }
  }

  const keyword = (params.keyword || '').trim().toLowerCase()
  const filtered = readMockList(storageKey, userList).filter((user) => {
    const matches = !keyword || user.nickname.toLowerCase().includes(keyword) || user.phone.includes(keyword)
    return matches
  })

  return {
    code: 0,
    message: 'success',
    data: paginate(filtered, params.page, params.pageSize)
  }
}

export const toggleUserStatus = async (id) => {
  if (!isMockMode) return request.patch(`/users/${id}/status`)

  const users = readMockList(storageKey, userList)
  const user = users.find((item) => item.id === Number(id))
  if (!user) throw new Error('用户不存在')
  user.status = user.status === '正常' ? '已禁用' : '正常'
  writeMockList(storageKey, users)
  return { code: 0, message: '状态已切换', data: user }
}

export const updateUserVip = async (id, vipLevel) => {
  if (!isMockMode) return request.patch(`/users/${id}/vip`, { vipLevel })

  const users = readMockList(storageKey, userList)
  const user = users.find((item) => item.id === Number(id))
  if (!user) throw new Error('用户不存在')
  const level = Number(vipLevel)
  if (!Number.isInteger(level) || level < 0 || level > 5) throw new Error('VIP等级必须为0到5')
  user.vipLevel = level
  writeMockList(storageKey, users)
  return { code: 0, message: 'VIP等级已更新', data: user }
}
