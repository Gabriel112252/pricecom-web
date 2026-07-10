<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  deltaPct: { type: Number, default: null },
})

function deltaLabel(pct) {
  if (pct === null || pct === undefined) return 'sem período anterior para comparar'
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}% vs. período anterior`
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ label }}</p>
    <p class="mt-2 text-3xl font-bold text-slate-900">{{ value }}</p>
    <p
      class="mt-1 text-xs"
      :class="deltaPct === null || deltaPct === undefined ? 'text-slate-400' : deltaPct >= 0 ? 'text-emerald-600' : 'text-red-600'"
    >
      {{ deltaLabel(deltaPct) }}
    </p>
  </div>
</template>
