<script setup>
import { computed } from 'vue'

const props = defineProps({
  coverage: { type: Object, default: () => ({}) },
})

const hasOrders = computed(() => Number(props.coverage.orders_count || 0) > 0)
const pct = computed(() => Number(props.coverage.coverage_percentage || 0))
const isPartial = computed(() => hasOrders.value && pct.value < 100)
</script>

<template>
  <div
    v-if="coverage.available !== false"
    class="rounded-lg border bg-white p-4 shadow-sm"
    :class="isPartial ? 'border-amber-200' : 'border-slate-200'"
    title="Percentual de pedidos TikTok do período que já têm o demonstrativo financeiro sincronizado (financial_synced_at). Pedidos pendentes ainda não entram nos totais de liquidado/lucro real."
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-slate-900">Cobertura financeira TikTok</h3>
          <span
            v-if="isPartial"
            class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"
          >
            Dados parciais
          </span>
        </div>
        <p class="mt-1 text-xs text-slate-500">
          {{ hasOrders ? coverage.status : 'Nenhum pedido TikTok no período.' }}
        </p>
      </div>
      <div v-if="hasOrders" class="text-right">
        <p class="text-2xl font-bold text-slate-900">{{ pct.toFixed(1) }}%</p>
        <p class="text-xs text-slate-500">
          {{ coverage.synced_orders_count ?? 0 }} de {{ coverage.orders_count ?? 0 }} pedidos processados
          <span v-if="coverage.pending_orders_count"> · {{ coverage.pending_orders_count }} pendentes</span>
        </p>
      </div>
    </div>
  </div>
</template>
