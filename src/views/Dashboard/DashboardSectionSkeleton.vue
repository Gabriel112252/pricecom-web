<script setup>
// Placeholder de uma seção inteira do dashboard enquanto o tier lento
// (/dashboard/summary_extended) ainda não chegou — ver Dashboard.vue#load.
// `blocks` controla quantos retângulos de "card" aparecem lado a lado, pra
// aproximar a silhueta real da seção (ex: 2 pros gráficos de Vendas, 1 pra
// um card só) sem precisar de um skeleton bespoke por seção.
defineProps({
  blocks: { type: Number, default: 2 },
})
</script>

<template>
  <div class="grid grid-cols-1 gap-6" :class="blocks > 1 ? 'lg:grid-cols-2' : ''">
    <div
      v-for="n in blocks"
      :key="n"
      class="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div class="h-4 w-1/3 rounded bg-slate-200"></div>
      <div class="mt-4 h-40 rounded bg-slate-100"></div>
    </div>
  </div>
</template>
