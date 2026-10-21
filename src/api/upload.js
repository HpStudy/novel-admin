import request from './request.js'
import { isMockMode } from './mockStorage.js'

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') resolve(reader.result)
    else reject(new Error('图片读取失败'))
  }
  reader.onerror = () => reject(new Error('图片读取失败'))
  reader.readAsDataURL(file)
})

export const uploadImage = async (file) => {
  if (isMockMode) return readAsDataUrl(file)

  const formData = new FormData()
  formData.append('file', file)
  const response = await request.post('/upload', formData)
  const result = response.data
  const url = typeof result === 'string' ? result : result?.url || result?.imageUrl
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('图片上传接口未返回有效图片地址')
  }
  return url
}
