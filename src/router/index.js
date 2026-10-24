import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const Layout = () => import('../layout/index.vue')
const Login = () => import('../views/login/index.vue')

const routes = [
  { path: '/login', name: 'login', component: Login },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      { path: '/dashboard', name: 'dashboard', component: () => import('../views/dashboard/index.vue'), meta: { title: '数据看板' } },
      { path: '/book/list', name: 'book-list', component: () => import('../views/book/list.vue'), meta: { title: '书籍管理' } },
      { path: '/book/edit', name: 'book-edit', component: () => import('../views/book/edit.vue'), meta: { title: '书籍编辑' } },
      { path: '/chapter/list', name: 'chapter-list', component: () => import('../views/chapter/list.vue'), meta: { title: '章节管理' } },
      { path: '/chapter/upload', name: 'chapter-upload', component: () => import('../views/chapter/upload.vue'), meta: { title: '批量上传章节' } },
      { path: '/category', name: 'category', component: () => import('../views/category/index.vue'), meta: { title: '分类管理' } },
      { path: '/user', name: 'user', component: () => import('../views/user/index.vue'), meta: { title: '用户管理' } },
      { path: '/order', name: 'order', component: () => import('../views/order/index.vue'), meta: { title: '订单管理' } },
      { path: '/banner', name: 'banner', component: () => import('../views/banner/index.vue'), meta: { title: 'Banner管理' } },
      { path: '/comment', name: 'comment', component: () => import('../views/comment/index.vue'), meta: { title: '评论管理' } },
      { path: '/setting', name: 'setting', component: () => import('../views/setting/index.vue'), meta: { title: '系统设置' } },
      { path: '/ai/conversations', name: 'ai-conversations', component: () => import('../views/ai/conversation/list.vue'), meta: { title: '会话管理' } },
      { path: '/ai/conversations/:id', name: 'ai-conversation-detail', component: () => import('../views/ai/conversation/detail.vue'), meta: { title: '会话详情' } },
      { path: '/ai/knowledge', name: 'ai-knowledge', component: () => import('../views/ai/knowledge/list.vue'), meta: { title: '知识库管理' } },
      { path: '/ai/setting', name: 'ai-setting', component: () => import('../views/ai/setting.vue'), meta: { title: 'AI 设置' } }
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  const isLoginRoute = to.path === '/login'

  if (!auth.token && !isLoginRoute) {
    next('/login')
    return
  }

  if (auth.token && isLoginRoute) {
    next('/dashboard')
    return
  }

  next()
})

export default router
