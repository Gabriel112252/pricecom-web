<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS } from '@/lib/chartTheme'
import { formatMoney, formatPct } from '@/lib/format'

const ABANDONED_COLOR = CATEGORICAL_COLORS[0] // blue

const props = defineProps({
  cartAbandonment: { type: Object, default: () => ({}) },
})

// "tiktok_unpaid" quando o filtro de canal do dashboard está em TikTok
// Shop: a fonte vira pedido UNPAID (proxy — TikTok não expõe carrinho
// pré-checkout), então os rótulos falam de pedidos, não carrinhos.
const tiktokMode = computed(() => props.cartAbandonment.mode === 'tiktok_unpaid')
const unitLabel = computed(() => (tiktokMode.value ? 'pedidos' : 'carrinhos'))

const compositionEntries = computed(() =>
  (props.cartAbandonment.discount_composition || []).filter((row) => Number(row.amount || 0) > 0),
)
const compositionTotal = computed(() =>
  compositionEntries.value.reduce((sum, row) => sum + Number(row.amount || 0), 0),
)

function compositionPercent(row) {
  if (compositionTotal.value <= 0) return 0
  return Math.min(100, (Number(row.amount || 0) / compositionTotal.value) * 100)
}

function compositionColor(index) {
  return CATEGORICAL_COLORS[(index + 1) % CATEGORICAL_COLORS.length]
}

const topProducts = computed(() => props.cartAbandonment.top_abandoned_products || [])
const topProductsMax = computed(() =>
  topProducts.value.reduce((max, row) => Math.max(max, Number(row.carts_count || 0)), 0),
)

function productPercent(row) {
  if (topProductsMax.value <= 0) return 0
  return Math.min(100, (Number(row.carts_count || 0) / topProductsMax.value) * 100)
}
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <h3 class="text-sm font-semibold text-slate-900">Descontos e produtos no carrinho abandonado</h3>
      <p class="mt-0.5 text-xs text-slate-400">Composição dos descontos aplicados e produtos mais presentes nos carrinhos ainda abandonados</p>
    </div>

    <div v-if="!compositionEntries.length && !topProducts.length" class="mt-4 flex h-24 items-center justify-center text-sm text-slate-400">
      Nenhum dado de carrinho abandonado no período.
    </div>
    <template v-else>
      <div class="mt-5 border-t border-slate-100 pt-4">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Composição dos descontos</h4>
        <p class="mt-0.5 text-xs text-slate-400">Outros (pagamento/cupom), progressivo, combos e frete nos carrinhos do período</p>

        <p v-if="!compositionEntries.length" class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Nenhum desconto aplicado nos carrinhos do período.
        </p>
        <div v-else class="mt-3 space-y-3">
          <div v-for="(row, index) in compositionEntries" :key="row.key" class="space-y-1.5">
            <div class="flex items-center justify-between gap-3 text-sm">
              <p class="font-medium text-slate-900">{{ row.label }}</p>
              <div class="text-right">
                <span class="font-semibold text-slate-900">{{ formatMoney(row.amount) }}</span>
                <span class="ml-2 text-xs text-slate-400">{{ formatPct(compositionPercent(row)) }}</span>
              </div>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full"
                :style="{ width: `${Math.max(compositionPercent(row), 2)}%`, backgroundColor: compositionColor(index) }"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="topProducts.length" class="mt-5 border-t border-slate-100 pt-4">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Top produtos abandonados</h4>
        <p class="mt-0.5 text-xs text-slate-400">
          {{ tiktokMode ? 'Produtos mais presentes nos pedidos ainda não pagos' : 'Produtos mais presentes nos carrinhos ainda abandonados' }}
        </p>
        <div class="mt-3 max-h-[400px] space-y-3 overflow-y-auto pr-1">
          <div v-for="row in topProducts" :key="row.sku || row.name" class="space-y-1.5">
            <div class="flex items-start justify-between gap-3 text-sm">
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-900" :title="row.name">{{ row.name }}</p>
                <p class="mt-0.5 text-xs text-slate-400"><template v-if="row.sku">{{ row.sku }} · </template>{{ row.total_qty || 0 }} unidade(s)</p>
              </div>
              <p class="shrink-0 font-semibold text-slate-900">{{ row.carts_count || 0 }} {{ unitLabel }}</p>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full"
                :style="{ width: `${Math.max(productPercent(row), 2)}%`, backgroundColor: ABANDONED_COLOR }"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
