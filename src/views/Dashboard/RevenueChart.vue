<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney, formatBucketLabel } from '@/lib/format'

const props = defineProps({
  byDay: { type: Array, default: () => [] },
  granularity: { type: String, default: 'day' },
})

const [grossColor, netColor] = CATEGORICAL_COLORS

const option = computed(() => ({
  color: [grossColor, netColor],
  textStyle: CHART_TEXT_STYLE,
  grid: CHART_GRID,
  legend: {
    top: 0,
    right: 0,
    itemWidth: 14,
    itemHeight: 3,
    textStyle: CHART_TEXT_STYLE,
  },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v) => formatMoney(v),
  },
  xAxis: {
    type: 'category',
    data: props.byDay.map((d) => d.date),
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatBucketLabel(v, props.granularity) },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatCompactMoney(v) },
    splitLine: { lineStyle: { color: CHART_INK.grid, type: 'solid' } },
  },
  series: [
    {
      name: 'Receita bruta',
      type: 'line',
      data: props.byDay.map((d) => d.gross),
      lineStyle: { width: 2 },
      showSymbol: true,
      symbolSize: 8,
      itemStyle: { borderWidth: 2, borderColor: '#fff' },
      smooth: false,
    },
    {
      name: 'Receita líquida',
      type: 'line',
      data: props.byDay.map((d) => d.net),
      lineStyle: { width: 2 },
      showSymbol: true,
      symbolSize: 8,
      itemStyle: { borderWidth: 2, borderColor: '#fff' },
      smooth: false,
    },
  ],
}))
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Receita ao longo do tempo</h3>
    <p class="mt-0.5 text-xs text-slate-400">Bruta x líquida por dia</p>
    <div v-if="byDay.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="chart-frame mt-2 w-full" :option="option" autoresize />
  </div>
</template>

<style scoped>
/*
  Fixed px height via real (non-Tailwind-generated) CSS. Tailwind's h-64
  utility depends on JIT content scanning picking this file up — if that
  scan is stale (e.g. a long-lived dev server that hasn't rescanned since
  this file was added), the class silently resolves to no rule at all,
  leaving the chart with no height constraint. vue-echarts' autoresize
  then measures the unconstrained (content-sized) container, resizes the
  canvas to fit, which grows the container, which re-triggers the
  ResizeObserver — runaway growth. A scoped SFC style is compiled by
  @vitejs/plugin-vue directly and never depends on Tailwind's scan.
*/
.chart-frame {
  height: 256px;
  width: 100%;
}
</style>
