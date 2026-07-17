<script setup>
import { computed } from 'vue'
import { formatMoney } from '@/lib/format'

// Card de receita da Visão Geral: bruta → deduções → líquida em destaque.
// A líquida daqui já desconta cancelados/devolvidos e frete/imposto
// (payload revenue_breakdown do BuildSummary), diferente do net das séries.
const props = defineProps({
  breakdown: { type: Object, default: () => ({}) },
  tooltip: { type: String, default: '' },
  // Nota discreta (ex: "Exclui N pedidos não pagos..."), mesmo contrato do
  // ExecutiveKpiCard: vazia = não renderiza; noteActionLabel vira link.
  note: { type: String, default: '' },
  noteActionLabel: { type: String, default: '' },
})

const emit = defineEmits(['note-action'])

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
  <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" :title="tooltip || undefined">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Receita</p>

    <dl class="mt-2 space-y-1 text-xs">
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

    <div class="mt-2 border-t border-slate-200 pt-2">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Receita líquida</p>
      <div class="mt-1 flex items-baseline justify-between gap-2">
        <p class="text-2xl font-bold leading-tight tabular-nums text-slate-900">
          {{ formatMoney(breakdown.net_revenue) }}
        </p>
        <span
          v-if="deltaLabel(breakdown.net_vs_previous_pct)"
          class="shrink-0 text-xs font-medium"
          :class="deltaTone(breakdown.net_vs_previous_pct)"
        >
          {{ deltaLabel(breakdown.net_vs_previous_pct) }}
        </span>
      </div>
    </div>

    <p v-if="note" class="mt-1.5 text-[11px] leading-snug text-slate-500">
      {{ note }}
      <button
        v-if="noteActionLabel"
        type="button"
        class="font-medium text-slate-600 underline underline-offset-2 hover:opacity-75"
        @click="emit('note-action')"
      >
        {{ noteActionLabel }}
      </button>
    </p>
  </div>
</template>
