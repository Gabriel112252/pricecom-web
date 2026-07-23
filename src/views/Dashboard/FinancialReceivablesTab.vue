<script setup>
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, ChevronUp, RefreshCw } from '@lucide/vue'
import api from '@/lib/api'
import { CATEGORICAL_COLORS, CHART_GRID, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge.vue'

// Do payload de /dashboard/summary (Dashboard::BuildSummary#build_financial),
// não de /dashboard/financial — segue o período PRINCIPAL do dashboard, não
// o filtro de payment_date_from/to desta aba (que projeta recebíveis
// futuros). Por isso fica em bloco separado, com nota própria.
defineProps({
  gatewayFeeAvgPerOrder: { type: Number, default: null },
})

function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const today = new Date()

const loading = ref(false)
const errorMessage = ref('')
const dashboard = ref(null)
const filters = ref({
  financial_source_id: 'all',
  payment_date_from: toISODate(today),
  payment_date_to: toISODate(addDays(today, 30)),
  status: '',
  payment_method: '',
})
const page = ref(1)
const sort = ref('payment_date')
const direction = ref('asc')

const receivables = computed(() => dashboard.value ?? {})
const table = computed(() => receivables.value.table ?? { rows: [], meta: {} })
const gatewayOptions = computed(() => receivables.value.gateway_options ?? [])
// TikTok Shop sai da lista aqui — tem subtab financeira própria agora
// (Financeiro > TikTok Shop). Esta tela é só recebíveis de gateway
// (Pagar.me), então nunca lista provedores desabilitados/sem recebível.
const enabledGateways = computed(() => gatewayOptions.value.filter((option) => !option.disabled))
const statusOptions = computed(() => {
  const options = receivables.value.status_options ?? []
  return [...new Set(['waiting_funds', 'paid', ...options])]
})
const paymentMethodOptions = computed(() => receivables.value.payment_method_options ?? [])

const byPaymentMethod = computed(() => receivables.value.by_payment_method ?? [])
const hasPaymentMethodData = computed(() => byPaymentMethod.value.some((row) => Number(row.receivables_count || 0) > 0))

const paymentMethodChartOption = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  tooltip: {
    trigger: 'item',
    formatter: (params) => `${params.name}<br />${params.data.count} recebíveis · ${formatMoney(params.data.value)} (${params.percent}%)`,
  },
  legend: { bottom: 0, textStyle: CHART_TEXT_STYLE },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: byPaymentMethod.value.map((row, index) => ({
        name: methodLabel(row.payment_method),
        value: row.net_amount,
        count: row.receivables_count,
        itemStyle: { color: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length] },
      })),
    },
  ],
}))

const installmentDistribution = computed(() => receivables.value.installment_distribution ?? [])
const hasInstallmentData = computed(() => installmentDistribution.value.some((row) => Number(row.receivables_count || 0) > 0))

const installmentChartOption = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  grid: { ...CHART_GRID, right: 8 },
  tooltip: {
    trigger: 'axis',
    formatter(params) {
      const row = installmentDistribution.value[params[0]?.dataIndex] || {}
      return `<strong>${row.label}</strong><br />${row.receivables_count || 0} recebíveis · ${formatMoney(row.net_amount)}`
    },
  },
  xAxis: {
    type: 'category',
    data: installmentDistribution.value.map((row) => row.label),
    axisLabel: { color: CHART_INK.muted },
    axisLine: { lineStyle: { color: CHART_INK.grid } },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: CHART_INK.muted, formatter: (value) => formatCompactMoney(value) },
    splitLine: { lineStyle: { color: CHART_INK.grid } },
  },
  series: [
    {
      type: 'bar',
      data: installmentDistribution.value.map((row) => row.net_amount),
      itemStyle: { color: CATEGORICAL_COLORS[0], borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 48,
      // 7-12x costuma ser ordens de grandeza menor que à vista/2-6x — numa
      // escala linear a barra fica visualmente imperceptível. Em vez de
      // log scale (distorce a percepção de magnitude, que aqui é real e
      // relevante), mostra o valor como rótulo, não dependendo só da altura.
      label: {
        show: true,
        position: 'top',
        color: CHART_INK.secondary,
        formatter: (params) => formatMoney(params.value),
      },
    },
  ],
}))

const cashFlowOption = computed(() => {
  const timeline = receivables.value.cash_flow?.timeline ?? []

  return {
    color: [CATEGORICAL_COLORS[3], CATEGORICAL_COLORS[0]],
    textStyle: CHART_TEXT_STYLE,
    grid: { ...CHART_GRID, top: 44, right: 20 },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: CHART_TEXT_STYLE,
    },
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const row = timeline[params[0]?.dataIndex] || {}
        return [
          `<strong>${formatDate(row.date)}</strong>`,
          `Já recebido: ${formatMoney(row.paid_amount)}`,
          `Previsto: ${formatMoney(row.waiting_funds_amount)}`,
          `Total: ${formatMoney(row.total_amount)}`,
        ].join('<br />')
      },
    },
    xAxis: {
      type: 'category',
      data: timeline.map((row) => formatDateShort(row.date)),
      axisLabel: { color: CHART_INK.muted },
      axisLine: { lineStyle: { color: CHART_INK.grid } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: CHART_INK.muted, formatter: (value) => formatCompactMoney(value) },
      splitLine: { lineStyle: { color: CHART_INK.grid } },
    },
    series: [
      {
        name: 'Já recebido',
        type: 'bar',
        stack: 'cash',
        data: timeline.map((row) => row.paid_amount),
        barMaxWidth: 28,
      },
      {
        name: 'Previsto',
        type: 'bar',
        stack: 'cash',
        data: timeline.map((row) => row.waiting_funds_amount),
        barMaxWidth: 28,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
  }
})

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const { data } = await api.get('/dashboard/financial', {
      params: {
        financial_source_id: filters.value.financial_source_id,
        payment_date_from: filters.value.payment_date_from,
        payment_date_to: filters.value.payment_date_to,
        receivable_status: filters.value.status || undefined,
        payment_method: filters.value.payment_method || undefined,
        page: page.value,
        per_page: 10,
        sort: sort.value,
        direction: direction.value,
      },
    })
    dashboard.value = data.receivables_dashboard
    applyDefaultGateway()
  } catch (error) {
    errorMessage.value = error.response?.data?.error || 'Não foi possível carregar os recebíveis.'
  } finally {
    loading.value = false
  }
}

function applyDefaultGateway() {
  if (filters.value.financial_source_id !== 'all' || enabledGateways.value.length !== 1) return

  filters.value.financial_source_id = String(enabledGateways.value[0].financial_source_id)
}

function reloadFromFirstPage() {
  page.value = 1
  load()
}

function selectGateway(option) {
  if (option.disabled) return

  filters.value.financial_source_id = String(option.financial_source_id)
  reloadFromFirstPage()
}

function changeSort(key) {
  if (sort.value === key) {
    direction.value = direction.value === 'asc' ? 'desc' : 'asc'
  } else {
    sort.value = key
    direction.value = 'asc'
  }
  reloadFromFirstPage()
}

function goToPage(nextPage) {
  page.value = nextPage
  load()
}

function sortIcon(key) {
  if (sort.value !== key) return null
  return direction.value === 'asc' ? ChevronUp : ChevronDown
}

function methodLabel(method) {
  const labels = {
    credit_card: 'Cartão de crédito',
    boleto: 'Boleto',
    pix: 'Pix',
    unknown: 'Não informado',
  }
  return labels[method] || method
}

function statusLabel(status) {
  const labels = {
    waiting_funds: 'Previsto',
    paid: 'Já recebido',
    canceled: 'Cancelado',
    suspended: 'Suspenso',
  }
  return labels[status] || status
}

function formatDate(value) {
  if (!value) return '-'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

function formatDateShort(value) {
  if (!value) return '-'
  const [, month, day] = String(value).slice(0, 10).split('-')
  return `${day}/${month}`
}

function linkedOrderLabel(row) {
  return row.order_number || row.order_external_id || '-'
}

onMounted(load)
</script>

<template>
  <section class="space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Recebíveis Yampi via Pagar.me</h2>
      <p class="mt-0.5 text-sm text-slate-500">Fluxo de caixa projetado, taxas, antecipação e conciliação por gateway</p>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="option in enabledGateways"
            :key="option.financial_source_id"
            type="button"
            class="rounded-lg border px-3 py-2 text-sm font-medium transition"
            :class="
              String(option.financial_source_id) === filters.financial_source_id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="selectGateway(option)"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="filters.status"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            @change="reloadFromFirstPage"
          >
            <option value="">Todos os status</option>
            <option v-for="status in statusOptions" :key="status" :value="status">{{ statusLabel(status) }}</option>
          </select>
          <select
            v-model="filters.payment_method"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            @change="reloadFromFirstPage"
          >
            <option value="">Todas as formas</option>
            <option v-for="method in paymentMethodOptions" :key="method" :value="method">{{ methodLabel(method) }}</option>
          </select>
          <input
            v-model="filters.payment_date_from"
            type="date"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            @change="reloadFromFirstPage"
          />
          <input
            v-model="filters.payment_date_to"
            type="date"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
            @change="reloadFromFirstPage"
          />
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            :disabled="loading"
            title="Atualizar recebíveis"
            @click="load"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-semibold text-slate-900">Fluxo de caixa projetado</h3>
            <p class="mt-0.5 text-xs text-slate-400">Pagar.me/Yampi por data de pagamento</p>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            v-for="window in receivables.cash_flow?.windows || []"
            :key="window.label"
            class="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <p class="text-xs font-semibold uppercase text-slate-500">{{ window.label }}</p>
            <p class="mt-1 text-lg font-bold text-slate-900">{{ formatMoney(window.total_amount) }}</p>
            <p class="mt-1 text-xs text-slate-500">
              {{ formatMoney(window.paid_amount) }} recebido · {{ formatMoney(window.waiting_funds_amount) }} previsto
            </p>
          </div>
        </div>
        <div v-if="!receivables.cash_flow?.timeline?.length" class="chart-frame flex items-center justify-center text-sm text-slate-400">
          Sem recebíveis no período.
        </div>
        <v-chart v-else class="chart-frame mt-3 w-full" :option="cashFlowOption" autoresize />
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Taxas e antecipação</h3>
        <div class="mt-4 space-y-4">
          <div>
            <p class="text-xs font-semibold uppercase text-slate-500">Total no período</p>
            <p class="mt-1 text-2xl font-bold text-slate-900">
              {{ formatMoney(receivables.fee_summary?.total_fee_amount) }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg bg-slate-50 p-3">
              <p class="text-xs text-slate-500">MDR</p>
              <p class="mt-1 font-semibold text-slate-900">{{ formatMoney(receivables.fee_summary?.fee_amount) }}</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-3">
              <p class="text-xs text-slate-500">Antecipação</p>
              <p class="mt-1 font-semibold text-slate-900">
                {{ formatMoney(receivables.fee_summary?.anticipation_fee_amount) }}
              </p>
            </div>
          </div>
          <p class="text-xs text-slate-500">{{ receivables.fee_summary?.receivables_count || 0 }} recebíveis filtrados</p>

          <div class="border-t border-slate-100 pt-4">
            <div
              class="rounded-lg bg-slate-50 p-3"
              title="Média do período principal do dashboard (não o filtro de datas acima) sobre pedidos do canal Yampi — não é a taxa de nenhum pedido individual."
            >
              <p class="text-xs text-slate-500">Taxa média por pedido (Yampi)</p>
              <p class="mt-1 font-semibold text-slate-900">
                {{ gatewayFeeAvgPerOrder == null ? '—' : formatMoney(gatewayFeeAvgPerOrder) }}
              </p>
              <p class="mt-1 text-[11px] leading-snug text-slate-400">
                Média do período principal do dashboard, não desta tabela — nunca o valor de um pedido específico.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Recebíveis por forma de pagamento</h3>
        <div class="mt-3 overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr class="text-left text-xs font-semibold uppercase text-slate-500">
                <th class="py-2 pr-3">Forma</th>
                <th class="px-3 py-2 text-right">Recebíveis</th>
                <th class="px-3 py-2 text-right">Parcelas pendentes</th>
                <th class="py-2 pl-3 text-right">Líquido</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!byPaymentMethod.length">
                <td colspan="4" class="py-6 text-center text-slate-400">Sem dados no período.</td>
              </tr>
              <tr v-for="method in byPaymentMethod" :key="method.payment_method">
                <td class="py-2 pr-3 font-medium text-slate-900">{{ methodLabel(method.payment_method) }}</td>
                <td class="px-3 py-2 text-right text-slate-600">{{ method.receivables_count }}</td>
                <td class="px-3 py-2 text-right text-slate-600">{{ method.pending_installments_count }}</td>
                <td class="py-2 pl-3 text-right font-medium text-slate-900">{{ formatMoney(method.net_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Distribuição por forma de pagamento</h3>
        <p class="mt-0.5 text-xs text-slate-400">Recebíveis filtrados · valor líquido</p>
        <div v-if="!hasPaymentMethodData" class="chart-frame-sm flex items-center justify-center text-sm text-slate-400">
          Sem dados no período.
        </div>
        <v-chart v-else class="chart-frame-sm mt-2 w-full" :option="paymentMethodChartOption" autoresize />
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Distribuição por parcelamento</h3>
        <p class="mt-0.5 text-xs text-slate-400">Só cartão de crédito · à vista, 2-6x, 7-12x</p>
        <div v-if="!hasInstallmentData" class="chart-frame-sm flex items-center justify-center text-sm text-slate-400">
          Sem recebíveis de cartão no período.
        </div>
        <v-chart v-else class="chart-frame-sm mt-2 w-full" :option="installmentChartOption" autoresize />
      </div>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h3 class="text-sm font-semibold text-slate-900">Recebíveis detalhados</h3>
          <p class="mt-0.5 text-xs text-slate-400">{{ table.meta.total_count || 0 }} registros</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50">
            <tr class="text-left text-xs font-semibold uppercase text-slate-500">
              <th class="px-4 py-3">Pedido</th>
              <th class="px-4 py-3 text-right">
                <button type="button" class="inline-flex items-center gap-1" @click="changeSort('amount')">
                  Valor bruto
                  <component :is="sortIcon('amount')" v-if="sortIcon('amount')" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th class="px-4 py-3 text-right">
                <button type="button" class="inline-flex items-center gap-1" @click="changeSort('fee_amount')">
                  Taxas
                  <component :is="sortIcon('fee_amount')" v-if="sortIcon('fee_amount')" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th class="px-4 py-3 text-right">
                <button type="button" class="inline-flex items-center gap-1" @click="changeSort('net_amount')">
                  Líquido
                  <component :is="sortIcon('net_amount')" v-if="sortIcon('net_amount')" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th class="px-4 py-3">
                <button type="button" class="inline-flex items-center gap-1" @click="changeSort('payment_date')">
                  Pagamento
                  <component :is="sortIcon('payment_date')" v-if="sortIcon('payment_date')" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th class="px-4 py-3">
                <button type="button" class="inline-flex items-center gap-1" @click="changeSort('payment_method')">
                  Forma
                  <component :is="sortIcon('payment_method')" v-if="sortIcon('payment_method')" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th class="px-4 py-3">
                <button type="button" class="inline-flex items-center gap-1" @click="changeSort('status')">
                  Status
                  <component :is="sortIcon('status')" v-if="sortIcon('status')" class="h-3.5 w-3.5" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading && !table.rows.length">
              <td colspan="7" class="px-4 py-8 text-center text-slate-400">Carregando recebíveis...</td>
            </tr>
            <tr v-else-if="!table.rows.length">
              <td colspan="7" class="px-4 py-8 text-center text-slate-400">Nenhum recebível encontrado.</td>
            </tr>
            <tr v-for="row in table.rows" :key="row.id" class="text-slate-600">
              <td class="px-4 py-3 font-medium text-slate-900">{{ linkedOrderLabel(row) }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatMoney(row.amount) }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatMoney(row.total_fee_amount) }}</td>
              <td class="px-4 py-3 text-right font-medium text-slate-900 whitespace-nowrap">{{ formatMoney(row.net_amount) }}</td>
              <td class="px-4 py-3 whitespace-nowrap">{{ formatDate(row.payment_date) }}</td>
              <td class="px-4 py-3 whitespace-nowrap">
                {{ methodLabel(row.payment_method) }}<span v-if="row.installment"> · {{ row.installment }}ª</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">
                <StatusBadge :status="row.status" :label="statusLabel(row.status)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
          :disabled="(table.meta.current_page || 1) <= 1 || loading"
          @click="goToPage((table.meta.current_page || 1) - 1)"
        >
          Anterior
        </button>
        <span>Página {{ table.meta.current_page || 1 }} de {{ table.meta.total_pages || 1 }}</span>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
          :disabled="(table.meta.current_page || 1) >= (table.meta.total_pages || 1) || loading"
          @click="goToPage((table.meta.current_page || 1) + 1)"
        >
          Próxima
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.chart-frame {
  height: 280px;
  width: 100%;
}

.chart-frame-sm {
  height: 220px;
  width: 100%;
}
</style>
