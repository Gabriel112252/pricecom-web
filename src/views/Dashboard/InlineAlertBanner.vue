<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  badgeLabel: { type: String, default: '' },
  detail: { type: String, default: '' },
  pct: { type: Number, default: null },
  pctDetail: { type: String, default: '' },
  tooltip: { type: String, default: '' },
  // 'warning' (âmbar, cobertura parcial) | 'neutral' (slate, informativo — sem
  // nada de errado pra sinalizar, só o dado em si).
  tone: { type: String, default: 'warning' },
})

const isWarning = computed(() => props.tone === 'warning')
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border px-4 py-2.5"
    :class="isWarning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'"
    :title="tooltip || undefined"
  >
    <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span class="h-2 w-2 shrink-0 rounded-full" :class="isWarning ? 'bg-amber-500' : 'bg-slate-300'" />
      <span class="text-sm font-medium" :class="isWarning ? 'text-amber-900' : 'text-slate-900'">{{ title }}</span>
      <span
        v-if="badgeLabel"
        class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"
      >
        {{ badgeLabel }}
      </span>
      <span v-if="detail" class="truncate text-xs" :class="isWarning ? 'text-amber-700' : 'text-slate-500'">{{ detail }}</span>
    </div>
    <div v-if="pct !== null" class="flex shrink-0 items-baseline gap-1.5 text-xs" :class="isWarning ? 'text-amber-700' : 'text-slate-500'">
      <span class="text-sm font-semibold" :class="isWarning ? 'text-amber-900' : 'text-slate-900'">{{ pct.toFixed(1) }}%</span>
      <span v-if="pctDetail">{{ pctDetail }}</span>
    </div>
  </div>
</template>
