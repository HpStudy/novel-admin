import axios from 'axios'

const service = axios.create({
  baseURL: '/api/admin',
  timeout: 15000
})

service.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

service.interceptors.response.use(
  (response) => {
    const body = response.data || {}
    if (body.code !== undefined && body.code !== 0) {
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return body
  },
  (error) => {
    const message = error?.response?.data?.message || error.message || '请求失败'
    if (error?.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(new Error(message))
  }
)

export default service
