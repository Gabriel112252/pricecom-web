<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/lib/api'
import { CATEGORICAL_COLORS, CHART_GRID, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatBucketLabel, formatCompactMoney, formatMoney, formatPct } from '@/lib/format'
import ExecutiveKpiCard from './ExecutiveKpiCard.vue'
import InlineAlertBanner from './InlineAlertBanner.vue'

const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
})

// v1 só suporta Yampi (único canal com customer_email persistido — ver
// Dashboard::BuildCustomers). TikTok Shop fica no seletor mas não é
// html-disabled: selecioná-lo dispara a mesma chamada, o backend responde
// supported:false + motivo, e a UI mostra esse motivo em vez de forçar um
// botão morto sem explicação acessível.
const CHANNELS = [
  { key: 'yampi', label: 'Yampi' },
  { key: 'tiktok', label: 'TikTok Shop (em breve)' },
]

const activeChannel = ref('yampi')
const loading = ref(false)
const errorMessage = ref('')
const data = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data: response } = await api.get('/dashboard/customers', {
      params: { from: props.from, to: props.to, channel: activeChannel.value },
    })
    data.value = response
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar os dados de clientes.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.from, props.to, activeChannel.value], load)
onMounted(load)

const supported = computed(() => data.value?.supported === true)

const repeatRate = computed(() => data.value?.repeat_purchase_rate || null)
const repeatRateValue = computed(() => {
  const pct = repeatRate.value?.value_pct
  return pct === null || pct === undefined ? '—' : formatPct(pct)
})
const repeatRateDetail = computed(() => {
  if (!repeatRate.value) return ''
  return `${repeatRate.value.repeat_customers}/${repeatRate.value.total_customers} clientes com 2+ pedidos no período`
})
const ordersWithoutEmailNote = computed(() => {
  const count = repeatRate.value?.orders_without_customer_email_count
  if (!count) return ''
  return `${count} pedido(s) do período sem e-mail capturado — fora do cálculo.`
})

const granularity = computed(() => data.value?.granularity || 'day')
const timeline = computed(() => data.value?.revenue_by_customer_type?.timeline || [])
const hasUnknownRevenue = computed(() => timeline.value.some((row) => Number(row.unknown_customer_revenue || 0) > 0))

const revenueChartOption = computed(() => {
  const series = [
    {
      name: 'Novos',
      type: 'bar',
      stack: 'revenue',
      data: timeline.value.map((row) => row.new_customer_revenue),
      itemStyle: { color: CATEGORICAL_COLORS[0] },
      barMaxWidth: 28,
    },
    {
      name: 'Recorrentes',
      type: 'bar',
      stack: 'revenue',
      data: timeline.value.map((row) => row.returning_customer_revenue),
      itemStyle: { color: CATEGORICAL_COLORS[1], borderRadius: hasUnknownRevenue.value ? 0 : [4, 4, 0, 0] },
      barMaxWidth: 28,
    },
  ]

  if (hasUnknownRevenue.value) {
    series.push({
      name: 'Sem e-mail',
      type: 'bar',
      stack: 'revenue',
      data: timeline.value.map((row) => row.unknown_customer_revenue),
      itemStyle: { color: CHART_INK.muted, borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 28,
    })
  }

  return {
    textStyle: CHART_TEXT_STYLE,
    grid: CHART_GRID,
    legend: { top: 0, right: 0, itemWidth: 14, itemHeight: 8, textStyle: CHART_TEXT_STYLE },
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const row = timeline.value[params[0]?.dataIndex] || {}
        const lines = [
          `<strong>${formatBucketLabel(row.date, granularity.value)}</strong>`,
          `Novos: ${formatMoney(row.new_customer_revenue)}`,
          `Recorrentes: ${formatMoney(row.returning_customer_revenue)}`,
        ]
        if (hasUnknownRevenue.value) lines.push(`Sem e-mail: ${formatMoney(row.unknown_customer_revenue)}`)
        return lines.join('<br />')
      },
    },
    xAxis: {
      type: 'category',
      data: timeline.value.map((row) => formatBucketLabel(row.date, granularity.value)),
      axisLabel: { color: CHART_INK.muted },
      axisLine: { lineStyle: { color: CHART_INK.grid } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: CHART_INK.muted, formatter: (value) => formatCompactMoney(value) },
      splitLine: { lineStyle: { color: CHART_INK.grid } },
    },
    series,
  }
})

const rfmSegments = computed(() => data.value?.rfm_segments || [])
</script>

<template>
  <section class="space-y-6">
    <div class="relative isolate overflow-hidden border-b border-slate-200">
      <nav class="flex gap-1">
        <button
          v-for="channel in CHANNELS"
          :key="channel.key"
          type="button"
          class="border-b-2 px-4 py-2 text-sm font-medium transition"
          :class="
            activeChannel === channel.key
              ? 'border-indigo-500 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          "
          @click="activeChannel = channel.key"
        >
          {{ channel.label }}
        </button>
      </nav>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <InlineAlertBanner
      v-else-if="data && !supported"
      tone="neutral"
      title="Canal ainda não suportado"
      :detail="data.unsupported_reason"
    />

    <template v-else-if="supported">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <ExecutiveKpiCard
          class="sm:col-span-1"
          label="Taxa de recompra"
          :value="repeatRateValue"
          :delta-pct="repeatRate?.vs_previous_pct ?? null"
          :detail="repeatRateDetail"
          :note="ordersWithoutEmailNote"
        />
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Receita: clientes novos vs recorrentes</h3>
        <p class="mt-0.5 text-xs text-slate-400">
          "Novo" considera o histórico completo do cliente, não só o período selecionado.
        </p>
        <div v-if="timeline.length === 0" class="empty-frame flex items-center justify-center text-sm text-slate-400">
          Sem dados no período.
        </div>
        <v-chart v-else class="mt-3 h-72 w-full" :option="revenueChartOption" autoresize />
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Segmentação RFM</h3>
        <p class="mt-0.5 text-xs text-slate-400">
          Recência, frequência e valor monetário sobre o histórico completo do cliente. Ordenado por receita total.
        </p>

        <div v-if="rfmSegments.length === 0" class="empty-frame flex items-center justify-center text-sm text-slate-400">
          Sem dados no período.
        </div>
        <table v-else class="mt-3 w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="pb-2 pr-2">Segmento</th>
              <th class="pb-2 pr-2 text-right">Clientes</th>
              <th class="pb-2 pr-2 text-right">% da base</th>
              <th class="pb-2 pr-2 text-right">Receita total</th>
              <th class="pb-2 text-right">Ticket médio</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rfmSegments" :key="row.segment">
              <td class="py-2 pr-2 text-slate-800">{{ row.segment }}</td>
              <td class="py-2 pr-2 text-right tabular-nums text-slate-500">{{ row.customers_count }}</td>
              <td class="py-2 pr-2 text-right tabular-nums text-slate-500">{{ formatPct(row.pct_of_base) }}</td>
              <td class="py-2 pr-2 text-right font-medium tabular-nums text-slate-900">{{ formatMoney(row.total_revenue) }}</td>
              <td class="py-2 text-right tabular-nums text-slate-500">{{ formatMoney(row.avg_order_value) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<style scoped>
.empty-frame {
  height: 160px;
}
</style>
