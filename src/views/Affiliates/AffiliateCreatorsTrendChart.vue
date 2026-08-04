<script setup>
import { computed } from 'vue'
import { SEQUENTIAL_BLUE, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'
import { formatBucketLabel } from '@/lib/format'

const props = defineProps({
  snapshots: { type: Array, default: () => [] }, // [{ date, active_creators, total_creators }]
})

const option = computed(() => ({
  color: [SEQUENTIAL_BLUE],
  textStyle: CHART_TEXT_STYLE,
  grid: CHART_GRID,
  tooltip: {
    trigger: 'axis',
    formatter(params) {
      const row = props.snapshots[params[0]?.dataIndex] || {}
      return [
        `<strong>${formatBucketLabel(row.date || '', 'day')}</strong>`,
        `Criadores ativos: ${Number(row.active_creators || 0)}`,
        `Total de criadores: ${Number(row.total_creators || 0)}`,
      ].join('<br />')
    },
  },
  xAxis: {
    type: 'category',
    data: props.snapshots.map((s) => s.date),
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatBucketLabel(v, 'day') },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  series: [
    {
      name: 'Criadores ativos',
      type: 'line',
      data: props.snapshots.map((s) => s.active_creators),
      lineStyle: { width: 2 },
      showSymbol: true,
      symbolSize: 6,
      itemStyle: { borderWidth: 2, borderColor: '#fff' },
      areaStyle: { opacity: 0.08 },
    },
  ],
}))
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Evolução de criadores ativos</h3>
    <p class="mt-0.5 text-xs text-slate-400">Baseado nos snapshots diários da sincronização</p>
    <div v-if="snapshots.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados ainda — aguardando o primeiro sync.
    </div>
    <v-chart v-else class="chart-frame mt-2 w-full" :option="option" autoresize />
  </div>
</template>

<style scoped>
.chart-frame {
  height: 240px;
  width: 100%;
}
</style>
