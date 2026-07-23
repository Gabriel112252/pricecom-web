<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney, formatMoneyOrDash, formatPct } from '@/lib/format'

const props = defineProps({
  channels: { type: Array, default: () => [] },
})

const entries = computed(() =>
  [...props.channels].sort((a, b) => Number(a.net_revenue || 0) - Number(b.net_revenue || 0)),
)

const option = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  grid: { left: 8, right: 54, top: 8, bottom: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
  tooltip: {
    trigger: 'item',
    formatter(params) {
      const row = params.data?.payload || {}
      const lines = [
        `<strong>${row.channel}</strong>`,
        `Receita efetiva: ${formatMoney(row.net_revenue)}`,
        `Pedidos: ${Number(row.orders_count || 0)}`,
        `Ticket médio: ${formatMoneyOrDash(row.average_ticket)}`,
        `Participação: ${formatPct(row.share_percentage)}`,
      ]
      // TikTok Shop só carrega tiktok_coverage_percentage — mostra a
      // cobertura pra deixar claro que o valor pode crescer conforme o
      // backfill financeiro avança, nunca comparado como definitivo.
      if (row.tiktok_coverage_percentage !== null && row.tiktok_coverage_percentage !== undefined) {
        lines.push(`${formatPct(row.tiktok_coverage_percentage)} de cobertura financeira`)
      }
      return lines.join('<br />')
    },
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatCompactMoney(v) },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  yAxis: {
    type: 'category',
    data: entries.value.map((row) => row.channel),
    axisLabel: { color: CHART_INK.secondary },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      data: entries.value.map((row, i) => ({
        value: row.net_revenue,
        payload: row,
        itemStyle: { color: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length], borderRadius: [0, 4, 4, 0] },
      })),
      barMaxWidth: 24,
      label: {
        show: true,
        position: 'right',
        color: CHART_INK.secondary,
        formatter: (params) => {
          const coverage = params.data?.payload?.tiktok_coverage_percentage
          const money = formatCompactMoney(params.value)
          return coverage != null && coverage < 100 ? `${money} · ${coverage.toFixed(1)}% cobertura` : money
        },
      },
    },
  ],
}))
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Vendas por canal</h3>
    <p class="mt-0.5 text-xs text-slate-400">Receita efetiva por origem</p>
    <div v-if="entries.length === 0" class="chart-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <v-chart v-else class="mt-2 w-full" :style="{ height: `${Math.max(entries.length * 42, 180)}px` }" :option="option" autoresize />
  </div>
</template>

<style scoped>
.chart-frame {
  height: 280px;
  width: 100%;
}
</style>
