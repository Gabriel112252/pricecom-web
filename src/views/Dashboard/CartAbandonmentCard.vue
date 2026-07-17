<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_GRID, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  cartAbandonment: { type: Object, default: () => ({}) },
})

const ABANDONED_COLOR = CATEGORICAL_COLORS[0] // blue
const RECOVERED_COLOR = CATEGORICAL_COLORS[3] // green

const available = computed(() => props.cartAbandonment.available === true)
const totalCount = computed(() => Number(props.cartAbandonment.total_count || 0))
const recovered = computed(() => props.cartAbandonment.recovered || {})
const stillAbandoned = computed(() => props.cartAbandonment.still_abandoned || {})

// "tiktok_unpaid" quando o filtro de canal do dashboard está em TikTok
// Shop: a fonte vira pedido UNPAID (proxy — TikTok não expõe carrinho
// pré-checkout), então subtítulo e rótulos falam de pedidos, não carrinhos.
const tiktokMode = computed(() => props.cartAbandonment.mode === 'tiktok_unpaid')
const subtitle = computed(() =>
  tiktokMode.value
    ? 'Pedidos não pagos · TikTok não disponibiliza carrinho pré-checkout'
    : 'Checkout Yampi · carrinhos no período',
)
const unitLabel = computed(() => (tiktokMode.value ? 'pedidos' : 'carrinhos'))
const stillAbandonedLabel = computed(() =>
  tiktokMode.value ? 'pedidos ainda não pagos' : 'carrinhos ainda abandonados',
)

const compositionEntries = computed(() =>
  (props.cartAbandonment.discount_composition || []).filter((row) => Number(row.amount || 0) > 0),
)
const compositionTotal = computed(() =>
  compositionEntries.value.reduce((sum, row) => sum + Number(row.amount || 0), 0),
)

function compositionPercent(row) {
  if (compositionTotal.value <= 0) return 0
  return Math.min(100, (Number(row.amount || 0) / compositionTotal.value) * 100)
}

function compositionColor(index) {
  return CATEGORICAL_COLORS[(index + 1) % CATEGORICAL_COLORS.length]
}

const dailySeries = computed(() => props.cartAbandonment.daily_series || [])
const hasDailyData = computed(() =>
  dailySeries.value.some((d) => Number(d.abandoned_count || 0) > 0 || Number(d.recovered_count || 0) > 0),
)

// ISO date sliced by hand — new Date('YYYY-MM-DD') parses as UTC and can
// shift the day when displayed in local time.
function shortDate(iso) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

const dailyOption = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  grid: { ...CHART_GRID, right: 8 },
  tooltip: { trigger: 'axis' },
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
    minInterval: 1,
    axisLabel: { color: CHART_INK.muted },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  series: [
    {
      name: 'Abandonados',
      type: 'bar',
      data: dailySeries.value.map((d) => Number(d.abandoned_count || 0)),
      itemStyle: { color: ABANDONED_COLOR, borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 16,
    },
    {
      name: 'Recuperados',
      type: 'bar',
      data: dailySeries.value.map((d) => Number(d.recovered_count || 0)),
      itemStyle: { color: RECOVERED_COLOR, borderRadius: [3, 3, 0, 0] },
      barMaxWidth: 16,
    },
  ],
}))

const topProducts = computed(() => props.cartAbandonment.top_abandoned_products || [])
const topProductsMax = computed(() =>
  topProducts.value.reduce((max, row) => Math.max(max, Number(row.carts_count || 0)), 0),
)

function productPercent(row) {
  if (topProductsMax.value <= 0) return 0
  return Math.min(100, (Number(row.carts_count || 0) / topProductsMax.value) * 100)
}
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Carrinho abandonado</h3>
        <p class="mt-0.5 text-xs text-slate-400">{{ subtitle }}</p>
      </div>
      <div class="text-right text-xs text-slate-500">
        <p class="font-semibold text-slate-900">{{ formatMoney(stillAbandoned.value) }}</p>
        <p>{{ stillAbandoned.count || 0 }} {{ stillAbandonedLabel }}</p>
      </div>
    </div>

    <div v-if="!available" class="empty-frame mt-4 flex items-center justify-center text-center text-sm text-slate-400">
      Dados de carrinho abandonado ainda não disponíveis para este ambiente.
    </div>
    <div v-else-if="totalCount === 0" class="empty-frame mt-4 flex items-center justify-center text-center text-sm text-slate-400">
      {{ tiktokMode ? 'Nenhum pedido não pago no período.' : 'Nenhum carrinho registrado no período.' }}
    </div>
    <template v-else>
      <div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="rounded-lg bg-emerald-50 p-3">
          <p class="text-xs text-emerald-700">Recuperados</p>
          <p class="mt-1 text-lg font-semibold text-emerald-900">{{ recovered.count || 0 }}</p>
          <p class="mt-0.5 text-xs text-emerald-700">{{ formatMoney(recovered.value) }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">{{ tiktokMode ? 'Ainda não pagos' : 'Ainda abandonados' }}</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ stillAbandoned.count || 0 }}</p>
          <p class="mt-0.5 text-xs text-slate-400">{{ formatMoney(stillAbandoned.value) }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">Taxa de conversão</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatPct(cartAbandonment.conversion_rate_pct) }}</p>
          <p class="mt-0.5 text-xs text-slate-400">{{ recovered.count || 0 }} de {{ totalCount }} convertidos</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">Ticket médio abandonado</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatMoney(cartAbandonment.abandoned_avg_ticket) }}</p>
          <p class="mt-0.5 text-xs text-slate-400">{{ tiktokMode ? 'média do valor do pedido' : 'média de Cart.total' }}</p>
        </div>
      </div>

      <div v-if="hasDailyData" class="mt-5 border-t border-slate-100 pt-4">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Evolução diária</h4>
        <p class="mt-0.5 text-xs text-slate-400">Abandonados x recuperados por dia no período</p>
        <v-chart class="mt-2 w-full" style="height: 220px" :option="dailyOption" autoresize />
      </div>

      <div class="mt-5 border-t border-slate-100 pt-4">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Composição dos descontos</h4>
        <p class="mt-0.5 text-xs text-slate-400">Outros (pagamento/cupom), progressivo, combos e frete nos carrinhos do período</p>

        <p v-if="!compositionEntries.length" class="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Nenhum desconto aplicado nos carrinhos do período.
        </p>
        <div v-else class="mt-3 space-y-3">
          <div v-for="(row, index) in compositionEntries" :key="row.key" class="space-y-1.5">
            <div class="flex items-center justify-between gap-3 text-sm">
              <p class="font-medium text-slate-900">{{ row.label }}</p>
              <div class="text-right">
                <span class="font-semibold text-slate-900">{{ formatMoney(row.amount) }}</span>
                <span class="ml-2 text-xs text-slate-400">{{ formatPct(compositionPercent(row)) }}</span>
              </div>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full"
                :style="{ width: `${Math.max(compositionPercent(row), 2)}%`, backgroundColor: compositionColor(index) }"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="topProducts.length" class="mt-5 border-t border-slate-100 pt-4">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Top produtos abandonados</h4>
        <p class="mt-0.5 text-xs text-slate-400">
          {{ tiktokMode ? 'Produtos mais presentes nos pedidos ainda não pagos' : 'Produtos mais presentes nos carrinhos ainda abandonados' }}
        </p>
        <div class="mt-3 max-h-[400px] space-y-3 overflow-y-auto pr-1">
          <div v-for="row in topProducts" :key="row.sku || row.name" class="space-y-1.5">
            <div class="flex items-start justify-between gap-3 text-sm">
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-900" :title="row.name">{{ row.name }}</p>
                <p class="mt-0.5 text-xs text-slate-400"><template v-if="row.sku">{{ row.sku }} · </template>{{ row.total_qty || 0 }} unidade(s)</p>
              </div>
              <p class="shrink-0 font-semibold text-slate-900">{{ row.carts_count || 0 }} {{ unitLabel }}</p>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full"
                :style="{ width: `${Math.max(productPercent(row), 2)}%`, backgroundColor: ABANDONED_COLOR }"
              />
            </div>
          </div>
        </div>
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
