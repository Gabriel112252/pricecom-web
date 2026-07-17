<script setup>
import { ref, computed } from 'vue'
import { formatMoney } from '@/lib/format'

// Card de receita da Visão Geral. Colapsado por padrão pro mesmo formato
// visual dos outros KPIs (label + valor grande + métrica pequena embaixo) —
// "ver detalhes" expande a composição completa (bruta → deduções → líquida).
// A líquida aqui já desconta cancelados/devolvidos e frete/imposto (payload
// revenue_breakdown do BuildSummary), diferente do net das séries.
const props = defineProps({
  breakdown: { type: Object, default: () => ({}) },
  tooltip: { type: String, default: '' },
})

const expanded = ref(false)

// tax_amount está zerado em produção (sem fonte de imposto configurada);
// o rótulo só menciona imposto quando ele de fato compõe o valor.
const freightLabel = computed(() =>
  Number(props.breakdown.taxes || 0) > 0 ? '(−) Frete e imposto' : '(−) Frete',
)

function deltaLabel(pct) {
  if (pct === null || pct === undefined) return ''
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

function deltaTone(pct) {
  return pct >= 0 ? 'text-emerald-600' : 'text-red-600'
}
</script>

<template>
  <div class="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm" :title="tooltip || undefined">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Receita líquida</p>
    <p class="mt-2 text-2xl font-bold leading-tight tabular-nums text-slate-900">
      {{ formatMoney(breakdown.net_revenue) }}
    </p>

    <div class="mt-auto flex min-h-4 items-center justify-between gap-2 pt-2 text-xs">
      <button
        type="button"
        class="font-medium text-slate-500 underline underline-offset-2 hover:opacity-75"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'ocultar detalhes' : 'ver detalhes' }}
      </button>
      <span
        v-if="deltaLabel(breakdown.net_vs_previous_pct)"
        class="shrink-0 font-medium"
        :class="deltaTone(breakdown.net_vs_previous_pct)"
      >
        {{ deltaLabel(breakdown.net_vs_previous_pct) }}
      </span>
    </div>

    <dl v-if="expanded" class="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs">
      <div class="flex items-baseline justify-between gap-2">
        <dt class="text-slate-500">Receita bruta</dt>
        <dd class="font-medium tabular-nums text-slate-700">{{ formatMoney(breakdown.gross_revenue) }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-2">
        <dt class="text-slate-400">(−) Descontos</dt>
        <dd class="tabular-nums text-slate-500">{{ formatMoney(breakdown.discounts) }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-2">
        <dt class="text-slate-400">(−) Cancelados/devolvidos</dt>
        <dd class="tabular-nums text-slate-500">{{ formatMoney(breakdown.cancellations_and_refunds) }}</dd>
      </div>
      <div class="flex items-baseline justify-between gap-2">
        <dt class="text-slate-400">{{ freightLabel }}</dt>
        <dd class="tabular-nums text-slate-500">{{ formatMoney(breakdown.freight_and_taxes) }}</dd>
      </div>
    </dl>
  </div>
</template>
