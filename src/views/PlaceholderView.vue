<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <h1 class="text-2xl font-semibold text-slate-900">{{ route.meta.title }}</h1>

    <div class="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
      <p class="text-sm font-medium text-slate-500">Esta área ainda está em construção.</p>
      <p class="mt-1 text-sm text-slate-400">Em breve você vai gerenciar {{ route.meta.title?.toLowerCase() }} por aqui.</p>
    </div>
  </div>
</template>
