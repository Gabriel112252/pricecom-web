<script setup>
import { computed } from 'vue'
import InlineAlertBanner from './InlineAlertBanner.vue'

const props = defineProps({
  coverage: { type: Object, default: () => ({}) },
})

const hasOrders = computed(() => Number(props.coverage.orders_count || 0) > 0)
const pct = computed(() => Number(props.coverage.coverage_percentage || 0))
const isPartial = computed(() => hasOrders.value && pct.value < 100)
const pctDetail = computed(() => {
  const base = `${props.coverage.synced_orders_count ?? 0}/${props.coverage.orders_count ?? 0} pedidos processados`
  return props.coverage.pending_orders_count ? `${base} · ${props.coverage.pending_orders_count} pendentes` : base
})
</script>

<template>
  <InlineAlertBanner
    v-if="coverage.available !== false"
    title="Cobertura financeira TikTok"
    :tone="isPartial ? 'warning' : 'neutral'"
    :badge-label="isPartial ? 'Dados parciais' : ''"
    :detail="hasOrders ? coverage.status : 'Nenhum pedido TikTok no período.'"
    :pct="hasOrders ? pct : null"
    :pct-detail="hasOrders ? pctDetail : ''"
    tooltip="Percentual de pedidos TikTok do período que já têm o demonstrativo financeiro sincronizado (financial_synced_at). Comissão, taxas e lucro real exatos só existem depois do fechamento — a receita em si não depende disso."
  />
</template>
