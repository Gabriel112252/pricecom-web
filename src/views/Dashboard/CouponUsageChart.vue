<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  coupons: { type: Object, default: () => ({}) },
})

const entries = computed(() =>
  [...(props.coupons.top_coupons || [])].sort((a, b) => Number(a.orders_count || 0) - Number(b.orders_count || 0)),
)

const displayDiscountTotal = computed(() => props.coupons.display_discount_total ?? props.coupons.total_discount ?? 0)
const breakdownEntries = computed(() =>
  (props.coupons.breakdown || []).filter((row) => Number(row.amount || 0) > 0 || Number(row.orders_count || 0) > 0),
)
const hasDiscountData = computed(() => Number(displayDiscountTotal.value || 0) > 0 || breakdownEntries.value.length > 0)

const productEntries = computed(() =>
  (props.coupons.by_product || []).filter((row) => Number(row.discount_total || 0) > 0),
)
const productDiscountTotal = computed(() =>
  productEntries.value.reduce((sum, row) => sum + Number(row.discount_total || 0), 0),
)

function productPercent(row) {
  if (productDiscountTotal.value <= 0) return 0
  return Math.min(100, (Number(row.discount_total || 0) / productDiscountTotal.value) * 100)
}

function breakdownPercent(row) {
  const total = Number(displayDiscountTotal.value || 0)
  if (total <= 0) return 0
  return Math.min(100, (Number(row.amount || 0) / total) * 100)
}

function breakdownColor(index) {
  return CATEGORICAL_COLORS[(index + 1) % CATEGORICAL_COLORS.length]
}

const option = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  grid: { left: 8, right: 56, top: 8, bottom: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
  tooltip: {
    trigger: 'item',
    formatter(params) {
      const row = params.data?.payload || {}
      return [
        `<strong>${row.code}</strong>`,
        `Pedidos: ${Number(row.orders_count || 0)}`,
        `Desconto: ${formatMoney(row.discount_total)}`,
        `Receita líquida: ${formatMoney(row.net_revenue)}`,
      ].join('<br />')
    },
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  yAxis: {
    type: 'category',
    data: entries.value.map((row) => row.code),
    axisLabel: { color: CHART_INK.secondary },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      data: entries.value.map((row, i) => ({
        value: row.orders_count,
        payload: row,
        itemStyle: { color: CATEGORICAL_COLORS[(i + 2) % CATEGORICAL_COLORS.length], borderRadius: [0, 4, 4, 0] },
      })),
      barMaxWidth: 24,
      label: {
        show: true,
        position: 'right',
        color: CHART_INK.secondary,
        formatter: (params) => {
          const row = params.data?.payload || {}
          return `${params.value} · ${formatCompactMoney(row.discount_total)}`
        },
      },
    },
  ],
}))
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Composição dos descontos</h3>
        <p class="mt-0.5 text-xs text-slate-400">Cupons, descontos comerciais e subsídio de frete</p>
      </div>
      <div class="text-right text-xs text-slate-500">
        <p class="font-semibold text-slate-900">{{ formatMoney(displayDiscountTotal) }}</p>
        <p>{{ coupons.display_orders_count || 0 }} pedidos impactados</p>
      </div>
    </div>

    <div v-if="!hasDiscountData" class="chart-frame mt-2 flex items-center justify-center text-center text-sm text-slate-400">
      Nenhum desconto registrado no período.
    </div>
    <div v-else class="mt-5 space-y-4">
      <div v-for="(row, index) in breakdownEntries" :key="row.key" class="space-y-1.5">
        <div class="flex items-start justify-between gap-3 text-sm">
          <div>
            <p class="font-medium text-slate-900">{{ row.label }}</p>
            <p class="mt-0.5 text-xs text-slate-400">{{ row.orders_count || 0 }} pedidos · {{ row.evidence }}</p>
          </div>
          <div class="text-right">
            <p class="font-semibold text-slate-900">{{ formatMoney(row.amount) }}</p>
            <p class="text-xs text-slate-400">{{ formatPct(breakdownPercent(row)) }}</p>
          </div>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full" :style="{ width: `${Math.max(breakdownPercent(row), 2)}%`, backgroundColor: breakdownColor(index) }" />
        </div>
      </div>

      <div v-if="entries.length" class="border-t border-slate-100 pt-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Por cupom</h4>
            <p class="mt-0.5 text-xs text-slate-400">Uso por código aplicado</p>
          </div>
          <p class="text-xs text-slate-500">{{ coupons.codes_count || 0 }} código(s)</p>
        </div>
        <v-chart class="mt-2 w-full" :style="{ height: `${Math.max(entries.length * 42, 180)}px` }" :option="option" autoresize />
      </div>
      <p v-else-if="Number(coupons.commercial_discount_total || 0) > 0" class="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        Existem descontos comerciais no período, mas nenhum código de cupom foi capturado nos pedidos.
      </p>

      <div v-if="productEntries.length" class="border-t border-slate-100 pt-4">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Por produto</h4>
            <p class="mt-0.5 text-xs text-slate-400">Descontos atribuídos aos itens do pedido</p>
          </div>
          <p class="text-xs text-slate-500">{{ formatMoney(productDiscountTotal) }}</p>
        </div>
        <div class="mt-3 space-y-3">
          <div v-for="(row, index) in productEntries" :key="row.sku || row.name" class="space-y-1.5">
            <div class="flex items-start justify-between gap-3 text-sm">
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-900" :title="row.name">{{ row.name }}</p>
                <p class="mt-0.5 text-xs text-slate-400">{{ row.orders_count || 0 }} pedidos<template v-if="row.sku"> · {{ row.sku }}</template></p>
              </div>
              <div class="shrink-0 text-right">
                <p class="font-semibold text-slate-900">{{ formatMoney(row.discount_total) }}</p>
                <p class="text-xs text-slate-400">{{ formatPct(productPercent(row)) }}</p>
              </div>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full" :style="{ width: `${Math.max(productPercent(row), 2)}%`, backgroundColor: breakdownColor(index) }" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-frame {
  height: 280px;
  width: 100%;
}
</style>
