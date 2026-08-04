<script setup>
import { computed } from 'vue'
import { SEQUENTIAL_BLUE, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'
import { formatBucketLabel, formatPct } from '@/lib/format'

const props = defineProps({
  timeline: { type: Array, default: () => [] }, // [{ bucket, value_pct, total_customers, repeat_customers }]
  granularity: { type: String, default: 'day' },
  valuePct: { type: Number, default: null },
  deltaPct: { type: Number, default: null },
  detail: { type: String, default: '' },
  note: { type: String, default: '' },
})

const valueLabel = computed(() => (props.valuePct === null || props.valuePct === undefined ? '—' : formatPct(props.valuePct)))

function deltaLabel(pct) {
  if (pct === null || pct === undefined) return ''
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

function deltaTone(pct) {
  if (pct === null || pct === undefined) return 'text-slate-400'
  return pct >= 0 ? 'text-emerald-600' : 'text-red-600'
}

const hasData = computed(() => props.timeline.some((row) => row.value_pct !== null && row.value_pct !== undefined))

const option = computed(() => ({
  color: [SEQUENTIAL_BLUE],
  textStyle: CHART_TEXT_STYLE,
  grid: CHART_GRID,
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const row = props.timeline[params[0]?.dataIndex] || {}
      const value = row.value_pct === null || row.value_pct === undefined ? '—' : formatPct(row.value_pct)
      return `<strong>${formatBucketLabel(row.bucket, props.granularity)}</strong><br/>${value} (${row.repeat_customers}/${row.total_customers} clientes)`
    },
  },
  xAxis: {
    type: 'category',
    data: props.timeline.map((row) => row.bucket),
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
      type: 'line',
      data: props.timeline.map((row) => row.value_pct),
      connectNulls: false,
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
  <div class="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">% de clientes que recompram</h3>
        <p class="mt-0.5 text-xs text-slate-400">Clientes com 2+ pedidos no período / clientes com 1+ pedido no período</p>
      </div>
    </div>
    <div class="mt-2 flex items-baseline gap-2">
      <p class="text-2xl font-bold leading-tight text-slate-900">{{ valueLabel }}</p>
      <span v-if="deltaLabel(deltaPct)" class="text-xs font-medium" :class="deltaTone(deltaPct)">{{ deltaLabel(deltaPct) }}</span>
    </div>
    <p class="mt-1 text-xs text-slate-500">{{ detail }}</p>

    <div v-if="!hasData" class="chart-frame mt-3 flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="chart-frame mt-3 w-full" :option="option" autoresize />

    <p v-if="note" class="mt-1.5 text-[11px] leading-snug text-slate-500">{{ note }}</p>
  </div>
</template>

<style scoped>
/* See RevenueChart.vue for why this is a real CSS rule, not a Tailwind h-* utility. */
.chart-frame {
  height: 200px;
  width: 100%;
}
</style>
