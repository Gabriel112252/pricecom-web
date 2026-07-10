<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/lib/api'
import { formatMoney, formatPct } from '@/lib/format'
import { DASHBOARD_TABS } from './lib/tabs'
import PeriodFilter from './PeriodFilter.vue'
import ChannelFilter from './ChannelFilter.vue'
import KpiCard from './KpiCard.vue'
import AttentionBanner from './AttentionBanner.vue'
import RevenueChart from './RevenueChart.vue'
import MarginTrend from './MarginTrend.vue'
import ReconciliationSummary from './ReconciliationSummary.vue'
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
          <AttentionBanner :conflicts="summary.conflicts" />

          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Receita bruta" :value="formatMoney(summary.revenue.gross)" :delta-pct="summary.revenue.gross_vs_previous_pct" />
            <KpiCard label="Receita líquida" :value="formatMoney(summary.revenue.net)" :delta-pct="summary.revenue.net_vs_previous_pct" />
            <KpiCard label="Ticket médio" :value="formatMoney(summary.orders.aov)" :delta-pct="summary.orders.aov_vs_previous_pct" />
            <KpiCard label="Pedidos" :value="String(summary.orders.count)" :delta-pct="summary.orders.vs_previous_period_pct" />
            <KpiCard label="Margem média" :value="formatPct(summary.margin.avg_pct)" :delta-pct="summary.margin.avg_pct_vs_previous_pct" />
          </div>

          <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <RevenueChart :by-day="summary.revenue.by_day" :granularity="granularity" />
            <MarginTrend :trend="summary.margin.trend" :avg-pct="summary.margin.avg_pct" :granularity="granularity" />
            <ReconciliationSummary
              :matched-pct="summary.reconciliation.matched_pct"
              :disputed="summary.reconciliation.disputed"
              :unmatched="summary.reconciliation.unmatched"
            />
          </div>
        </section>

        <!-- Vendas -->
        <section v-show="activeTab === 'sales'" class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <OrderVolumeChart :by-channel-series="summary.orders.by_channel_series" :granularity="granularity" />
          <RevenueByHourChart :by-channel-series="summary.revenue.by_channel_series" :granularity="granularity" />
          <ChannelBreakdown :by-channel="summary.revenue.by_channel" />
          <AovByChannelChart :aov-by-channel="summary.orders.aov_by_channel" />
        </section>

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
        </section>
      </div>
    </template>
  </div>
</template>
