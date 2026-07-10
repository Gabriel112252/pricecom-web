<script setup>
import { RouterView } from 'vue-router'
import { Menu } from '@lucide/vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import { useSidebar } from '@/composables/useSidebar'

const { collapsed, openMobile } = useSidebar()
</script>

<template>
  <div class="min-h-screen bg-[#eef2f7]">
    <Sidebar />

    <button
      type="button"
      aria-label="Abrir menu"
      class="mobile-menu-button fixed top-4 left-4 z-30 h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-md hover:text-slate-900"
      @click="openMobile"
    >
      <Menu class="mx-auto h-5 w-5" />
    </button>

    <main class="content-area min-w-0" :class="collapsed ? 'content-area--collapsed' : 'content-area--expanded'">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* See Sidebar.vue for why this is plain CSS rather than Tailwind lg:/margin utilities. */
.mobile-menu-button {
  display: flex;
}

.content-area {
  margin-left: 0;
  transition: margin-left 200ms ease;
}

@media (min-width: 1024px) {
  .mobile-menu-button {
    display: none;
  }

  .content-area--expanded {
    margin-left: 240px;
  }

  .content-area--collapsed {
    margin-left: 64px;
  }
}
</style>
