<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useSidebar } from '@/composables/useSidebar'
import { Menu, ChevronDown, LogOut } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { openMobile } = useSidebar()

const menuOpen = ref(false)
const menuRef = ref(null)
onClickOutside(menuRef, () => (menuOpen.value = false))

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

const roleLabel = computed(() => (auth.isAdmin ? 'Administrador' : 'Usuário'))

function handleLogout() {
  menuOpen.value = false
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
    <div class="flex min-w-0 items-center gap-3">
      <button
        type="button"
        aria-label="Abrir menu"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
        @click="openMobile"
      >
        <Menu class="h-5 w-5" />
      </button>

      <nav class="min-w-0 truncate text-sm">
        <span class="text-slate-400">Pricecom</span>
        <span class="mx-1.5 text-slate-300">/</span>
        <span class="font-medium text-slate-700">{{ route.meta.title || '' }}</span>
      </nav>
    </div>

    <div ref="menuRef" class="relative shrink-0">
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 hover:bg-slate-100"
        @click="menuOpen = !menuOpen"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white ring-2 ring-indigo-100"
        >
          {{ initials }}
        </span>
        <ChevronDown class="hidden h-4 w-4 text-slate-400 sm:block" :class="{ 'rotate-180': menuOpen }" />
      </button>

      <div
        v-if="menuOpen"
        class="absolute top-full right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
      >
        <div class="px-3 py-2">
          <p class="truncate text-sm font-semibold text-slate-900">{{ auth.user?.name }}</p>
          <p class="truncate text-xs text-slate-500">{{ auth.user?.email }}</p>
          <span
            class="mt-1.5 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
          >
            {{ roleLabel }}
          </span>
        </div>
        <div class="my-1 border-t border-slate-100"></div>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          @click="handleLogout"
        >
          <LogOut class="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  </header>
</template>
