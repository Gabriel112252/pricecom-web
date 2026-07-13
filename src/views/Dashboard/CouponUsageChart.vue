<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney } from '@/lib/format'

const props = defineProps({
  coupons: { type: Object, default: () => ({}) },
})

const entries = computed(() =>
  [...(props.coupons.top_coupons || [])].sort((a, b) => Number(a.orders_count || 0) - Number(b.orders_count || 0)),
)

const displayDiscountTotal = computed(() => props.coupons.display_discount_total ?? props.coupons.total_discount ?? 0)
const hasUncodedDiscounts = computed(() => Number(props.coupons.uncoded_discount_total || 0) > 0)

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
        <h3 class="text-sm font-semibold text-slate-900">Cupons mais utilizados</h3>
        <p class="mt-0.5 text-xs text-slate-400">Uso por código aplicado</p>
      </div>
      <div class="text-right text-xs text-slate-500">
        <p class="font-semibold text-slate-900">{{ formatMoney(displayDiscountTotal) }}</p>
        <p v-if="coupons.has_coupon_codes">{{ coupons.orders_count || 0 }} pedidos com cupom</p>
        <p v-else>{{ coupons.uncoded_discount_orders_count || 0 }} descontos sem código</p>
      </div>
    </div>

    <div v-if="entries.length === 0" class="chart-frame mt-2 flex flex-col items-center justify-center text-center text-sm text-slate-400">
      <p v-if="hasUncodedDiscounts" class="max-w-sm">
        Existem {{ coupons.uncoded_discount_orders_count || 0 }} pedido(s) com desconto, mas nenhum código de cupom foi capturado nesses pedidos.
      </p>
      <p v-else>Nenhum cupom registrado no período.</p>
    </div>
    <v-chart v-else class="mt-2 w-full" :style="{ height: `${Math.max(entries.length * 42, 220)}px` }" :option="option" autoresize />
  </div>
</template>

<style scoped>
.chart-frame {
  height: 280px;
  width: 100%;
}
</style>
