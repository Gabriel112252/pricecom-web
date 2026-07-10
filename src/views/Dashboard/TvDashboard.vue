<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/lib/api'
import { formatMoney, formatPct, formatDateTime } from '@/lib/format'
import { DASHBOARD_TABS } from './lib/tabs'
import KpiCard from './KpiCard.vue'
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

const ROTATION_INTERVAL_MS = 12_000
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

const route = useRoute()
const token = route.params.token

const summary = ref(null)
const notFound = ref(false)
const lastUpdatedAt = ref(null)
const activeTabIndex = ref(0)

const activeTab = computed(() => DASHBOARD_TABS[activeTabIndex.value].key)
const granularity = computed(() => summary.value?.granularity ?? 'day')

async function load() {
  try {
    const { data } = await api.get(`/tv/${token}/summary`)
    summary.value = data
    lastUpdatedAt.value = new Date().toISOString()
  } catch (e) {
    if (e.response?.status === 404) notFound.value = true
  }
}

let rotationTimer = null
let refreshTimer = null

onMounted(() => {
  load()
  rotationTimer = setInterval(() => {
    activeTabIndex.value = (activeTabIndex.value + 1) % DASHBOARD_TABS.length
  }, ROTATION_INTERVAL_MS)
  refreshTimer = setInterval(load, REFRESH_INTERVAL_MS)
})

onBeforeUnmount(() => {
  clearInterval(rotationTimer)
  clearInterval(refreshTimer)
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 p-8 text-slate-100">
    <div v-if="notFound" class="flex min-h-[80vh] flex-col items-center justify-center gap-2 text-center">
      <p class="text-2xl font-semibold text-slate-200">Link inválido ou revogado</p>
      <p class="text-slate-400">Peça a um administrador para gerar um novo link do modo TV.</p>
    </div>

    <template v-else-if="summary">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-6">
          <h1 class="text-3xl font-bold">{{ DASHBOARD_TABS[activeTabIndex].label }}</h1>
          <nav class="flex gap-2">
            <span
              v-for="(tab, i) in DASHBOARD_TABS"
              :key="tab.key"
              class="h-2 w-8 rounded-full transition"
              :class="i === activeTabIndex ? 'bg-indigo-400' : 'bg-slate-700'"
            ></span>
          </nav>
        </div>
        <div class="flex items-center gap-2 text-sm text-slate-400">
          <span class="flex items-center gap-1.5">
            <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
            ao vivo
          </span>
          <span v-if="lastUpdatedAt">· atualizado às {{ formatDateTime(lastUpdatedAt) }}</span>
        </div>
      </div>

      <div class="tv-content mt-8">
        <section v-show="activeTab === 'overview'" class="space-y-6">
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

        <section v-show="activeTab === 'sales'" class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <OrderVolumeChart :by-channel-series="summary.orders.by_channel_series" :granularity="granularity" />
          <RevenueByHourChart :by-channel-series="summary.revenue.by_channel_series" :granularity="granularity" />
          <ChannelBreakdown :by-channel="summary.revenue.by_channel" />
          <AovByChannelChart :aov-by-channel="summary.orders.aov_by_channel" />
        </section>

        <section v-show="activeTab === 'products'" class="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TopProductsByRevenueChart :products="summary.top_products_by_revenue" />
          <TopProductsByMarginChart :products="summary.top_products_by_margin" />
          <ProductTurnoverSummary class="lg:col-span-2" :products="summary.product_turnover_summary" />
        </section>

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

<style scoped>
/*
  Vue's :deep() is compiled by @vitejs/plugin-vue, not resolved by Tailwind's
  JIT content scan — see RevenueChart.vue for why anything dynamic/structural
  in this codebase avoids depending on Tailwind picking up ad-hoc utility
  combinations. This reaches into the shared (light-themed) dashboard
  components to apply the TV wallboard's dark theme and larger type scale
  without touching those components' own light-mode styling.
*/
.tv-content :deep(h3) {
  font-size: 1.125rem;
}

.tv-content :deep(.text-3xl) {
  font-size: 3rem;
}

.tv-content :deep(.text-sm) {
  font-size: 1rem;
}

.tv-content :deep(.text-xs) {
  font-size: 0.8125rem;
}

.tv-content :deep(.rounded-xl) {
  background-color: #0f172a;
  border-color: #1e293b;
}

.tv-content :deep(.bg-white),
.tv-content :deep(.bg-slate-50) {
  background-color: #0f172a;
}

.tv-content :deep(.text-slate-900),
.tv-content :deep(.text-slate-800) {
  color: #f1f5f9;
}

.tv-content :deep(.text-slate-700),
.tv-content :deep(.text-slate-600) {
  color: #cbd5e1;
}

.tv-content :deep(.text-slate-500),
.tv-content :deep(.text-slate-400) {
  color: #94a3b8;
}

.tv-content :deep(.border-slate-200),
.tv-content :deep(.border-slate-100) {
  border-color: #1e293b;
}
</style>

