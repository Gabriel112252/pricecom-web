<script setup>
import { computed } from 'vue'
import { formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  coupons: { type: Object, default: () => ({}) },
  // Receita bruta do período (revenue_breakdown.gross_revenue) — denominador
  // do "% da receita bruta" no header.
  grossRevenue: { type: Number, default: 0 },
})

// Cor fixa por categoria (a cor segue a entidade, nunca a posição) —
// paleta categórica do chartTheme, validada para CVD.
const CATEGORIES = [
  { key: 'commercial_discount', label: 'Progressivo/comercial', color: '#3b82f6' },
  { key: 'coupon', label: 'Cupom', color: '#14b8a6' },
  { key: 'shipping_subsidy', label: 'Frete subsidiado', color: '#f59e0b' },
]

const totalDiscount = computed(() => Number(props.coupons.display_discount_total ?? props.coupons.total_discount ?? 0))

const grossSharePct = computed(() => {
  const gross = Number(props.grossRevenue || 0)
  if (gross <= 0 || totalDiscount.value <= 0) return null
  return (totalDiscount.value / gross) * 100
})

const categoryEntries = computed(() => {
  const byKey = Object.fromEntries((props.coupons.breakdown || []).map((row) => [row.key, row]))
  const entries = CATEGORIES.map((cat) => ({
    ...cat,
    amount: Number(byKey[cat.key]?.amount || 0),
    ordersCount: Number(byKey[cat.key]?.orders_count || 0),
  }))
  const total = entries.reduce((sum, row) => sum + row.amount, 0)
  return entries.map((row) => ({ ...row, pct: total > 0 ? (row.amount / total) * 100 : 0 }))
})

const barSegments = computed(() => categoryEntries.value.filter((row) => row.amount > 0))
const hasDiscountData = computed(() => totalDiscount.value > 0 || barSegments.value.length > 0)

const productEntries = computed(() =>
  (props.coupons.by_product || []).filter((row) => Number(row.discount_total || 0) > 0),
)
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Composição dos descontos</h3>
        <p class="mt-0.5 text-xs text-slate-400">Progressivo/comercial, cupom e frete subsidiado</p>
      </div>
      <div class="text-right">
        <p class="text-lg font-bold leading-tight tabular-nums text-slate-900">{{ formatMoney(totalDiscount) }}</p>
        <p v-if="grossSharePct !== null" class="text-xs text-slate-500">{{ formatPct(grossSharePct) }} da receita bruta</p>
      </div>
    </div>

    <div v-if="!hasDiscountData" class="mt-5 flex h-24 items-center justify-center text-sm text-slate-400">
      Nenhum desconto registrado no período.
    </div>
    <div v-else class="mt-5 space-y-4">
      <!-- Barra 100% empilhada por categoria -->
      <div class="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        <div
          v-for="segment in barSegments"
          :key="segment.key"
          class="h-full rounded-[3px] first:rounded-l-full last:rounded-r-full"
          :style="{ width: `${segment.pct}%`, backgroundColor: segment.color, minWidth: '4px' }"
          :title="`${segment.label} · ${formatMoney(segment.amount)} · ${formatPct(segment.pct)}`"
        />
      </div>

      <!-- Legenda com % de cada categoria -->
      <div class="flex flex-wrap gap-x-5 gap-y-1.5">
        <div v-for="row in categoryEntries" :key="row.key" class="flex items-center gap-1.5 text-xs">
          <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: row.color }" />
          <span class="text-slate-600">{{ row.label }}</span>
          <span class="font-semibold tabular-nums text-slate-900">{{ formatPct(row.pct) }}</span>
          <span class="tabular-nums text-slate-400">{{ formatMoney(row.amount) }}</span>
        </div>
      </div>

      <!-- Ranking por produto: nome, desconto R$, % sobre o preço do item -->
      <div v-if="productEntries.length" class="border-t border-slate-100 pt-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Por produto</h4>
            <p class="mt-0.5 text-xs text-slate-400">Descontos atribuídos aos itens do pedido</p>
          </div>
        </div>
        <ol class="mt-3 space-y-2.5">
          <li v-for="row in productEntries" :key="row.sku || row.name" class="flex items-baseline justify-between gap-3 text-sm">
            <div class="min-w-0">
              <p class="truncate font-medium text-slate-900" :title="row.name">{{ row.name }}</p>
              <p v-if="row.sku" class="mt-0.5 text-xs text-slate-400">{{ row.sku }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="font-semibold tabular-nums text-slate-900">{{ formatMoney(row.discount_total) }}</p>
              <p class="text-xs tabular-nums text-slate-400">{{ formatPct(row.discount_pct) }} do preço</p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  </div>
</template>
