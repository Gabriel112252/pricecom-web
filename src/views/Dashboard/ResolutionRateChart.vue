<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'
import { formatDateShort } from '@/lib/format'

const props = defineProps({
  trend: { type: Array, default: () => [] },
})

const [openedColor, resolvedColor] = CATEGORICAL_COLORS

const option = computed(() => ({
  color: [openedColor, resolvedColor],
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
    data: props.trend.map((w) => w.week),
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatDateShort(v) },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    axisLabel: { color: CHART_INK.muted },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  series: [
    {
      name: 'Abertos',
      type: 'bar',
      data: props.trend.map((w) => w.opened),
      barMaxWidth: 20,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
    {
      name: 'Resolvidos',
      type: 'bar',
      data: props.trend.map((w) => w.resolved),
      barMaxWidth: 20,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
  ],
}))
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Taxa de resolução</h3>
    <p class="mt-0.5 text-xs text-slate-400">Conflitos abertos x resolvidos, últimas 8 semanas</p>
    <div v-if="trend.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados.
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
