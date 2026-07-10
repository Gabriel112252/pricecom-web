<script setup>
defineProps({
  matchedPct: { type: Number, default: 0 },
  disputed: { type: Number, default: 0 },
  unmatched: { type: Number, default: 0 },
})
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Conciliação financeira</h3>
    <p class="mt-0.5 text-xs text-slate-400">Resumo do período · detalhe completo em Saúde Operacional</p>

    <div class="mt-4">
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-medium text-slate-700">Conciliado</span>
        <span class="font-semibold text-slate-900">{{ matchedPct.toFixed(1) }}%</span>
      </div>
      <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
        <div class="h-full rounded-full bg-blue-500 transition-all" :style="{ width: `${Math.min(matchedPct, 100)}%` }"></div>
      </div>
    </div>

    <div class="mt-4 flex gap-6 text-sm">
      <div>
        <p class="text-xs text-slate-400">Divergentes</p>
        <p class="font-semibold text-slate-900">{{ disputed }}</p>
      </div>
      <div>
        <p class="text-xs text-slate-400">Não encontrados</p>
        <p class="font-semibold text-slate-900">{{ unmatched }}</p>
      </div>
    </div>
  </div>
</template>
