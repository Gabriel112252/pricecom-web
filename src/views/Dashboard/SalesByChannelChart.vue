<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  channels: { type: Array, default: () => [] },
})

const entries = computed(() =>
  [...props.channels].sort((a, b) => Number(a.net_revenue || 0) - Number(b.net_revenue || 0)),
)

const option = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  grid: { left: 8, right: 54, top: 8, bottom: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
  tooltip: {
    trigger: 'item',
    formatter(params) {
      const row = params.data?.payload || {}
      return [
        `<strong>${row.channel}</strong>`,
        `Receita líquida: ${formatMoney(row.net_revenue)}`,
        `Receita bruta: ${formatMoney(row.gross_revenue)}`,
        `Pedidos: ${Number(row.orders_count || 0)}`,
        `Ticket líquido: ${formatMoney(row.average_ticket)}`,
        `Participação: ${formatPct(row.share_percentage)}`,
      ].join('<br />')
    },
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatCompactMoney(v) },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  yAxis: {
    type: 'category',
    data: entries.value.map((row) => row.channel),
    axisLabel: { color: CHART_INK.secondary },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      data: entries.value.map((row, i) => ({
        value: row.net_revenue,
        payload: row,
        itemStyle: { color: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length], borderRadius: [0, 4, 4, 0] },
      })),
      barMaxWidth: 24,
      label: {
        show: true,
        position: 'right',
        color: CHART_INK.secondary,
        formatter: (params) => formatCompactMoney(params.value),
      },
    },
  ],
}))
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Vendas por canal</h3>
    <p class="mt-0.5 text-xs text-slate-400">Receita líquida por origem</p>
    <div v-if="entries.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="mt-2 w-full" :style="{ height: `${Math.max(entries.length * 42, 180)}px` }" :option="option" autoresize />
  </div>
</template>

<style scoped>
.chart-frame {
  height: 280px;
  width: 100%;
}
</style>
