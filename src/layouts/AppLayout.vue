<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Pedidos', to: '/orders' },
  { label: 'Produtos', to: '/products' },
  { label: 'Estoque', to: '/inventory' },
  { label: 'Financeiro', to: '/financial' },
  { label: 'Auditoria', to: '/audit' },
  { label: 'Integrações', to: '/integrations' },
  { label: 'Configurações', to: '/settings' },
]

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-[#eef2f7]">
    <header class="bg-[#0b1e3d] text-white">
      <div class="flex items-center justify-between px-6 py-3">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold">P</span>
          <span class="text-lg font-semibold tracking-tight">Pricecom Hub</span>
        </div>

        <div class="flex items-center gap-4 text-sm">
          <span class="truncate text-slate-300">{{ auth.user?.name }}</span>
          <button
            type="button"
            class="rounded-lg border border-white/20 px-3 py-1.5 font-medium text-slate-200 hover:border-white/40 hover:bg-white/5 hover:text-white"
            @click="handleLogout"
          >
            Sair
          </button>
        </div>
      </div>

      <nav class="flex gap-1 overflow-x-auto border-t border-white/10 px-4">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          class="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-300 hover:text-white"
          active-class="border-indigo-400 text-white"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="min-w-0">
      <RouterView />
    </main>
  </div>
</template>
