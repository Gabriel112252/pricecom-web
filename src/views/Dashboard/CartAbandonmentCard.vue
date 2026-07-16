<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS } from '@/lib/chartTheme'
import { formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  cartAbandonment: { type: Object, default: () => ({}) },
})

const available = computed(() => props.cartAbandonment.available === true)
const totalCount = computed(() => Number(props.cartAbandonment.total_count || 0))

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
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Carrinho abandonado</h3>
        <p class="mt-0.5 text-xs text-slate-400">Checkout Yampi · carrinhos no período</p>
      </div>
      <div class="text-right text-xs text-slate-500">
        <p class="font-semibold text-slate-900">{{ formatMoney(cartAbandonment.abandoned_value) }}</p>
        <p>{{ cartAbandonment.abandoned_count || 0 }} carrinhos abandonados</p>
      </div>
    </div>

    <div v-if="!available" class="empty-frame mt-4 flex items-center justify-center text-center text-sm text-slate-400">
      Dados de carrinho abandonado ainda não disponíveis para este ambiente.
    </div>
    <div v-else-if="totalCount === 0" class="empty-frame mt-4 flex items-center justify-center text-center text-sm text-slate-400">
      Nenhum carrinho registrado no período.
    </div>
    <template v-else>
      <div class="mt-5 grid grid-cols-3 gap-3">
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">Abandonados</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ cartAbandonment.abandoned_count || 0 }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">Valor abandonado</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatMoney(cartAbandonment.abandoned_value) }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">Taxa de conversão</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatPct(cartAbandonment.conversion_rate_pct) }}</p>
          <p class="mt-0.5 text-xs text-slate-400">{{ cartAbandonment.converted_count || 0 }} de {{ totalCount }} convertidos</p>
        </div>
      </div>

      <div class="mt-5">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Composição dos descontos</h4>
        <p class="mt-0.5 text-xs text-slate-400">Cupom, progressivo, combos e frete nos carrinhos do período</p>

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
    </template>
  </div>
</template>

<style scoped>
.empty-frame {
  height: 160px;
  width: 100%;
}
</style>
