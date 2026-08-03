<script setup>
import { computed } from 'vue'
import InlineAlertBanner from './InlineAlertBanner.vue'

const props = defineProps({
  // tiktok_product_data_coverage do payload (Dashboard::BuildSummary#build_tiktok_product_data_coverage).
  coverage: { type: Object, default: () => ({}) },
})

const pct = computed(() => Number(props.coverage.coverage_pct || 0))
const isPartial = computed(() => props.coverage.partial === true)
</script>

<template>
  <InlineAlertBanner
    v-if="coverage.available === true && isPartial"
    title="Cobertura de dados de produto TikTok"
    badge-label="Dados parciais"
    detail="Pedidos TikTok antigos (pré-correção, nunca reprocessados) ficam fora dos rankings abaixo."
    :pct="pct"
    :pct-detail="`${coverage.reliable_count ?? 0}/${coverage.total_count ?? 0} itens TikTok do período`"
    tooltip="Pedidos TikTok processados antes da correção do split de desconto por item (seller_discount/platform_discount) ainda não foram reprocessados — o backfill histórico foi interrompido por rate limit e não será retomado. Esses itens ficam de fora dos rankings abaixo para não misturar valores calculados de duas formas diferentes."
  />
</template>
