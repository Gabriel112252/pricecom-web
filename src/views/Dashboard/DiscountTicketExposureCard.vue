<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatMoney, formatPct } from '@/lib/format'

// Exposição < 85% = produto ainda vende parte relevante sem desconto.
// É sinal comercial, não erro — por isso âmbar (warning), nunca vermelho.
const LOW_EXPOSURE_THRESHOLD = 85

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  // product_discount_exposure do payload: contagem de PEDIDOS com o produto
  // (não valor rateado por item — Yampi só expõe desconto por pedido).
  products: { type: Array, default: () => [] },
})

const hasData = computed(
  () => Number(props.summary.total_orders_count || 0) > 0 || props.products.length > 0,
)

// echarts renderiza o eixo de categoria de baixo pra cima — ordena
// ascendente pra maior contagem ficar no topo.
const chartEntries = computed(() =>
  [...props.products].sort(
    (a, b) => Number(a.discounted_orders_count || 0) - Number(b.discounted_orders_count || 0),
  ),
)

function isLowExposure(row) {
  return Number(row.exposure_pct || 0) < LOW_EXPOSURE_THRESHOLD
}

const option = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  grid: { left: 8, right: 72, top: 8, bottom: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
  tooltip: {
    trigger: 'item',
    formatter(params) {
      const row = params.data?.payload || {}
      return [
        `<strong>${row.name}</strong>`,
        `Pedidos com desconto: ${Number(row.discounted_orders_count || 0)}`,
        `Total de pedidos com o produto: ${Number(row.total_orders_count || 0)}`,
        `Exposição a desconto: ${formatPct(row.exposure_pct)}`,
      ].join('<br />')
    },
  },
  xAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  yAxis: {
    type: 'category',
    data: chartEntries.value.map((row) => row.name),
    axisLabel: { color: CHART_INK.secondary, width: 140, overflow: 'truncate' },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  series: [
    {
      type: 'bar',
      data: chartEntries.value.map((row) => ({
        value: row.discounted_orders_count,
        payload: row,
        itemStyle: { color: CATEGORICAL_COLORS[0], borderRadius: [0, 4, 4, 0] },
      })),
      barMaxWidth: 24,
      label: {
        show: true,
        position: 'right',
        color: CHART_INK.secondary,
        formatter: (params) => {
          const row = params.data?.payload || {}
          return `${params.value} · ${formatPct(row.exposure_pct)}`
        },
      },
    },
  ],
}))
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <h3 class="text-sm font-semibold text-slate-900">Desconto por ticket e exposição de produto</h3>
      <p class="mt-0.5 text-xs text-slate-400">Incidência de desconto nos pedidos e nos produtos mais vendidos</p>
    </div>

    <div v-if="!hasData" class="mt-5 flex h-24 items-center justify-center text-sm text-slate-400">
      Nenhum pedido no período.
    </div>
    <div v-else class="mt-4 space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pedidos com desconto</p>
          <p class="mt-1 text-2xl font-bold leading-tight tabular-nums text-slate-900">
            {{ formatPct(summary.discount_rate_pct) }}
          </p>
          <p class="mt-0.5 text-xs tabular-nums text-slate-500">
            {{ summary.discounted_orders_count ?? 0 }} de {{ summary.total_orders_count ?? 0 }} pedidos
          </p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Desconto médio por pedido</p>
          <p class="mt-1 text-2xl font-bold leading-tight tabular-nums text-slate-900">
            {{ formatMoney(summary.avg_discount_per_order) }}
          </p>
          <p class="mt-0.5 text-xs text-slate-500">entre pedidos com desconto</p>
        </div>
      </div>

      <div v-if="chartEntries.length">
        <v-chart
          class="w-full"
          :style="{ height: `${Math.max(chartEntries.length * 38, 160)}px` }"
          :option="option"
          autoresize
        />
      </div>

      <div v-if="products.length" class="border-t border-slate-100 pt-3">
        <div class="max-h-[280px] overflow-y-auto pr-1">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th class="pb-2 pr-3 font-semibold">Produto</th>
                <th class="pb-2 pr-3 text-right font-semibold">Pedidos c/ desc.</th>
                <th class="pb-2 text-right font-semibold">Exposição</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in products" :key="row.sku || row.name" class="border-t border-slate-100">
                <td class="max-w-0 py-2 pr-3">
                  <p class="truncate font-medium text-slate-900" :title="row.name">{{ row.name }}</p>
                  <p v-if="row.sku" class="mt-0.5 truncate text-xs text-slate-400">{{ row.sku }}</p>
                </td>
                <td class="py-2 pr-3 text-right align-top tabular-nums text-slate-600">
                  {{ row.discounted_orders_count ?? 0 }}
                  <span class="text-slate-400">/ {{ row.total_orders_count ?? 0 }}</span>
                </td>
                <td
                  class="py-2 text-right align-top font-semibold tabular-nums"
                  :class="isLowExposure(row) ? 'text-amber-700' : 'text-slate-900'"
                  :title="isLowExposure(row) ? 'Menos de 85% dos pedidos com este produto tiveram desconto — parte relevante vende sem desconto.' : undefined"
                >
                  {{ formatPct(row.exposure_pct) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-[11px] leading-snug text-slate-400">
          <span class="font-medium text-amber-700">Âmbar</span>: exposição abaixo de 85% — o produto ainda
          vende parte relevante sem desconto. Contagem por pedido; o valor de desconto não é rateado por item.
        </p>
      </div>
    </div>
  </div>
</template>
