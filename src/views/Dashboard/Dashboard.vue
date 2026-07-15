<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/lib/api'
import { formatMoney, formatPct } from '@/lib/format'
import { DASHBOARD_TABS } from './lib/tabs'
import PeriodFilter from './PeriodFilter.vue'
import ChannelFilter from './ChannelFilter.vue'
import ExecutiveKpiCard from './ExecutiveKpiCard.vue'
import RevenueOrdersChart from './RevenueOrdersChart.vue'
import SalesByChannelChart from './SalesByChannelChart.vue'
import FinancialReceivablesTab from './FinancialReceivablesTab.vue'
import BrazilOrdersMap from './BrazilOrdersMap.vue'
import CouponUsageChart from './CouponUsageChart.vue'
import FinancialCompositionBlock from './FinancialCompositionBlock.vue'
import DataQualityBlock from './DataQualityBlock.vue'
import OrderVolumeChart from './OrderVolumeChart.vue'
import RevenueByHourChart from './RevenueByHourChart.vue'
import ChannelBreakdown from './ChannelBreakdown.vue'
import AovByChannelChart from './AovByChannelChart.vue'
import TopProductsByRevenueChart from './TopProductsByRevenueChart.vue'
import TopProductsByMarginChart from './TopProductsByMarginChart.vue'
import ProductTurnoverSummary from './ProductTurnoverSummary.vue'
import ValueAtRiskCard from './ValueAtRiskCard.vue'
import OldestConflictCard from './OldestConflictCard.vue'
import ResolutionRateChart from './ResolutionRateChart.vue'
import ReconciliationBar from './ReconciliationBar.vue'

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
const dataQuality = computed(() => summary.value?.data_quality ?? {})
const financialComposition = computed(() => summary.value?.financial_composition ?? {})
const revenueTimeline = computed(() => summary.value?.revenue_timeline ?? summary.value?.revenue?.by_day ?? [])
const salesByChannel = computed(() => summary.value?.sales_by_channel ?? [])
const regionalSales = computed(() => summary.value?.regional_sales ?? {})
const coupons = computed(() => summary.value?.coupons ?? {})

function coverageStatus() {
  const coverage = Number(kpis.value.financial_coverage_percentage ?? 100)
  if (coverage < 70) return 'critical'
  if (coverage < 95) return 'warning'
  return 'default'
}

function topRegionValue() {
  return kpis.value.top_region_state || '—'
}

function couponDetail() {
  if (Number(kpis.value.shipping_subsidy_total || 0) > 0) {
    return `${formatMoney(kpis.value.shipping_subsidy_total)} em frete · ${kpis.value.shipping_subsidy_orders_count ?? 0} pedidos`
  }

  if (coupons.value.has_coupon_codes) {
    return `${kpis.value.coupon_orders_count ?? 0} pedidos · ${formatPct(kpis.value.coupon_usage_percentage)}`
  }

  return `${kpis.value.commercial_discount_orders_count ?? 0} descontos sem código`
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">Visão geral operacional do hub Pricecom.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ChannelFilter :model-value="channelIds" @update:model-value="handleChannelChange" />
        <PeriodFilter :from="from" :to="to" @change="handlePeriodChange" />
      </div>
    </div>

    <div v-if="loading && !summary" class="text-sm text-slate-500">Carregando visão geral...</div>
    <div v-else-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <template v-else-if="summary">
      <div class="border-b border-slate-200">
        <nav class="flex gap-1">
          <button
            v-for="tab in DASHBOARD_TABS"
            :key="tab.key"
            type="button"
            class="border-b-2 px-4 py-2.5 text-sm font-medium transition"
            :class="
              activeTab === tab.key
                ? 'border-indigo-500 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            "
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <div class="space-y-6 transition-opacity" :class="{ 'opacity-60': loading }">
        <!-- Visão Geral -->
        <section v-show="activeTab === 'overview'" class="space-y-6">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <ExecutiveKpiCard
              label="Receita líquida"
              :value="formatMoney(kpis.net_revenue)"
              :delta-pct="kpis.net_revenue_vs_previous_pct"
              :detail="`Bruta ${formatMoney(kpis.gross_revenue)}`"
              tooltip="Receita bruta menos descontos e reembolsos."
            />
            <ExecutiveKpiCard
              label="Pedidos"
              :value="String(kpis.orders_count ?? 0)"
              :delta-pct="kpis.orders_vs_previous_pct"
              :detail="`${dataQuality.complete_orders_count ?? 0} completos`"
            />
            <ExecutiveKpiCard
              label="Ticket médio"
              :value="formatMoney(kpis.average_ticket)"
              :delta-pct="kpis.average_ticket_vs_previous_pct"
              detail="Receita líquida / pedidos"
            />
            <ExecutiveKpiCard
              label="Descontos"
              :value="formatMoney(kpis.coupon_discount_total)"
              :detail="couponDetail()"
              tooltip="Soma de cupons identificados, descontos comerciais sem código e subsídio de frete estimado quando há frete real."
            />
            <ExecutiveKpiCard
              label="Região líder"
              :value="topRegionValue()"
              :detail="`${kpis.top_region_orders_count ?? 0} pedidos · ${formatMoney(kpis.top_region_net_revenue)}`"
              tooltip="UF com maior quantidade de pedidos no período."
            />
            <ExecutiveKpiCard
              label="Cobertura financeira"
              :value="formatPct(kpis.financial_coverage_percentage)"
              :status="coverageStatus()"
              :detail="`${dataQuality.incomplete_orders_count ?? 0} incompletos`"
              tooltip="Percentual de pedidos com custo, frete e impostos exigidos pela fonte configurada."
            />
          </div>

          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <RevenueOrdersChart :timeline="revenueTimeline" :granularity="granularity" />
            <SalesByChannelChart :channels="salesByChannel" />
          </div>

          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <BrazilOrdersMap :regional-sales="regionalSales" />
            <CouponUsageChart :coupons="coupons" />
          </div>
        </section>

        <!-- Vendas -->
        <section v-show="activeTab === 'sales'" class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <OrderVolumeChart :by-channel-series="summary.orders.by_channel_series" :granularity="granularity" />
          <RevenueByHourChart :by-channel-series="summary.revenue.by_channel_series" :granularity="granularity" />
          <ChannelBreakdown :by-channel="summary.revenue.by_channel" />
          <AovByChannelChart :aov-by-channel="summary.orders.aov_by_channel" />
        </section>

        <!-- Financeiro -->
        <FinancialReceivablesTab v-show="activeTab === 'finance'" />

        <!-- Produtos -->
        <section v-show="activeTab === 'products'" class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TopProductsByRevenueChart :products="summary.top_products_by_revenue" />
          <TopProductsByMarginChart :products="summary.top_products_by_margin" />
          <ProductTurnoverSummary class="lg:col-span-2" :products="summary.product_turnover_summary" />
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
