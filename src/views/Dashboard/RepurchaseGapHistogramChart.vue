<script setup>
import { computed } from 'vue'
import { SEQUENTIAL_BLUE, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'

const props = defineProps({
  buckets: { type: Array, default: () => [] }, // [{ range, customers_count }]
  medianDays: { type: Number, default: null },
  sampleSize: { type: Number, default: 0 },
})

const medianLabel = computed(() => (props.medianDays === null || props.medianDays === undefined ? '—' : `${props.medianDays} dias`))

const option = computed(() => ({
  color: [SEQUENTIAL_BLUE],
  textStyle: CHART_TEXT_STYLE,
  grid: CHART_GRID,
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: props.buckets.map((b) => `${b.range} dias`),
    axisLabel: { color: CHART_INK.muted },
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
      type: 'bar',
      data: props.buckets.map((b) => b.customers_count),
      barMaxWidth: 40,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
  ],
}))
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Tempo até a recompra</h3>
    <p class="mt-0.5 text-xs text-slate-400">
      Intervalos entre pedidos consecutivos de cada cliente, histórico completo — cada intervalo conta como um ponto independente.
    </p>
    <div class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
      <div class="shrink-0 sm:w-32">
        <p class="text-2xl font-bold leading-tight text-slate-900">{{ medianLabel }}</p>
        <p class="mt-1 text-xs text-slate-500">Mediana</p>
        <p class="mt-1 text-[11px] text-slate-400">Baseado em {{ sampleSize }} intervalo(s) de recompra.</p>
      </div>
      <div class="min-w-0 flex-1">
        <div v-if="sampleSize === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
          Sem dados no período.
        </div>
        <v-chart v-else class="chart-frame w-full" :option="option" autoresize />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* See RevenueChart.vue for why this is a real CSS rule, not a Tailwind h-* utility. */
.chart-frame {
  height: 220px;
  width: 100%;
}
</style>
