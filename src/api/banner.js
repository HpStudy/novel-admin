import request from './request.js'
import { isMockMode, paginate, readMockList, writeMockList } from './mockStorage.js'

const storageKey = 'novel_admin_banners'
const bannerList = [
  { id: 1, title: '新用户大礼', image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=800&q=80', sort: 1, status: '已上线', href: 'https://example.com/1', startTime: '2024-11-01', endTime: '2024-11-30' },
  { id: 2, title: '热血榜单', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80', sort: 2, status: '已上线', href: 'https://example.com/2', startTime: '2024-11-10', endTime: '2024-12-10' },
  { id: 3, title: '作者招募', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80', sort: 3, status: '待上线', href: 'https://example.com/3', startTime: '2024-12-01', endTime: '2024-12-31' }
]

const toBannerViewModel = (banner) => ({
  id: banner.id,
  title: banner.title,
  image: banner.imageUrl || '',
  sort: banner.sort,
  status: Number(banner.status) === 1 ? '已上线' : '待上线',
  href: banner.linkTarget || '',
  startTime: banner.startAt ? String(banner.startAt).slice(0, 10) : '',
  endTime: banner.endAt ? String(banner.endAt).slice(0, 10) : ''
})

const toBannerPayload = ({ title, image, sort, status, href, startTime, endTime }) => ({
  title,
  imageUrl: image,
  linkType: 1,
  linkTarget: href,
  sort: Number(sort),
  status: status === '已上线' ? 1 : 0,
  startAt: startTime || null,
  endAt: endTime || null
})

export const getBanners = async (params = {}) => {
  if (!isMockMode) {
    const response = await request.get('/banners', { params })
    const banners = Array.isArray(response.data) ? response.data.map(toBannerViewModel) : []
    return { ...response, data: { list: banners, total: banners.length } }
  }

  const banners = readMockList(storageKey, bannerList).sort((a, b) => a.sort - b.sort)
  return { code: 0, message: 'success', data: paginate(banners, params.page, params.pageSize) }
}

export const saveBanner = async (payload) => {
  if (!isMockMode) {
    const apiPayload = toBannerPayload(payload)
    return payload.id
      ? request.put(`/banners/${payload.id}`, apiPayload)
      : request.post('/banners', apiPayload)
  }

  const banners = readMockList(storageKey, bannerList)
  if (payload.id) {
    const index = banners.findIndex((item) => item.id === Number(payload.id))
    if (index < 0) throw new Error('Banner不存在或已被删除')
    banners[index] = { ...banners[index], ...payload, sort: Number(payload.sort) || 1 }
    writeMockList(storageKey, banners)
    return { code: 0, message: '编辑成功', data: banners[index] }
  }

  const banner = { ...payload, id: Date.now(), sort: Number(payload.sort) || 1 }
  banners.push(banner)
  writeMockList(storageKey, banners)
  return { code: 0, message: '新增成功', data: banner }
}

export const deleteBanner = async (id) => {
  if (!isMockMode) return request.delete(`/banners/${id}`)

  const banners = readMockList(storageKey, bannerList)
  const nextBanners = banners.filter((item) => item.id !== Number(id))
  if (nextBanners.length === banners.length) throw new Error('Banner不存在或已被删除')
  writeMockList(storageKey, nextBanners)
  return { code: 0, message: '删除成功', data: { id } }
}
