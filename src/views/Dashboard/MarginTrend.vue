<script setup>
import { computed } from 'vue'
import { SEQUENTIAL_BLUE, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'
import { formatPct, formatBucketLabel } from '@/lib/format'

const props = defineProps({
  trend: { type: Array, default: () => [] },
  avgPct: { type: Number, default: 0 },
  granularity: { type: String, default: 'day' },
})

const option = computed(() => ({
  color: [SEQUENTIAL_BLUE],
  textStyle: CHART_TEXT_STYLE,
  grid: CHART_GRID,
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v) => formatPct(v),
  },
  xAxis: {
    type: 'category',
    data: props.trend.map((d) => d.date),
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatBucketLabel(v, props.granularity) },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted, formatter: (v) => `${v}%` },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  series: [
    {
      name: 'Margem',
      type: 'line',
      data: props.trend.map((d) => d.pct),
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.1 },
      showSymbol: true,
      symbolSize: 8,
      itemStyle: { borderWidth: 2, borderColor: '#fff' },
    },
  ],
}))
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Margem ao longo do tempo</h3>
    <p class="mt-0.5 text-xs text-slate-400">Margem média no período: {{ formatPct(avgPct) }}</p>
    <div v-if="trend.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="chart-frame mt-2 w-full" :option="option" autoresize />
  </div>
</template>

<style scoped>
/* See RevenueChart.vue for why this is a real CSS rule, not a Tailwind h-* utility. */
.chart-frame {
  height: 224px;
  width: 100%;
}
</style>
