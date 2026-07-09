import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { title: 'Pedidos' },
      },
      {
        path: 'products',
        name: 'products',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { title: 'Produtos' },
      },
      {
        path: 'inventory',
        name: 'inventory',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { title: 'Estoque' },
      },
      {
        path: 'financial',
        name: 'financial',
        component: () => import('@/views/FinancialView.vue'),
        meta: { title: 'Financeiro' },
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { title: 'Auditoria' },
      },
      {
        path: 'integrations',
        name: 'integrations',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { title: 'Integrações' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { title: 'Configurações' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
