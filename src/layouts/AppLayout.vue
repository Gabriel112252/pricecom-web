<script setup>
import { RouterView } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/TopBar.vue'
import { useSidebar } from '@/composables/useSidebar'

const { collapsed } = useSidebar()
</script>

<template>
  <div class="min-h-screen bg-[#eef2f7]">
    <Sidebar />

    <div class="content-area flex min-h-screen min-w-0 flex-col" :class="collapsed ? 'content-area--collapsed' : 'content-area--expanded'">
      <TopBar />
      <main class="min-w-0 flex-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* See Sidebar.vue for why this is plain CSS rather than Tailwind lg:/margin utilities. */
.content-area {
  margin-left: 0;
  transition: margin-left 200ms ease;
}

@media (min-width: 1024px) {
  .content-area--expanded {
    margin-left: 240px;
  }

  .content-area--collapsed {
    margin-left: 64px;
  }
}
</style>
