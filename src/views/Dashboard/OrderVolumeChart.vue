<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'
import { formatBucketLabel } from '@/lib/format'

const props = defineProps({
  byChannelSeries: { type: Array, default: () => [] },
  granularity: { type: String, default: 'day' },
})

const buckets = computed(() => [...new Set(props.byChannelSeries.map((row) => row.date))].sort())

// Fixed hue order (never cycled/reassigned) — channel names are stable keys
// across period changes, so this order preserves identity between series.
const channels = computed(() => [...new Set(props.byChannelSeries.map((row) => row.channel))])

const seriesByChannel = computed(() => {
  const map = new Map(channels.value.map((c) => [c, new Map()]))
  for (const row of props.byChannelSeries) {
    map.get(row.channel)?.set(row.date, row.count)
  }
  return map
})

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
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: buckets.value,
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatBucketLabel(v, props.granularity) },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: { color: CHART_INK.muted },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  series: channels.value.map((channel) => ({
    name: channel,
    type: 'line',
    data: buckets.value.map((bucket) => seriesByChannel.value.get(channel)?.get(bucket) ?? 0),
    lineStyle: { width: 2 },
    showSymbol: true,
    symbolSize: 8,
    itemStyle: { borderWidth: 2, borderColor: '#fff' },
  })),
}))
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Volume de pedidos</h3>
    <p class="mt-0.5 text-xs text-slate-400">Pedidos por canal ao longo do tempo</p>
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
