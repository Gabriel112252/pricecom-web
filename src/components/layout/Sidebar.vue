<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSidebar } from '@/composables/useSidebar'
import SidebarItem from './SidebarItem.vue'
import SidebarSubmenu from './SidebarSubmenu.vue'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Banknote,
  ShieldCheck,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  X,
} from '@lucide/vue'

const auth = useAuthStore()
const router = useRouter()
const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar()

// Produtos/Estoque promovidos pro nível superior — são operacionais
// (consultados no dia a dia), diferente de Integrações/Geral em
// Configurações, que são tela de setup. O cadastro da regra de alerta de
// estoque (StockAlertRule) continua em Configurações — configurar o
// gatilho é uma tarefa diferente de olhar o saldo atual.
const MAIN_ITEMS = [
  { label: 'Dashboard', to: { name: 'dashboard' }, icon: LayoutDashboard },
  { label: 'Pedidos', to: { name: 'orders' }, icon: ShoppingCart },
  { label: 'Produtos', to: { name: 'products' }, icon: Package },
  { label: 'Estoque', to: { name: 'inventory' }, icon: Boxes },
  { label: 'Financeiro', to: { name: 'financial' }, icon: Banknote },
  { label: 'Auditoria', to: { name: 'audit' }, icon: ShieldCheck },
]

// `restricted` items stay visible to every role (SidebarSubmenu shows a
// lock icon instead of hiding them) — the router guard is what actually
// enforces the block, matching the backend's admin-only write endpoints.
const SETTINGS_ITEMS = [
  { label: 'Integrações', to: { name: 'integrations' }, restricted: true },
  { label: 'Geral', to: { name: 'settings' } },
]

const initials = computed(() => {
  const name = auth.user?.name || ''
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  )
})

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <aside
    class="sidebar fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0b1e3d] text-white"
    :class="[collapsed ? 'sidebar--collapsed' : 'sidebar--expanded', mobileOpen ? 'sidebar--mobile-open' : '']"
  >
    <div class="flex items-center gap-2.5 px-4 py-4">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold">P</span>
      <span v-if="!collapsed" class="truncate text-lg font-semibold tracking-tight">Pricecom Hub</span>
      <button
        type="button"
        aria-label="Fechar menu"
        class="sidebar-mobile-close ml-auto text-slate-400 hover:text-white"
        @click="closeMobile"
      >
        <X class="h-5 w-5" />
      </button>
    </div>

    <nav class="flex-1 space-y-1 px-3 py-2">
      <SidebarItem
        v-for="item in MAIN_ITEMS"
        :key="item.label"
        :to="item.to"
        :label="item.label"
        :icon="item.icon"
        @navigate="closeMobile"
      />
      <SidebarSubmenu label="Configurações" :icon="Settings" :items="SETTINGS_ITEMS" @navigate="closeMobile" />
    </nav>

    <div class="border-t border-white/10 px-3 py-3">
      <div class="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold">
          {{ initials }}
        </span>
        <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-sm text-slate-300">{{ auth.user?.name }}</span>
        <button
          v-if="!collapsed"
          type="button"
          class="shrink-0 text-slate-400 hover:text-white"
          title="Sair"
          @click="handleLogout"
        >
          <LogOut class="h-4 w-4" />
        </button>
      </div>
      <button
        v-if="collapsed"
        type="button"
        class="mt-1 flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
        title="Sair"
        @click="handleLogout"
      >
        <LogOut class="h-4 w-4" />
      </button>

      <button
        type="button"
        class="sidebar-collapse-toggle mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white"
        @click="toggleCollapsed"
      >
        <component :is="collapsed ? ChevronsRight : ChevronsLeft" class="h-4 w-4" />
        <span v-if="!collapsed">Recolher</span>
      </button>
    </div>
  </aside>

  <div v-if="mobileOpen" class="sidebar-backdrop fixed inset-0 z-40 bg-slate-950/50" @click="closeMobile"></div>
</template>

<style scoped>
/*
  Structural sizing/positioning (width, slide-in transform, the mobile
  breakpoint) is plain scoped CSS rather than Tailwind's responsive/arbitrary
  utilities. This app hit a real bug where Tailwind's JIT content-scan went
  stale on a long-lived dev server and silently dropped newly-introduced
  utility classes (see RevenueChart.vue) — for a layout-critical component
  like this, a missing width/transform rule breaks the whole page rather
  than just one chart, so we don't take the dependency here.
*/
.sidebar {
  width: 240px;
  transform: translateX(-100%);
  transition:
    width 200ms ease,
    transform 200ms ease;
}

.sidebar--collapsed {
  width: 64px;
}

.sidebar--mobile-open {
  transform: translateX(0);
}

.sidebar-mobile-close {
  display: block;
}

.sidebar-backdrop {
  display: block;
}

.sidebar-collapse-toggle {
  display: none;
}

@media (min-width: 1024px) {
  .sidebar {
    transform: translateX(0);
  }

  .sidebar-mobile-close {
    display: none;
  }

  .sidebar-backdrop {
    display: none;
  }

  .sidebar-collapse-toggle {
    display: flex;
  }
}
</style>
