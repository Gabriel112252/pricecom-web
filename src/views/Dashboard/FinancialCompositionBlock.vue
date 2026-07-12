<script setup>
import { computed } from 'vue'
import { formatMoney } from '@/lib/format'

const props = defineProps({
  composition: { type: Object, default: () => ({}) },
})

const rows = computed(() => [
  { key: 'gross_revenue', label: 'Receita bruta', sign: '+', strong: true },
  { key: 'discounts', label: 'Descontos', sign: '-' },
  { key: 'refunds', label: 'Reembolsos', sign: '-' },
  { key: 'net_revenue', label: 'Receita líquida', sign: '=', strong: true },
  { key: 'product_cost', label: 'CMV', sign: '-' },
  { key: 'freight', label: 'Frete', sign: '-' },
  { key: 'commissions', label: 'Comissões', sign: '-' },
  { key: 'taxes', label: 'Impostos', sign: '-' },
  { key: 'operational_costs', label: 'Custos operacionais', sign: '-' },
  { key: 'result', label: 'Resultado', sign: '=', strong: true },
])

function lineFor(key) {
  return props.composition?.[key] || {}
}

function valueLabel(line) {
  if (line.status === 'not_configured') return 'Não configurado'
  if (line.value === null || line.value === undefined) return 'Indisponível'
  return formatMoney(line.value)
}

function statusClass(line) {
  if (line.status === 'incomplete') return 'bg-amber-100 text-amber-800'
  if (line.status === 'not_configured') return 'bg-slate-100 text-slate-500'
  return 'bg-emerald-100 text-emerald-700'
}

function statusLabel(line) {
  if (line.status === 'incomplete') return 'Incompleto'
  if (line.status === 'not_configured') return 'Não configurado'
  return 'OK'
}
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Composição financeira</h3>
        <p class="mt-0.5 text-xs text-slate-400">Receita líquida até resultado</p>
      </div>
      <span
        class="rounded-full px-2.5 py-1 text-xs font-semibold"
        :class="composition.result_available ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'"
      >
        {{ composition.result_available ? 'Completo' : 'Incompleto' }}
      </span>
    </div>

    <div class="mt-4 divide-y divide-slate-100">
      <div
        v-for="row in rows"
        :key="row.key"
        class="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-sm"
        :title="lineFor(row.key).tooltip || undefined"
      >
        <span class="text-center font-semibold text-slate-400">{{ row.sign }}</span>
        <div class="min-w-0">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <p class="truncate" :class="row.strong ? 'font-semibold text-slate-900' : 'text-slate-700'">{{ row.label }}</p>
            <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="statusClass(lineFor(row.key))">
              {{ statusLabel(lineFor(row.key)) }}
            </span>
          </div>
          <p v-if="lineFor(row.key).reason" class="mt-0.5 truncate text-xs text-amber-700">
            {{ lineFor(row.key).reason }}
          </p>
        </div>
        <span class="text-right font-semibold" :class="lineFor(row.key).available ? 'text-slate-900' : 'text-slate-500'">
          {{ valueLabel(lineFor(row.key)) }}
        </span>
      </div>
    </div>
  </div>
</template>
