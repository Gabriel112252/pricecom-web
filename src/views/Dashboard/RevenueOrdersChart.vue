<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'
import { formatBucketLabel, formatCompactMoney, formatMoney } from '@/lib/format'

const props = defineProps({
  timeline: { type: Array, default: () => [] },
  granularity: { type: String, default: 'day' },
})

const [revenueColor, ordersColor] = CATEGORICAL_COLORS

const option = computed(() => ({
  color: [revenueColor, ordersColor],
  textStyle: CHART_TEXT_STYLE,
  grid: { ...CHART_GRID, right: 44 },
  legend: {
    top: 0,
    right: 0,
    itemWidth: 14,
    itemHeight: 8,
    textStyle: CHART_TEXT_STYLE,
  },
  tooltip: {
    trigger: 'axis',
    formatter(params) {
      const row = props.timeline[params[0]?.dataIndex] || {}
      return [
        `<strong>${formatBucketLabel(row.date || '', props.granularity)}</strong>`,
        `Receita líquida: ${formatMoney(row.net)}`,
        `Receita bruta: ${formatMoney(row.gross)}`,
        `Descontos: ${formatMoney(row.discounts)}`,
        `Pedidos: ${Number(row.orders_count || 0)}`,
        `Ticket líquido: ${formatMoney(row.average_ticket)}`,
      ].join('<br />')
    },
  },
  xAxis: {
    type: 'category',
    data: props.timeline.map((d) => d.date),
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatBucketLabel(v, props.granularity) },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  yAxis: [
    {
      type: 'value',
      axisLabel: { color: CHART_INK.muted, formatter: (v) => formatCompactMoney(v) },
      splitLine: { lineStyle: { color: CHART_INK.grid } },
    },
    {
      type: 'value',
      axisLabel: { color: CHART_INK.muted },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: 'Receita líquida',
      type: 'bar',
      data: props.timeline.map((d) => d.net),
      barMaxWidth: 28,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
    {
      name: 'Pedidos',
      type: 'line',
      yAxisIndex: 1,
      data: props.timeline.map((d) => d.orders_count),
      lineStyle: { width: 2 },
      showSymbol: true,
      symbolSize: 7,
      itemStyle: { borderWidth: 2, borderColor: '#fff' },
    },
  ],
}))
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Receita e pedidos</h3>
    <p class="mt-0.5 text-xs text-slate-400">Receita líquida e volume no período</p>
    <div v-if="timeline.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="chart-frame mt-2 w-full" :option="option" autoresize />
  </div>
</template>

<style scoped>
.chart-frame {
  height: 280px;
  width: 100%;
}
</style>
