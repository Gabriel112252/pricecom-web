<script setup>
import { computed } from 'vue'
import { SEQUENTIAL_BLUE, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney } from '@/lib/format'

const props = defineProps({
  products: { type: Array, default: () => [] },
})

// Backend already orders desc by revenue (top 10); reverse for the chart
// since echarts renders category index 0 at the bottom of a horizontal bar.
const entries = computed(() => [...props.products].reverse())

const option = computed(() => ({
  color: [SEQUENTIAL_BLUE],
  textStyle: CHART_TEXT_STYLE,
  grid: { left: 8, right: 56, top: 8, bottom: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
  tooltip: {
    trigger: 'item',
    confine: true,
    formatter: (params) => `${params.name}<br/>${formatMoney(params.value)}`,
    // Barras horizontais empilhadas de perto (barMaxWidth: 20) — a posição
    // padrão do tooltip perto do cursor cobria a barra vizinha. Desloca pra
    // direita do cursor e detecta a borda do gráfico pra virar pra
    // esquerda quando não cabe; confine acima já evita vazar do container.
    position(point, params, dom, rect, size) {
      const [x, y] = point
      const [tooltipWidth, tooltipHeight] = size.contentSize
      const [viewWidth, viewHeight] = size.viewSize

      let posX = x + 15
      if (posX + tooltipWidth > viewWidth) posX = x - tooltipWidth - 15

      let posY = y - tooltipHeight / 2
      posY = Math.max(0, Math.min(posY, viewHeight - tooltipHeight))

      return [posX, posY]
    },
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatCompactMoney(v) },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  yAxis: {
    type: 'category',
    data: entries.value.map((p) => p.sku),
    axisLabel: { color: CHART_INK.secondary },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      data: entries.value.map((p) => ({ value: p.revenue, name: p.name })),
      barMaxWidth: 20,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
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
    <h3 class="text-sm font-semibold text-slate-900">Top produtos por receita</h3>
    <p class="mt-0.5 text-xs text-slate-400">Top 10 por receita bruta no período</p>
    <div v-if="entries.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="mt-2 w-full" :style="{ height: `${Math.max(entries.length * 32, 160)}px` }" :option="option" autoresize />
  </div>
</template>

<style scoped>
/* See RevenueChart.vue for why this is a real CSS rule, not a Tailwind h-* utility. */
.chart-frame {
  height: 200px;
  width: 100%;
}
</style>
