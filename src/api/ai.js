import request from './request.js'

export const getConversations = (params = {}) =>
  request.get('/ai/conversations', { params: { page: 1, pageSize: 20, ...params } })

export const getConversation = (id) => request.get(`/ai/conversations/${id}`)

export const getMessages = (id, params = {}) =>
  request.get(`/ai/conversations/${id}/messages`, {
    params: { page: 1, pageSize: 30, ...params }
  })

export const takeOver = (id) => request.post(`/ai/conversations/${id}/take-over`)

export const reply = (id, content) =>
  request.post(`/ai/conversations/${id}/reply`, { content })

export const closeConversation = (id) =>
  request.post(`/ai/conversations/${id}/close`)

export const getAiStats = () => request.get('/ai/stats')

export const getKnowledge = (params = {}) =>
  request.get('/ai/knowledge', { params: { page: 1, pageSize: 20, ...params } })

export const createKnowledge = (data) => request.post('/ai/knowledge', data)

export const parseKnowledge = (id) => request.post(`/ai/knowledge/${id}/parse`)

export const updateKnowledge = (id, data) =>
  request.put(`/ai/knowledge/${id}`, data)

export const deleteKnowledge = (id) => request.delete(`/ai/knowledge/${id}`)

export const getChunks = (id) => request.get(`/ai/knowledge/${id}/chunks`)

export const uploadKnowledgeFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await request.post('/ai/knowledge/upload', formData, {
    timeout: 30000
  })
  const result = response.data
  const url = typeof result === 'string' ? result : result?.fileUrl || result?.url
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('文件上传接口未返回有效文件地址')
  }
  return url
}

export const getAiSettings = () => request.get('/ai/settings')

export const updateAiSettings = (data) =>
  request.put('/ai/settings', data)

export const testAi = (question, topK) =>
  request.post('/ai/test', { question, topK }, { timeout: 90000 })
