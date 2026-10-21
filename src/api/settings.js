import request from './request.js'
import { isMockMode } from './mockStorage.js'

const storageKey = 'novel_admin_settings'
const defaultSettings = {
  siteName: '小说阅读平台',
  contact: '400-888-8888',
  email: 'admin@novel.com',
  version: 'v1.0.0'
}

export const getSettings = async () => {
  if (!isMockMode) return request.get('/settings')

  const stored = localStorage.getItem(storageKey)
  return {
    code: 0,
    message: 'success',
    data: stored ? { ...defaultSettings, ...JSON.parse(stored) } : { ...defaultSettings }
  }
}

export const saveSettings = async (settings) => {
  if (!isMockMode) return request.put('/settings', settings)

  localStorage.setItem(storageKey, JSON.stringify(settings))
  return { code: 0, message: 'success', data: settings }
}
