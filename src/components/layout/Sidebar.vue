<script setup>
import { useSidebar } from '@/composables/useSidebar'
import { useAuthStore } from '@/stores/auth'
import SidebarItem from './SidebarItem.vue'
import SidebarSubmenu from './SidebarSubmenu.vue'
import BrandMark from './BrandMark.vue'
import {
  LayoutDashboard,
  Users,
  UserCog,
  ShoppingCart,
  Package,
  Boxes,
  Banknote,
  ShieldCheck,
  Quote,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  X,
} from '@lucide/vue'

const { collapsed, toggleCollapsed, mobileOpen, closeMobile } = useSidebar()
const auth = useAuthStore()

// Produtos/Estoque promovidos pro nível superior — são operacionais
// (consultados no dia a dia), diferente de Integrações/Geral em
// Configurações, que são tela de setup. O cadastro da regra de alerta de
// estoque (StockAlertRule) continua em Configurações — configurar o
// gatilho é uma tarefa diferente de olhar o saldo atual.
const MAIN_ITEMS = [
  { label: 'Dashboard', to: { name: 'dashboard' }, icon: LayoutDashboard },
  { label: 'Afiliados', to: { name: 'affiliates' }, icon: Users },
  { label: 'Pedidos', to: { name: 'orders' }, icon: ShoppingCart },
  { label: 'Produtos', to: { name: 'products' }, icon: Package },
  { label: 'Estoque', to: { name: 'inventory' }, icon: Boxes },
  { label: 'Financeiro', to: { name: 'financial' }, icon: Banknote },
  { label: 'Depoimentos', to: { name: 'testimonials' }, icon: Quote },
  { label: 'Auditoria', to: { name: 'audit' }, icon: ShieldCheck },
]

// `restricted` items stay visible to every role (SidebarSubmenu shows a
// lock icon instead of hiding them) — the router guard is what actually
// enforces the block, matching the backend's admin-only write endpoints.
const SETTINGS_ITEMS = [
  { label: 'Integrações', to: { name: 'integrations' }, restricted: true },
  { label: 'Geral', to: { name: 'settings' } },
]
</script>

<template>
  <aside
    class="sidebar fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--color-brand-navy)] text-white"
    :class="[collapsed ? 'sidebar--collapsed' : 'sidebar--expanded', mobileOpen ? 'sidebar--mobile-open' : '']"
  >
    <button
      type="button"
      class="flex items-center gap-2.5 px-4 py-4 text-left hover:bg-white/5"
      :title="collapsed ? 'Expandir menu' : 'Recolher menu'"
      @click="toggleCollapsed"
    >
      <BrandMark :size="32" class="shrink-0" />
      <span v-if="!collapsed" class="truncate text-lg font-semibold tracking-tight">Pricecom</span>
    </button>
    <button
      type="button"
      aria-label="Fechar menu"
      class="sidebar-mobile-close absolute top-4 right-4 text-slate-400 hover:text-white"
      @click="closeMobile"
    >
      <X class="h-5 w-5" />
    </button>

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

      <!-- Gerenciamento de usuários (item 4 do roadmap) — admin only, tanto
           aqui (escondido de operador, que não tem uso pra isso no dia a
           dia) quanto no backend (UsersController#require_admin!). -->
      <SidebarItem
        v-if="auth.isAdmin"
        :to="{ name: 'users' }"
        label="Usuários"
        :icon="UserCog"
        @navigate="closeMobile"
      />
    </nav>

    <div class="border-t border-white/10 px-3 py-3">
      <button
        type="button"
        class="sidebar-collapse-toggle flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white"
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
