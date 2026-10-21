import { defineStore } from 'pinia'

const storedToken = localStorage.getItem('admin_token')
const token = import.meta.env.VITE_DEMO_MODE !== 'true' && storedToken === 'mock-admin-token'
  ? ''
  : storedToken || ''

if (storedToken && !token) {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token,
    user: JSON.parse(localStorage.getItem('admin_user') || 'null') || { username: 'admin' }
  }),
  actions: {
    setAuth(payload) {
      this.token = payload.token
      this.user = payload.user
      localStorage.setItem('admin_token', payload.token)
      localStorage.setItem('admin_user', JSON.stringify(payload.user))
    },
    clearAuth() {
      this.token = ''
      this.user = { username: 'admin' }
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
    }
  }
})
