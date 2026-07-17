<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_GRID, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  freightMargin: { type: Object, default: () => ({}) },
})

const CHARGED_COLOR = CATEGORICAL_COLORS[0] // blue
const COST_COLOR = CATEGORICAL_COLORS[2] // amber
const MARGIN_COLOR = CATEGORICAL_COLORS[5] // red

// The API keeps these labels source-neutral: Yampi-compatible shipments use
// carrier cost synced via LucroFrete/Melhor Envio, while TikTok uses the
// platform logistics cost from payment.original_shipping_fee.

const available = computed(() => props.freightMargin.available === true)
const orderCount = computed(() => Number(props.freightMargin.order_count || 0))
const marginValue = computed(() => Number(props.freightMargin.margin_value || 0))
const marginPercent = computed(() =>
  props.freightMargin.margin_percent == null ? null : Number(props.freightMargin.margin_percent),
)
const negativeMargin = computed(() => marginValue.value < 0)

const dailySeries = computed(() => props.freightMargin.daily_series || [])
const hasDailyData = computed(() =>
  dailySeries.value.some((d) => Number(d.freight_charged || 0) > 0 || Number(d.freight_cost || 0) > 0),
)

// ISO date sliced by hand — new Date('YYYY-MM-DD') parses as UTC and can
// shift the day when displayed in local time.
function shortDate(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

const dailyOption = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  grid: { ...CHART_GRID, right: 8 },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (value) => formatMoney(value),
  },
  legend: {
    top: 0,
    left: 0,
    itemWidth: 12,
    itemHeight: 8,
    textStyle: { color: CHART_INK.secondary },
  },
  xAxis: {
    type: 'category',
    data: dailySeries.value.map((d) => shortDate(d.date)),
    axisLabel: { color: CHART_INK.muted },
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
      name: 'Frete cobrado',
      type: 'bar',
      data: dailySeries.value.map((d) => Number(d.freight_charged || 0)),
      itemStyle: { color: CHARGED_COLOR, borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 16,
    },
    {
      name: 'Custo real',
      type: 'bar',
      data: dailySeries.value.map((d) => Number(d.freight_cost || 0)),
      itemStyle: { color: COST_COLOR, borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 16,
    },
    {
      name: 'Margem',
      type: 'line',
      data: dailySeries.value.map((d) => Number(d.margin_value || 0)),
      itemStyle: { color: MARGIN_COLOR },
      lineStyle: { color: MARGIN_COLOR, width: 2 },
      symbolSize: 5,
    },
  ],
}))
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Margem de frete</h3>
        <p class="mt-0.5 text-xs text-slate-400">Pedidos reais · custo real x frete cobrado</p>
      </div>
      <div class="text-right text-xs text-slate-500">
        <p class="font-semibold" :class="negativeMargin ? 'text-red-600' : 'text-slate-900'">
          {{ formatMoney(marginValue) }}
        </p>
        <p>{{ orderCount }} pedidos no período</p>
      </div>
    </div>

    <div v-if="!available" class="empty-frame mt-4 flex items-center justify-center text-center text-sm text-slate-400">
      Dados de margem de frete ainda não disponíveis para este ambiente.
    </div>
    <div v-else-if="orderCount === 0 && !hasDailyData" class="empty-frame mt-4 flex items-center justify-center text-center text-sm text-slate-400">
      Nenhum dado de frete sincronizado no período.
    </div>
    <template v-else>
      <div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">Frete cobrado</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatMoney(freightMargin.freight_charged) }}</p>
          <p class="mt-0.5 text-xs text-slate-400">do cliente</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">Custo real</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatMoney(freightMargin.freight_cost) }}</p>
          <p class="mt-0.5 text-xs text-slate-400">pago à transportadora</p>
        </div>
        <div class="rounded-lg p-3" :class="negativeMargin ? 'bg-red-50' : 'bg-emerald-50'">
          <p class="text-xs" :class="negativeMargin ? 'text-red-700' : 'text-emerald-700'">Margem</p>
          <p class="mt-1 text-lg font-semibold" :class="negativeMargin ? 'text-red-700' : 'text-emerald-900'">
            {{ formatMoney(marginValue) }}
          </p>
          <p class="mt-0.5 text-xs" :class="negativeMargin ? 'text-red-600' : 'text-emerald-700'">
            {{ negativeMargin ? 'subsídio de frete' : 'cobrado acima do custo' }}
          </p>
        </div>
        <div class="rounded-lg p-3" :class="negativeMargin ? 'bg-red-50' : 'bg-slate-50'">
          <p class="text-xs" :class="negativeMargin ? 'text-red-700' : 'text-slate-500'">Margem %</p>
          <p class="mt-1 text-lg font-semibold" :class="negativeMargin ? 'text-red-700' : 'text-slate-900'">
            {{ marginPercent == null ? '—' : formatPct(marginPercent) }}
          </p>
          <p class="mt-0.5 text-xs" :class="negativeMargin ? 'text-red-600' : 'text-slate-400'">margem / frete cobrado</p>
        </div>
      </div>

      <div v-if="hasDailyData" class="mt-5 border-t border-slate-100 pt-4">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Evolução diária</h4>
        <p class="mt-0.5 text-xs text-slate-400">Frete cobrado x custo real x margem por dia</p>
        <v-chart class="mt-2 w-full" style="height: 240px" :option="dailyOption" autoresize />
      </div>
    </template>
  </div>
</template>

<style scoped>
.empty-frame {
  height: 160px;
  width: 100%;
}
</style>
