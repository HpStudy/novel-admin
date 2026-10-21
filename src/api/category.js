import request from './request.js'
import { isMockMode, readMockList, writeMockList } from './mockStorage.js'

const storageKey = 'novel_admin_categories'
const categoryList = [
  { id: 1, name: '都市', icon: '🏙️', sort: 1, status: '启用' },
  { id: 2, name: '修真', icon: '🧙', sort: 2, status: '启用' },
  { id: 3, name: '武侠', icon: '⚔️', sort: 3, status: '启用' },
  { id: 4, name: '历史', icon: '🏛️', sort: 4, status: '禁用' }
]

const toCategoryViewModel = (category) => ({
  ...category,
  status: Number(category.status) === 1 ? '启用' : '禁用'
})

const toCategoryPayload = ({ name, icon, sort, status }) => ({
  name,
  icon,
  sort: Number(sort),
  status: status === '启用' ? 1 : 0
})

export const getCategories = async () => {
  if (!isMockMode) {
    const response = await request.get('/categories')
    return {
      ...response,
      data: Array.isArray(response.data) ? response.data.map(toCategoryViewModel) : []
    }
  }
  return {
    code: 0,
    message: 'success',
    data: readMockList(storageKey, categoryList).sort((a, b) => a.sort - b.sort)
  }
}

export const saveCategory = async (payload) => {
  if (!isMockMode) {
    const apiPayload = toCategoryPayload(payload)
    return payload.id
      ? request.put(`/categories/${payload.id}`, apiPayload)
      : request.post('/categories', apiPayload)
  }

  const categories = readMockList(storageKey, categoryList)
  if (payload.id) {
    const index = categories.findIndex((item) => item.id === Number(payload.id))
    if (index < 0) throw new Error('分类不存在或已被删除')
    categories[index] = { ...categories[index], ...payload, sort: Number(payload.sort) || 1 }
    writeMockList(storageKey, categories)
    return { code: 0, message: '编辑成功', data: categories[index] }
  }

  const item = { ...payload, id: Date.now(), sort: Number(payload.sort) || 1 }
  categories.push(item)
  writeMockList(storageKey, categories)
  return { code: 0, message: '新增成功', data: item }
}

export const deleteCategory = async (id) => {
  if (!isMockMode) return request.delete(`/categories/${id}`)

  const categories = readMockList(storageKey, categoryList)
  const nextCategories = categories.filter((item) => item.id !== Number(id))
  if (nextCategories.length === categories.length) throw new Error('分类不存在或已被删除')
  writeMockList(storageKey, nextCategories)
  return { code: 0, message: '删除成功', data: { id } }
}
