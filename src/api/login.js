import request from './request'

export const login = async ({ username, password }) => {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') {
    const response = await request.post('/login', { phone: username, password })
    const token = response.data?.accessToken
    if (!token) throw new Error('登录响应缺少 accessToken')

    return {
      ...response,
      data: {
        token,
        user: response.data.user || { username }
      }
    }
  }

  if (username !== 'admin' || password !== 'admin123') throw new Error('管理员账号为 admin，密码为 admin123')

  return {
    code: 0,
    message: 'success',
    data: {
      token: 'mock-admin-token',
      user: {
        username,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
        nickname: username
      }
    }
  }
}
