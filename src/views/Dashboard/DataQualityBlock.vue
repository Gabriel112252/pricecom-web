<script setup>
import { computed } from 'vue'
import { formatDateTime, formatPct } from '@/lib/format'

const props = defineProps({
  quality: { type: Object, default: () => ({}) },
})

const status = computed(() => props.quality.health_status || 'healthy')
const statusLabel = computed(() => {
  if (status.value === 'critical') return 'Crítico'
  if (status.value === 'attention') return 'Atenção'
  return 'Saudável'
})
const statusClass = computed(() => {
  if (status.value === 'critical') return 'bg-red-100 text-red-700'
  if (status.value === 'attention') return 'bg-amber-100 text-amber-800'
  return 'bg-emerald-100 text-emerald-700'
})

const metrics = computed(() => [
  { label: 'Pedidos completos', value: Number(props.quality.complete_orders_count || 0) },
  { label: 'Pedidos incompletos', value: Number(props.quality.incomplete_orders_count || 0) },
  { label: 'Pedidos sem custo', value: Number(props.quality.missing_cost_orders_count || props.quality.orders_without_cost || 0) },
  { label: 'SKUs sem match', value: Number(props.quality.unmatched_skus_count || props.quality.products_without_sku_match || 0) },
])
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Qualidade dos dados</h3>
        <p class="mt-0.5 text-xs text-slate-400">
          Cobertura financeira {{ formatPct(quality.financial_coverage_percentage ?? quality.coverage_percentage) }}
        </p>
      </div>
      <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass">{{ statusLabel }}</span>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-4 lg:grid-cols-4">
      <div v-for="metric in metrics" :key="metric.label">
        <p class="text-xs text-slate-500">{{ metric.label }}</p>
        <p class="mt-1 text-xl font-semibold text-slate-900">{{ metric.value }}</p>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-100 pt-4 text-sm md:grid-cols-2">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Yampi</p>
        <p class="mt-1 text-slate-900">{{ formatDateTime(quality.latest_yampi_order_sync_at) }}</p>
      </div>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">IDWorks</p>
        <p class="mt-1 text-slate-900">{{ formatDateTime(quality.latest_idworks_sync_at) }}</p>
      </div>
    </div>

    <div v-if="quality.delayed_integrations?.length || quality.integration_errors?.length" class="mt-4 space-y-2 text-sm">
      <div
        v-for="item in quality.delayed_integrations"
        :key="`delayed-${item.provider}`"
        class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
      >
        {{ item.provider }}: {{ item.reason }}
      </div>
      <div
        v-for="item in quality.integration_errors"
        :key="`error-${item.action}-${item.finished_at}`"
        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800"
      >
        {{ item.action }}: {{ item.error_message || 'erro na última sincronização' }}
      </div>
    </div>
  </div>
</template>
