import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/tv/:token',
    name: 'tv-dashboard',
    component: () => import('@/views/Dashboard/TvDashboard.vue'),
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
        component: () => import('@/views/Dashboard/Dashboard.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'pedidos',
        name: 'orders',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { title: 'Pedidos' },
      },
      {
        path: 'produtos',
        name: 'products',
        component: () => import('@/views/Products/Products.vue'),
        meta: { title: 'Produtos' },
      },
      {
        path: 'produtos/:id',
        name: 'product-edit',
        component: () => import('@/views/Products/ProductEdit.vue'),
        meta: { title: 'Produto' },
      },
      {
        path: 'estoque',
        name: 'inventory',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { title: 'Estoque', requiresAdmin: true },
      },
      {
        path: 'financeiro',
        name: 'financial',
        component: () => import('@/views/FinancialView.vue'),
        meta: { title: 'Financeiro' },
      },
      {
        path: 'audit',
        name: 'audit',
        component: () => import('@/views/Audit/Audit.vue'),
        meta: { title: 'Auditoria' },
      },
      {
        path: 'integracoes',
        name: 'integrations',
        component: () => import('@/views/Integrations/Integrations.vue'),
        meta: { title: 'Integrações', requiresAdmin: true },
      },
      {
        path: 'configuracoes',
        name: 'settings',
        component: () => import('@/views/Settings/Settings.vue'),
        meta: { title: 'Configurações' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Refreshes the cached role from the server once per page load (not on
// every navigation) — covers the case where localStorage has a stale role
// from a previous session.
let meRefreshed = false

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (auth.isAuthenticated && !meRefreshed) {
    meRefreshed = true
    try {
      await auth.fetchMe()
    } catch {
      // Stale cached role is a better failure mode than blocking navigation.
    }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    useToast().error('Acesso restrito a administradores.')
    return { name: 'dashboard' }
  }

  return true
})

export default router
