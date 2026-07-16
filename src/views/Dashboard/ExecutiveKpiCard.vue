<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  deltaPct: { type: Number, default: null },
  detail: { type: String, default: '' },
  status: { type: String, default: 'default' },
  tooltip: { type: String, default: '' },
  // Nota discreta abaixo do detail (ex: "Exclui N pedidos não pagos...").
  // Vazia = não renderiza nada. noteActionLabel adiciona um link no fim da
  // nota que emite 'note-action' (ex: navegar até o gadget com o detalhe).
  note: { type: String, default: '' },
  noteActionLabel: { type: String, default: '' },
  noteTone: { type: String, default: 'warning' }, // 'warning' | 'critical'
})

const emit = defineEmits(['note-action'])

function deltaLabel(pct) {
  if (pct === null || pct === undefined) return 'sem comparação'
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

function deltaTone(pct) {
  if (pct === null || pct === undefined) return 'text-slate-400'
  return pct >= 0 ? 'text-emerald-600' : 'text-red-600'
}
</script>

<template>
  <div
    class="rounded-lg border bg-white p-4 shadow-sm"
    :class="status === 'warning' ? 'border-amber-200' : status === 'critical' ? 'border-red-200' : 'border-slate-200'"
    :title="tooltip || undefined"
  >
    <div class="flex items-start justify-between gap-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ label }}</p>
      <span
        v-if="status !== 'default'"
        class="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
        :class="status === 'critical' ? 'bg-red-500' : 'bg-amber-500'"
      />
    </div>
    <p class="mt-2 text-2xl font-bold leading-tight text-slate-900">{{ value }}</p>
    <div class="mt-2 flex min-h-4 items-center justify-between gap-2 text-xs">
      <span class="truncate text-slate-500">{{ detail }}</span>
      <span class="shrink-0 font-medium" :class="deltaTone(deltaPct)">{{ deltaLabel(deltaPct) }}</span>
    </div>
    <p
      v-if="note"
      class="mt-1.5 text-[11px] leading-snug"
      :class="noteTone === 'critical' ? 'text-red-600' : 'text-amber-700'"
    >
      {{ note }}
      <button
        v-if="noteActionLabel"
        type="button"
        class="font-medium underline underline-offset-2 hover:opacity-75"
        @click="emit('note-action')"
      >
        {{ noteActionLabel }}
      </button>
    </p>
  </div>
</template>
