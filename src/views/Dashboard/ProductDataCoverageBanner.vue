<script setup>
import { computed } from 'vue'

const props = defineProps({
  // tiktok_product_data_coverage do payload (Dashboard::BuildSummary#build_tiktok_product_data_coverage).
  coverage: { type: Object, default: () => ({}) },
})

const pct = computed(() => Number(props.coverage.coverage_pct || 0))
const isPartial = computed(() => props.coverage.partial === true)
</script>

<template>
  <div
    v-if="coverage.available === true && isPartial"
    class="rounded-lg border border-amber-200 bg-white p-4 shadow-sm"
    title="Pedidos TikTok processados antes da correção do split de desconto por item (seller_discount/platform_discount) ainda não foram reprocessados — o backfill histórico foi interrompido por rate limit e não será retomado. Esses itens ficam de fora dos rankings abaixo para não misturar valores calculados de duas formas diferentes."
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-slate-900">Cobertura de dados de produto TikTok</h3>
          <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
            Dados parciais
          </span>
        </div>
        <p class="mt-1 text-xs text-slate-500">
          Pedidos TikTok antigos (pré-correção, nunca reprocessados) ficam fora dos rankings abaixo.
        </p>
      </div>
      <div class="text-right">
        <p class="text-2xl font-bold text-slate-900">{{ pct.toFixed(1) }}%</p>
        <p class="text-xs text-slate-500">
          {{ coverage.reliable_count ?? 0 }} de {{ coverage.total_count ?? 0 }} itens TikTok do período
        </p>
      </div>
    </div>
  </div>
</template>
