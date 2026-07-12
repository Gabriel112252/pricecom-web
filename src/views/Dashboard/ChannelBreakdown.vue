<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney } from '@/lib/format'

const props = defineProps({
  byChannel: { type: Object, default: () => ({}) },
})

// echarts renders category index 0 at the bottom of a horizontal bar chart,
// so sort ascending to put the highest revenue channel at the top.
const entries = computed(() =>
  Object.entries(props.byChannel).sort((a, b) => a[1] - b[1]),
)

const option = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  grid: { left: 8, right: 48, top: 8, bottom: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
  tooltip: {
    trigger: 'item',
    valueFormatter: (v) => formatMoney(v),
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatCompactMoney(v) },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  yAxis: {
    type: 'category',
    data: entries.value.map(([name]) => name),
    axisLabel: { color: CHART_INK.secondary },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      data: entries.value.map(([name, value], i) => ({
        value,
        itemStyle: { color: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length], borderRadius: [0, 4, 4, 0] },
        name,
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
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Receita por canal</h3>
    <p class="mt-0.5 text-xs text-slate-400">Receita líquida no período</p>
    <div v-if="entries.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="mt-2 w-full" :style="{ height: `${Math.max(entries.length * 40, 120)}px` }" :option="option" autoresize />
  </div>
</template>

<style scoped>
/* See RevenueChart.vue for why this is a real CSS rule, not a Tailwind h-* utility. */
.chart-frame {
  height: 224px;
  width: 100%;
}
</style>
