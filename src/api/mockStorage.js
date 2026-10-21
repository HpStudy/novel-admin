export const isMockMode =
  (import.meta.env && import.meta.env.VITE_DEMO_MODE === 'true') || typeof window === 'undefined'

export const readMockList = (key, initialData) => {
  const stored = localStorage.getItem(key)
  if (stored === null) return initialData.map((item) => ({ ...item }))

  const parsed = JSON.parse(stored)
  if (!Array.isArray(parsed)) {
    throw new Error(`本地演示数据格式错误：${key}`)
  }
  return parsed
}

export const writeMockList = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data))
}

export const paginate = (items, page = 1, pageSize = 10) => {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || 10)
  const start = (safePage - 1) * safePageSize
  return {
    list: items.slice(start, start + safePageSize),
    total: items.length
  }
}
