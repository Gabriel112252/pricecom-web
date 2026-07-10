<script setup>
import { computed } from 'vue'

const props = defineProps({
  matchedPct: { type: Number, default: 0 },
  disputed: { type: Number, default: 0 },
  unmatched: { type: Number, default: 0 },
  bySource: { type: Object, default: () => ({}) },
})

const sourceEntries = computed(() => Object.entries(props.bySource).sort((a, b) => b[1].matched_pct - a[1].matched_pct))
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Conciliação financeira</h3>
    <p class="mt-0.5 text-xs text-slate-400">{{ disputed }} divergentes · {{ unmatched }} não encontrados</p>

    <div class="mt-4">
      <div class="flex items-baseline justify-between text-sm">
        <span class="font-medium text-slate-700">Conciliado</span>
        <span class="font-semibold text-slate-900">{{ matchedPct.toFixed(1) }}%</span>
      </div>
      <div class="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
        <div
          class="h-full rounded-full bg-blue-500 transition-all"
          :style="{ width: `${Math.min(matchedPct, 100)}%` }"
        ></div>
      </div>
    </div>

    <div v-if="sourceEntries.length > 0" class="mt-5 space-y-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Por fonte</p>
      <div v-for="[name, stats] in sourceEntries" :key="name">
        <div class="flex items-baseline justify-between text-xs">
          <span class="font-medium text-slate-600">{{ name }}</span>
          <span class="text-slate-400">{{ stats.matched_pct.toFixed(1) }}% · {{ stats.disputed }} div. · {{ stats.unmatched }} n/e</span>
        </div>
        <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full bg-blue-400" :style="{ width: `${Math.min(stats.matched_pct, 100)}%` }"></div>
        </div>
      </div>
    </div>
    <p v-else class="mt-5 text-sm text-slate-400">Sem dados de conciliação no período.</p>
  </div>
</template>
