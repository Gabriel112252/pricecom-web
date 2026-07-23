<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS, CHART_GRID, CHART_INK, CHART_TEXT_STYLE } from '@/lib/chartTheme'
import { formatCompactMoney, formatMoney, formatMoneyOrDash, formatPctOrDash } from '@/lib/format'
import { reconciliationPrefix } from './lib/tiktokFinancial'
import ExecutiveKpiCard from './ExecutiveKpiCard.vue'
import TiktokCoverageBanner from './TiktokCoverageBanner.vue'
import TiktokOrdersTable from './TiktokOrdersTable.vue'

const props = defineProps({
  breakdown: { type: Object, default: () => ({}) },
  coverage: { type: Object, default: () => ({}) },
  dailySeries: { type: Array, default: () => [] },
  discountBreakdown: { type: Object, default: () => ({}) },
  granularity: { type: String, default: 'day' },
  from: { type: String, required: true },
  to: { type: String, required: true },
  channelIds: { type: Array, default: () => [] },
})

const available = computed(() => props.discountBreakdown?.available !== false && props.breakdown?.available !== false)
const hasData = computed(() => Number(props.breakdown.orders_count || 0) > 0)

const reconciliation = computed(() => props.breakdown.reconciliation || [])
const feeComposition = computed(() => props.breakdown.fee_composition || [])

// Chart 1 — Resultado financeiro diário
const dailyResultOption = computed(() => {
  const rows = props.dailySeries
  return {
    color: [CATEGORICAL_COLORS[0], CATEGORICAL_COLORS[1], CATEGORICAL_COLORS[3]],
    textStyle: CHART_TEXT_STYLE,
    grid: { ...CHART_GRID, top: 44, right: 20 },
    legend: { top: 0, right: 0, textStyle: CHART_TEXT_STYLE },
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const row = rows[params[0]?.dataIndex] || {}
        return [
          `<strong>${row.date}</strong>`,
          `Receita efetiva: ${formatMoney(row.revenue_amount)}`,
          `Valor liquidado: ${formatMoney(row.settlement_amount)}`,
          `Lucro real: ${formatMoney(row.profit)}`,
        ].join('<br />')
      },
    },
    xAxis: {
      type: 'category',
      data: rows.map((row) => row.date),
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
      { name: 'Receita efetiva', type: 'line', smooth: true, data: rows.map((row) => row.revenue_amount) },
      { name: 'Valor liquidado', type: 'line', smooth: true, data: rows.map((row) => row.settlement_amount) },
      { name: 'Lucro real', type: 'line', smooth: true, data: rows.map((row) => row.profit) },
    ],
  }
})

// Chart 4 — Margem real por dia
const marginTrendOption = computed(() => {
  const rows = props.dailySeries
  return {
    color: [CATEGORICAL_COLORS[4]],
    textStyle: CHART_TEXT_STYLE,
    grid: { ...CHART_GRID, right: 20 },
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        const row = rows[params[0]?.dataIndex] || {}
        return `<strong>${row.date}</strong><br />Margem real: ${row.margin_pct == null ? '—' : `${row.margin_pct.toFixed(2)}%`}`
      },
    },
    xAxis: {
      type: 'category',
      data: rows.map((row) => row.date),
      axisLabel: { color: CHART_INK.muted },
      axisLine: { lineStyle: { color: CHART_INK.grid } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: CHART_INK.muted, formatter: (value) => `${value}%` },
      splitLine: { lineStyle: { color: CHART_INK.grid } },
    },
    series: [{ name: 'Margem real', type: 'line', smooth: true, connectNulls: false, data: rows.map((row) => row.margin_pct) }],
  }
})

// Chart 2 — Composição de taxas
const feeCompositionOption = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  tooltip: {
    trigger: 'item',
    formatter: (params) => `${params.name}<br />${formatMoney(params.value)} (${params.percent}%) · ${params.data.ordersCount ?? 0} pedidos`,
  },
  legend: { bottom: 0, textStyle: CHART_TEXT_STYLE },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: feeComposition.value
        .filter((row) => Number(row.amount) > 0)
        .map((row, index) => ({
          name: row.label,
          value: row.amount,
          ordersCount: row.orders_count,
          itemStyle: { color: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length] },
        })),
    },
  ],
}))

// Chart 3 — Descontos e incentivos
const discountChartRows = computed(() => [
  { key: 'seller_discount', label: 'Desconto vendedor', amount: Number(props.discountBreakdown.seller_discount_total || 0) },
  { key: 'platform_subsidy', label: 'Subsídio TikTok', amount: Number(props.discountBreakdown.platform_subsidy_total || 0) },
  {
    key: 'shipping_subsidy',
    label: 'Frete subsidiado',
    amount:
      Number(props.discountBreakdown.seller_shipping_subsidy_total || 0) +
      Number(props.discountBreakdown.platform_shipping_subsidy_total || 0),
  },
])

const discountChartOption = computed(() => ({
  textStyle: CHART_TEXT_STYLE,
  tooltip: {
    trigger: 'item',
    formatter: (params) => `${params.name}<br />${formatMoney(params.value)} (${params.percent}%)`,
  },
  legend: { bottom: 0, textStyle: CHART_TEXT_STYLE },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: discountChartRows.value
        .filter((row) => row.amount > 0)
        .map((row, index) => ({
          name: row.label,
          value: row.amount,
          itemStyle: { color: CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length] },
        })),
    },
  ],
}))

const hasDiscountData = computed(() => discountChartRows.value.some((row) => row.amount > 0))
const hasFeeData = computed(() => feeComposition.value.some((row) => Number(row.amount) > 0))

// Linhas de dedução mostram o valor absoluto (o prefixo "(-)" já indica o
// sinal); a primeira linha e os subtotais mostram o valor tal como veio do
// backend (pode ser negativo de verdade, ex.: lucro real prejuízo).
function reconciliationAmount(row) {
  if (row.subtotal || row.key === 'effective_revenue') return row.amount
  return Math.abs(row.amount)
}
</script>

<template>
  <section class="space-y-5">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Financeiro TikTok Shop</h2>
      <p class="mt-0.5 text-sm text-slate-500">Vendas, incentivos, taxas, liquidações, custos e resultado real</p>
    </div>

    <TiktokCoverageBanner :coverage="coverage" />

    <div v-if="!available" class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
      Dados financeiros da TikTok Shop indisponíveis para o filtro de canal atual.
    </div>
    <div v-else-if="!hasData" class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
      Nenhum pedido TikTok Shop no período selecionado.
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ExecutiveKpiCard
          label="Preço de referência"
          :value="formatMoney(discountBreakdown.reference_price_total)"
          tooltip="Valor do produto antes dos descontos comerciais (gross_value)."
        />
        <ExecutiveKpiCard
          label="Receita efetiva"
          :value="formatMoney(breakdown.revenue_amount_total)"
          tooltip="Receita reconhecida para o vendedor antes das taxas (revenue_amount)."
        />
        <ExecutiveKpiCard
          label="Pago pelos clientes"
          :value="formatMoney(discountBreakdown.buyer_paid_product_total)"
          tooltip="Valor efetivamente pago pelo cliente pelo produto."
        />
        <ExecutiveKpiCard
          label="Subsídio TikTok"
          :value="formatMoney(discountBreakdown.platform_subsidy_total)"
          tooltip="Desconto de produto bancado pela plataforma — não é prejuízo do vendedor."
        />
        <ExecutiveKpiCard
          label="Desconto do vendedor"
          :value="formatMoney(discountBreakdown.seller_discount_total)"
          tooltip="Desconto de produto realmente bancado pelo seller."
        />
        <ExecutiveKpiCard
          label="Taxas e comissões"
          :value="formatMoney(breakdown.fee_and_tax_amount_total)"
          tooltip="Total de cobranças realizadas pela TikTok (fee_and_tax_amount)."
        />
        <ExecutiveKpiCard
          label="Valor liquidado"
          :value="formatMoney(breakdown.settlement_amount_total)"
          tooltip="settlement_amount — fonte oficial, já líquido das cobranças da TikTok."
        />
        <ExecutiveKpiCard
          label="Custo dos produtos"
          :value="formatMoney(breakdown.product_cost_total)"
          tooltip="Custo dos itens vendidos, vindo da IDWorks."
        />
        <ExecutiveKpiCard
          label="Lucro real"
          :value="formatMoneyOrDash(breakdown.real_profit_total)"
          :status="!breakdown.real_profit_available ? 'warning' : 'default'"
          tooltip="Valor liquidado - custo dos produtos. Indisponível quando o custo do pedido está incompleto."
        />
        <ExecutiveKpiCard
          label="Margem real"
          :value="formatPctOrDash(breakdown.real_margin_pct)"
          :status="!breakdown.real_profit_available ? 'warning' : 'default'"
          tooltip="Lucro real dividido pela receita efetiva. '—' quando a receita efetiva é zero (ex.: pedido estornado)."
        />
      </div>

      <!-- Gadget: Reconciliação TikTok -->
      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Reconciliação TikTok</h3>
        <p class="mt-0.5 text-xs text-slate-400">Caminho da receita efetiva até o lucro real — números agregados pelo backend</p>
        <div class="mt-4 divide-y divide-slate-100 text-sm">
          <div
            v-for="row in reconciliation"
            :key="row.key"
            class="flex items-center justify-between py-2"
            :class="row.subtotal ? 'font-semibold text-slate-900' : 'text-slate-600'"
          >
            <span>{{ reconciliationPrefix(row) }} {{ row.label }}</span>
            <span :class="{ 'text-red-600': !row.subtotal && row.amount < 0 }">
              {{ formatMoney(reconciliationAmount(row)) }}
            </span>
          </div>
        </div>
        <p class="mt-3 text-[11px] leading-snug text-slate-400">
          "Outros ajustes" cobre estornos parciais, chargebacks e ajustes que a TikTok não detalha nos campos de taxa — nunca
          somado a outra categoria.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <!-- Gadget: Taxas e comissões TikTok -->
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-900">Taxas e comissões TikTok</h3>
          <p class="mt-0.5 text-xs text-slate-400">Comissão de afiliado sempre separada da comissão da plataforma</p>
          <div v-if="!hasFeeData" class="chart-frame-sm flex items-center justify-center text-sm text-slate-400">
            Sem taxas no período.
          </div>
          <template v-else>
            <v-chart class="chart-frame-sm mt-2 w-full" :option="feeCompositionOption" autoresize />
            <div class="mt-3 space-y-1.5 text-sm">
              <div v-for="row in feeComposition" :key="row.key" class="flex items-center justify-between">
                <span class="text-slate-600">{{ row.label }}</span>
                <span class="tabular-nums text-slate-900">
                  {{ formatMoney(row.amount) }}
                  <span class="text-xs text-slate-400">({{ formatPctOrDash(row.percentage_of_revenue) }} · {{ row.orders_count }} pedidos)</span>
                </span>
              </div>
            </div>
          </template>
        </div>

        <!-- Gadget: Descontos e incentivos -->
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-900">Descontos e incentivos</h3>
          <p class="mt-0.5 text-xs text-slate-400">Desconto do vendedor nunca somado ao subsídio pago pela TikTok</p>
          <div v-if="!hasDiscountData" class="chart-frame-sm flex items-center justify-center text-sm text-slate-400">
            Sem descontos ou subsídios no período.
          </div>
          <template v-else>
            <v-chart class="chart-frame-sm mt-2 w-full" :option="discountChartOption" autoresize />
            <div class="mt-3 space-y-1.5 text-sm">
              <div v-for="row in discountChartRows" :key="row.key" class="flex items-center justify-between">
                <span class="text-slate-600">{{ row.label }}</span>
                <span class="tabular-nums text-slate-900">{{ formatMoney(row.amount) }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-slate-100 pt-1.5">
                <span class="text-slate-500">Pago pelo cliente</span>
                <span class="tabular-nums font-medium text-slate-900">{{ formatMoney(discountBreakdown.buyer_paid_product_total) }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-900">Resultado financeiro diário</h3>
          <p class="mt-0.5 text-xs text-slate-400">Receita efetiva, valor liquidado e lucro real · só pedidos sincronizados</p>
          <div v-if="!dailySeries.length" class="chart-frame flex items-center justify-center text-sm text-slate-400">
            Sem dados no período.
          </div>
          <v-chart v-else class="chart-frame mt-3 w-full" :option="dailyResultOption" autoresize />
        </div>

        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-900">Margem real por dia</h3>
          <p class="mt-0.5 text-xs text-slate-400">Evolução percentual · dias sem pedido sincronizado ficam sem ponto</p>
          <div v-if="!dailySeries.length" class="chart-frame flex items-center justify-center text-sm text-slate-400">
            Sem dados no período.
          </div>
          <v-chart v-else class="chart-frame mt-3 w-full" :option="marginTrendOption" autoresize />
        </div>
      </div>

      <p v-if="coverage.coverage_percentage < 100" class="text-xs text-amber-700">
        Cobertura parcial ({{ (coverage.coverage_percentage ?? 0).toFixed(1) }}%) — gráficos e tabela consideram apenas pedidos já
        sincronizados no período.
      </p>
    </template>

    <TiktokOrdersTable :from="from" :to="to" :channel-ids="channelIds" />
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
