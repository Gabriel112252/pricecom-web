<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney, formatBucketLabel } from '@/lib/format'

const props = defineProps({
  byChannelSeries: { type: Array, default: () => [] },
  granularity: { type: String, default: 'day' },
})

const buckets = computed(() => [...new Set(props.byChannelSeries.map((row) => row.date))].sort())
const channels = computed(() => [...new Set(props.byChannelSeries.map((row) => row.channel))])

const seriesByChannel = computed(() => {
  const map = new Map(channels.value.map((c) => [c, new Map()]))
  for (const row of props.byChannelSeries) {
    map.get(row.channel)?.set(row.date, row.gross)
  }
  return map
})

const title = computed(() => (props.granularity === 'hour' ? 'Faturamento por hora' : 'Faturamento por dia'))
const subtitle = computed(() =>
  props.granularity === 'hour' ? 'Receita bruta por canal, hora a hora' : 'Receita bruta por canal, dia a dia',
)

const option = computed(() => ({
  color: CATEGORICAL_COLORS,
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
    data: buckets.value,
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatBucketLabel(v, props.granularity) },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatCompactMoney(v) },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  series: channels.value.map((channel) => ({
    name: channel,
    type: 'bar',
    data: buckets.value.map((bucket) => seriesByChannel.value.get(channel)?.get(bucket) ?? 0),
    barMaxWidth: 24,
    itemStyle: { borderRadius: [4, 4, 0, 0] },
  })),
}))
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
    <p class="mt-0.5 text-xs text-slate-400">{{ subtitle }}</p>
    <div v-if="buckets.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="chart-frame mt-2 w-full" :option="option" autoresize />
  </div>
</template>

<style scoped>
/* See RevenueChart.vue for why this is a real CSS rule, not a Tailwind h-* utility. */
.chart-frame {
  height: 256px;
  width: 100%;
}
</style>
