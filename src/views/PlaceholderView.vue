<script setup>
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'

const route = useRoute()
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader :title="route.meta.title" />

    <div class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <p class="text-sm font-medium text-slate-500">Esta área ainda está em construção.</p>
      <p class="mt-1 text-sm text-slate-400">Em breve você vai gerenciar {{ route.meta.title?.toLowerCase() }} por aqui.</p>
    </div>
  </div>
</template>
