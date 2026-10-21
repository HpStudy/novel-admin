import request from './request.js'
import { isMockMode, paginate, readMockList, writeMockList } from './mockStorage.js'

const storageKey = 'novel_admin_comments'
const commentList = [
  { id: 1, user: '清风', book: '修仙狂龙', content: '剧情很爽，期待后续更新。', likes: 235, createdAt: '2024-11-18 18:20:00', status: '显示' },
  { id: 2, user: '小夏', book: '都市最强医圣', content: '主角很强，打斗场面很刺激。', likes: 189, createdAt: '2024-11-17 10:50:00', status: '隐藏' },
  { id: 3, user: '墨年', book: '星辰猎人', content: '世界观不错，想看更多星际设定。', likes: 312, createdAt: '2024-11-16 08:10:00', status: '显示' }
]

export const getComments = async (params = {}) => {
  if (!isMockMode) {
    const response = await request.get('/comments')
    const comments = response.data.map((comment) => ({
      ...comment,
      status: Number(comment.status) === 1 ? '显示' : '隐藏',
      createdAt: comment.createdAt ? String(comment.createdAt).replace('T', ' ').slice(0, 19) : ''
    }))
    return { ...response, data: paginate(comments, params.page, params.pageSize) }
  }

  const comments = readMockList(storageKey, commentList).sort((a, b) => b.id - a.id)
  return { code: 0, message: 'success', data: paginate(comments, params.page, params.pageSize) }
}

export const toggleCommentStatus = async (id) => {
  if (!isMockMode) return request.patch(`/comments/${id}/status`)

  const comments = readMockList(storageKey, commentList)
  const comment = comments.find((item) => item.id === Number(id))
  if (!comment) throw new Error('评论不存在')
  comment.status = comment.status === '显示' ? '隐藏' : '显示'
  writeMockList(storageKey, comments)
  return { code: 0, message: '状态已切换', data: comment }
}
