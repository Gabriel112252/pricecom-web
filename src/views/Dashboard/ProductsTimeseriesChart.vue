<script setup>
import { ref, computed, watch } from 'vue'
import api from '@/lib/api'
import { CATEGORICAL_COLORS, CHART_INK, CHART_TEXT_STYLE, CHART_GRID } from '@/lib/chartTheme'
import { formatMoney, formatCompactMoney, formatDateShort } from '@/lib/format'

// Complementa os cards de detalhe (total + breakdown por canal) do
// ProductSearch: aqueles respondem "quanto vendi no total", este responde
// "como foi ao longo do tempo" — uma linha por produto selecionado, dia a
// dia, sem pular dia sem venda (o backend já zero-preenche). Funciona bem
// com 1 produto só (uma linha) até o teto prático de seleção do pai.
const props = defineProps({
  skus: { type: Array, default: () => [] },
  from: { type: String, required: true },
  to: { type: String, required: true },
  channelIds: { type: Array, default: () => [] },
})

const metric = ref('revenue') // 'revenue' | 'qty'
const series = ref([])
const loading = ref(false)
const errorMessage = ref('')

function formatQty(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

async function fetchSeries() {
  if (!props.skus.length) {
    series.value = []
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/dashboard/products_timeseries', {
      params: { skus: props.skus, from: props.from, to: props.to, channel_ids: props.channelIds },
    })
    series.value = data.series
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar a evolução dos produtos.'
    series.value = []
  } finally {
    loading.value = false
  }
}

watch(() => [props.skus, props.from, props.to, props.channelIds], fetchSeries, { deep: true, immediate: true })

const dates = computed(() => series.value[0]?.points.map((p) => p.date) ?? [])

const option = computed(() => ({
  color: CATEGORICAL_COLORS,
  textStyle: CHART_TEXT_STYLE,
  grid: CHART_GRID,
  legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 3, textStyle: CHART_TEXT_STYLE },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v) => (metric.value === 'revenue' ? formatMoney(v) : formatQty(v)),
  },
  xAxis: {
    type: 'category',
    data: dates.value,
    axisLabel: { color: CHART_INK.muted, formatter: (v) => formatDateShort(v) },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: CHART_INK.muted,
      formatter: (v) => (metric.value === 'revenue' ? formatCompactMoney(v) : formatQty(v)),
    },
    splitLine: { lineStyle: { color: CHART_INK.grid, type: 'solid' } },
  },
  series: series.value.map((s) => ({
    name: `${s.sku} — ${s.name}`,
    type: 'line',
    data: s.points.map((p) => (metric.value === 'revenue' ? p.revenue : p.qty_sold)),
    lineStyle: { width: 2 },
    showSymbol: true,
    symbolSize: 6,
    itemStyle: { borderWidth: 2, borderColor: '#fff' },
    smooth: false,
  })),
}))
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Evolução dos produtos selecionados</h3>
        <p class="mt-0.5 text-xs text-slate-400">Quantidade ou receita por dia — uma linha por produto.</p>
      </div>
      <div class="flex shrink-0 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
        <button
          type="button"
          class="rounded-md px-2.5 py-1 transition-colors"
          :class="metric === 'qty' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="metric = 'qty'"
        >
          Volume
        </button>
        <button
          type="button"
          class="rounded-md px-2.5 py-1 transition-colors"
          :class="metric === 'revenue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="metric = 'revenue'"
        >
          Receita
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="mt-2 text-sm text-red-600">{{ errorMessage }}</p>

    <div v-if="!skus.length" class="chart-frame mt-2 flex items-center justify-center text-sm text-slate-400">
      Selecione ao menos um produto na busca acima para ver a evolução diária.
    </div>
    <div v-else-if="loading && !series.length" class="chart-frame mt-2 flex items-center justify-center text-sm text-slate-400">
      Carregando...
    </div>
    <v-chart v-else class="chart-frame mt-2 w-full" :option="option" autoresize />
  </div>
</template>

<style scoped>
/* Fixed px height for the same reason as RevenueChart.vue's .chart-frame —
   see that file's comment. */
.chart-frame {
  height: 288px;
  width: 100%;
}
</style>
