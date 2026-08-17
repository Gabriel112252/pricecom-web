<script setup>
import { computed } from 'vue'
import { SEQUENTIAL_BLUE, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  entries: { type: Array, default: () => [] }, // [{ label, name, value, ...extra }] — extra keys ride along into the tooltip via tooltipFormatter
  valueFormatter: { type: Function, default: (v) => String(v) },
  axisFormatter: { type: Function, default: (v) => String(v) },
  // Optional richer tooltip — receives the full entry (value/name plus any
  // extra keys passed in `entries`), returns an HTML string. Falls back to
  // the plain name+value line when not given.
  tooltipFormatter: { type: Function, default: null },
})

// Backend already orders desc (top N); reverse for the chart since echarts
// renders category index 0 at the bottom of a horizontal bar.
const reversed = computed(() => [...props.entries].reverse())

const option = computed(() => ({
  color: [SEQUENTIAL_BLUE],
  textStyle: CHART_TEXT_STYLE,
  grid: { left: 8, right: 48, top: 8, bottom: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
  tooltip: {
    trigger: 'item',
    formatter: (params) => (props.tooltipFormatter ? props.tooltipFormatter(params.data) : `${params.name}<br/>${props.valueFormatter(params.value)}`),
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted, formatter: (v) => props.axisFormatter(v) },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  yAxis: {
    type: 'category',
    data: reversed.value.map((e) => e.label),
    axisLabel: { color: CHART_INK.secondary },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      data: reversed.value.map((e) => ({ ...e, value: e.value, name: e.name })),
      barMaxWidth: 20,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: {
        show: true,
        position: 'right',
        color: CHART_INK.secondary,
        formatter: (params) => props.valueFormatter(params.value),
      },
    },
  ],
}))
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
    <p v-if="subtitle" class="mt-0.5 text-xs text-slate-400">{{ subtitle }}</p>
    <div v-if="entries.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="mt-2 w-full" :style="{ height: `${Math.max(reversed.length * 32, 160)}px` }" :option="option" autoresize />
  </div>
</template>

<style scoped>
/* See RevenueChart.vue for why this is a real CSS rule, not a Tailwind h-* utility. */
.chart-frame {
  height: 200px;
  width: 100%;
}
</style>
