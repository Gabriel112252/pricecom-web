<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/lib/api'
import { formatMoney, formatMoneyOrDash, formatPct, formatStockQty } from '@/lib/format'
import { DASHBOARD_TABS } from './lib/tabs'
import PageHeader from '@/components/PageHeader.vue'
import TabNav from '@/components/TabNav.vue'
import ProductDataCoverageBanner from './ProductDataCoverageBanner.vue'
import PeriodFilter from './PeriodFilter.vue'
import ChannelFilter from './ChannelFilter.vue'
import ExecutiveKpiCard from './ExecutiveKpiCard.vue'
import RevenueBreakdownCard from './RevenueBreakdownCard.vue'
import RevenueOrdersChart from './RevenueOrdersChart.vue'
import SalesByChannelChart from './SalesByChannelChart.vue'
import FinancialTab from './FinancialTab.vue'
import { FINANCE_SUBTABS } from './lib/financeTabs'
import BrazilOrdersMap from './BrazilOrdersMap.vue'
import DiscountCompositionCard from './DiscountCompositionCard.vue'
import DiscountTicketExposureCard from './DiscountTicketExposureCard.vue'
import CartAbandonmentCard from './CartAbandonmentCard.vue'
import CartAbandonmentDiscountBreakdown from './CartAbandonmentDiscountBreakdown.vue'
import TiktokContentFormatCard from './TiktokContentFormatCard.vue'
import YampiUtmBreakdownCard from './YampiUtmBreakdownCard.vue'
import StockAlertsCard from './StockAlertsCard.vue'
import FreightMarginCard from './FreightMarginCard.vue'
import FinancialCompositionBlock from './FinancialCompositionBlock.vue'
import DataQualityBlock from './DataQualityBlock.vue'
import OrderVolumeChart from './OrderVolumeChart.vue'
import RevenueByHourChart from './RevenueByHourChart.vue'
import ChannelBreakdown from './ChannelBreakdown.vue'
import AovByChannelChart from './AovByChannelChart.vue'
import AovByChannelSeriesChart from './AovByChannelSeriesChart.vue'
import TopProductsByRevenueChart from './TopProductsByRevenueChart.vue'
import TopProductsByMarginChart from './TopProductsByMarginChart.vue'
import ProductTurnoverSummary from './ProductTurnoverSummary.vue'
import HorizontalRankingChart from './HorizontalRankingChart.vue'
import ProductSearch from './ProductSearch.vue'
import ValueAtRiskCard from './ValueAtRiskCard.vue'
import OldestConflictCard from './OldestConflictCard.vue'
import ResolutionRateChart from './ResolutionRateChart.vue'
import ReconciliationBar from './ReconciliationBar.vue'
import IdworksTab from './IdworksTab.vue'
import CustomersTab from './CustomersTab.vue'

function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

const today = new Date()
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

const from = ref(toISODate(thirtyDaysAgo))
const to = ref(toISODate(today))
const channelIds = ref([])
const activeTab = ref(DASHBOARD_TABS[0].key)
const financeSubtab = ref(FINANCE_SUBTABS[0].key)

const loading = ref(true)
const errorMessage = ref('')
const summary = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/dashboard/summary', {
      params: { from: from.value, to: to.value, channel_ids: channelIds.value },
    })
    summary.value = data
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar o dashboard.'
  } finally {
    loading.value = false
  }
}

function handlePeriodChange(period) {
  from.value = period.from
  to.value = period.to
  load()
}

function handleChannelChange(ids) {
  channelIds.value = ids
  load()
}

onMounted(load)

const granularity = computed(() => summary.value?.granularity ?? 'day')
const kpis = computed(() => summary.value?.kpis ?? {})
const revenueBreakdown = computed(() => summary.value?.revenue_breakdown ?? {})
const dataQuality = computed(() => summary.value?.data_quality ?? {})
// Mesmo critério de "disponível" usado em build_financial/build_margin no
// backend — cost_price/unit_cost zerado em produção (ProductCostSyncJob)
// deixa financial_status incompleto, e daí "Top produtos por margem" seria
// só ruído. Some sozinho quando a cobertura de custo voltar a ficar completa.
const marginDataAvailable = computed(() => dataQuality.value.financial_status === 'complete')
const financialComposition = computed(() => summary.value?.financial_composition ?? {})
const financial = computed(() => summary.value?.financial ?? {})
const revenueTimeline = computed(() => summary.value?.revenue_timeline ?? summary.value?.revenue?.by_day ?? [])
const salesByChannel = computed(() => summary.value?.sales_by_channel ?? [])
const regionalSales = computed(() => summary.value?.regional_sales ?? {})
const coupons = computed(() => summary.value?.coupons ?? {})
const cartAbandonment = computed(() => summary.value?.cart_abandonment ?? {})
const freightMargin = computed(() => summary.value?.freight_margin ?? {})
// "SKUs reais vendidos" — mesmo dado de ProductTurnoverSummary
// (product_turnover_summary, kit já explodido nos componentes reais via
// Products::TopRealSkusSold), só num gadget de ranking em vez de tabela —
// reaproveita o mesmo HorizontalRankingChart usado na aba idworks.
const realSkusSoldEntries = computed(() =>
  (summary.value?.product_turnover_summary ?? []).map((p) => ({ label: p.sku, name: p.name, value: p.total_qty }))
)

// "Pedidos" mostra sempre o total operacional (nunca cai por causa da
// cobertura TikTok) — o detalhe só soma o recorte de quanto já tem
// financeiro processado, sem misturar com data_quality.complete_orders_count
// (que é sobre custo de produto/IDWorks, não sobre sync financeiro TikTok).
function ordersDetail() {
  const total = Number(kpis.value.orders_count ?? 0).toLocaleString('pt-BR')
  const tiktokTotal = Number(kpis.value.tiktok_orders_count ?? 0)
  const tiktokSynced = Number(kpis.value.tiktok_synced_orders_count ?? 0).toLocaleString('pt-BR')

  if (tiktokTotal > 0) {
    return `${total} pedidos no período · ${tiktokSynced} TikTok com financeiro processado`
  }

  return `${total} pedidos no período`
}

function couponDetail() {
  if (Number(kpis.value.shipping_subsidy_total || 0) > 0) {
    return `${formatMoney(kpis.value.shipping_subsidy_total)} de frete subsidiado · ${kpis.value.shipping_subsidy_orders_count ?? 0} pedidos`
  }

  if (coupons.value.has_coupon_codes) {
    return `${kpis.value.coupon_orders_count ?? 0} pedidos · ${formatPct(kpis.value.coupon_usage_percentage)}`
  }

  return `${kpis.value.commercial_discount_orders_count ?? 0} descontos sem código`
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader title="Dashboard" subtitle="Visão geral operacional do hub Pricecom.">
      <!-- Escondido só na subtab Yampi·Pagar.me: ela tem seu próprio
           filtro local (gateway + data de pagamento) com escopo diferente
           do filtro global. As subtabs Consolidado e TikTok Shop usam o
           mesmo período/canal do resto do dashboard, então precisam do
           filtro global visível. -->
      <template v-if="activeTab !== 'finance' || financeSubtab !== 'yampi_pagarme'" #actions>
        <ChannelFilter :model-value="channelIds" @update:model-value="handleChannelChange" />
        <PeriodFilter :from="from" :to="to" @change="handlePeriodChange" />
      </template>
    </PageHeader>

    <div v-if="loading && !summary" class="text-sm text-slate-500">Carregando visão geral...</div>
    <div v-else-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <template v-else-if="summary">
      <TabNav :tabs="DASHBOARD_TABS" v-model="activeTab" />

      <div class="space-y-6 transition-opacity" :class="{ 'opacity-60': loading }">
        <!-- Visão Geral -->
        <section v-show="activeTab === 'overview'" class="space-y-6">
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <RevenueBreakdownCard
              :breakdown="revenueBreakdown"
              tooltip="Yampi: receita bruta menos descontos, pedidos cancelados/devolvidos, frete e imposto. TikTok: revenue_amount quando o demonstrativo já sincronizou, gross_value - desconto do vendedor enquanto isso não acontece. Pedidos não pagos/indeterminados ficam fora."
            />
            <ExecutiveKpiCard
              label="Pedidos"
              :value="String(kpis.orders_count ?? 0)"
              :delta-pct="kpis.orders_vs_previous_pct"
              :detail="ordersDetail()"
            />
            <ExecutiveKpiCard
              label="Ticket médio"
              :value="formatMoneyOrDash(kpis.average_ticket)"
              :delta-pct="kpis.average_ticket_available ? kpis.average_ticket_vs_previous_pct : null"
              detail="Receita efetiva / total de pedidos do período"
              tooltip="Receita efetiva do período dividida pelo total de pedidos."
            />
            <ExecutiveKpiCard
              label="Descontos"
              :value="formatMoney(kpis.coupon_discount_total)"
              :detail="couponDetail()"
              tooltip="Somente valor bancado pelo vendedor: cupons identificados, descontos comerciais sem código, subsídio de frete estimado e desconto do vendedor TikTok. Subsídio pago pela TikTok aparece em 'Incentivos da plataforma', nunca somado aqui."
            />
          </div>

          <!-- Card isolado, mesma grade de largura da linha de KPIs acima
               (só 1 dos 4 slots ocupado) — operacional, não financeiro,
               então fica numa linha própria em vez de disputar espaço com
               os KPIs de receita. -->
          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StockAlertsCard />
          </div>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RevenueOrdersChart :timeline="revenueTimeline" :granularity="granularity" />
            <SalesByChannelChart :channels="salesByChannel" />
          </div>

          <BrazilOrdersMap :regional-sales="regionalSales" />
        </section>

        <!-- Vendas -->
        <section v-show="activeTab === 'sales'" class="space-y-6">
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <OrderVolumeChart :by-channel-series="summary.orders.by_channel_series" :granularity="granularity" />
            <RevenueByHourChart :by-channel-series="summary.revenue.by_channel_series" :granularity="granularity" />
            <ChannelBreakdown :by-channel="summary.revenue.by_channel" />
            <AovByChannelChart :aov-by-channel="summary.orders.aov_by_channel" />
            <AovByChannelSeriesChart :aov-by-channel-series="summary.orders.aov_by_channel_series" :granularity="granularity" />
          </div>

          <CartAbandonmentCard :cart-abandonment="cartAbandonment" />
          <FreightMarginCard :freight-margin="freightMargin" />

          <!-- Origem de aquisição: TikTok por formato de conteúdo + Yampi por UTM -->
          <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <TiktokContentFormatCard :breakdown="summary.tiktok_content_format_breakdown || {}" />
            <YampiUtmBreakdownCard :breakdown="summary.yampi_utm_breakdown || {}" />
          </div>
        </section>

        <!-- Descontos & Cupons -->
        <section v-show="activeTab === 'discounts'" class="space-y-6">
          <DiscountCompositionCard :coupons="coupons" :gross-revenue="Number(revenueBreakdown.gross_revenue || 0)" />
          <DiscountTicketExposureCard
            :summary="summary.discount_ticket_summary || {}"
            :products="summary.product_discount_exposure || []"
          />
          <CartAbandonmentDiscountBreakdown :cart-abandonment="cartAbandonment" />
        </section>

        <!-- Financeiro -->
        <FinancialTab
          v-show="activeTab === 'finance'"
          v-model:active-subtab="financeSubtab"
          :financial="financial"
          :coupons="coupons"
          :granularity="granularity"
          :from="from"
          :to="to"
          :channel-ids="channelIds"
        />

        <!-- Produtos -->
        <section v-show="activeTab === 'products'" class="space-y-6">
          <ProductDataCoverageBanner :coverage="summary.tiktok_product_data_coverage || {}" />
          <ProductSearch :from="from" :to="to" :channel-ids="channelIds" />
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopProductsByRevenueChart :class="{ 'lg:col-span-2': !marginDataAvailable }" :products="summary.top_products_by_revenue" />
            <TopProductsByMarginChart v-if="marginDataAvailable" :products="summary.top_products_by_margin" />
            <ProductTurnoverSummary class="lg:col-span-2" :products="summary.product_turnover_summary" />
            <HorizontalRankingChart
              class="lg:col-span-2"
              title="SKUs reais vendidos"
              subtitle="Top 10 por quantidade real — kit explodido nos componentes"
              :entries="realSkusSoldEntries"
              :value-formatter="(v) => `${formatStockQty(v)} un.`"
            />
          </div>
        </section>

        <!-- Clientes -->
        <section v-show="activeTab === 'customers'" class="space-y-6">
          <CustomersTab :from="from" :to="to" />
        </section>

        <!-- idworks -->
        <section v-show="activeTab === 'reconciliation'" class="space-y-6">
          <IdworksTab :from="from" :to="to" />
        </section>

        <!-- Saúde Operacional -->
        <section v-show="activeTab === 'health'" class="space-y-5">
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ValueAtRiskCard :value-at-risk="summary.conflicts.value_at_risk" />
            <OldestConflictCard :oldest-open-days="summary.conflicts.oldest_open_days" />
          </div>
          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ResolutionRateChart :trend="summary.conflicts.resolution_trend" />
            <ReconciliationBar
              :matched-pct="summary.reconciliation.matched_pct"
              :disputed="summary.reconciliation.disputed"
              :unmatched="summary.reconciliation.unmatched"
              :by-source="summary.reconciliation.by_source"
            />
          </div>
          <FinancialCompositionBlock :composition="financialComposition" />
          <DataQualityBlock :quality="dataQuality" />
        </section>
      </div>
    </template>
  </div>
</template>
