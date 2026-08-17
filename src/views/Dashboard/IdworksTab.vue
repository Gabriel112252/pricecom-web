<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '@/lib/api'
import { formatMoney, formatMoneyOrDash, formatStockQty } from '@/lib/format'
import LojaFilter from './LojaFilter.vue'
import KpiCard from './KpiCard.vue'
import OrderVolumeChart from './OrderVolumeChart.vue'
import SalesByChannelChart from './SalesByChannelChart.vue'
import HorizontalRankingChart from './HorizontalRankingChart.vue'
import RealSkusSoldChannelTable from './RealSkusSoldChannelTable.vue'
import ReconciliationTab from './ReconciliationTab.vue'

const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
})

const loja = ref('')
const loading = ref(false)
const errorMessage = ref('')
const data = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data: response } = await api.get('/idworks_dashboard', {
      params: { start_date: props.from, end_date: props.to, loja: loja.value || undefined },
    })
    data.value = response
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || e.response?.data?.error || 'Não foi possível carregar o dashboard idworks.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.from, props.to, loja.value], load)
onMounted(load)

const revenueByLoja = computed(() => data.value?.revenue_by_loja || {})
const topProductsEntries = computed(() =>
  (data.value?.top_products || []).map((p) => ({ label: p.sku, name: p.name, value: p.quantity }))
)
// SKUs reais vendidos x canal — o Gabriel pediu esse cruzamento visível
// direto na tabela (RealSkusSoldChannelTable), não escondido atrás de
// hover. data.real_skus_sold já traz channel_breakdown por produto (ver
// Idworks::DashboardStatsService#real_skus_sold), sem precisar recalcular
// nada aqui — repassa como veio.
const realSkusSold = computed(() => data.value?.real_skus_sold || [])
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-slate-900">Corte por loja</h2>
      <LojaFilter v-model="loja" />
    </div>

    <div v-if="loading && !data" class="text-sm text-slate-500">Carregando dashboard idworks...</div>
    <div v-else-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <template v-else-if="data">
      <div class="space-y-6 transition-opacity" :class="{ 'opacity-60': loading }">
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Faturamento" :value="formatMoney(data.revenue_total)" />
          <KpiCard label="Pedidos" :value="String(data.orders_count ?? 0)" />
          <KpiCard label="Ticket médio" :value="formatMoneyOrDash(data.average_ticket)" />
          <KpiCard label="Faturamento Hidrabene" :value="formatMoney(revenueByLoja.hidrabene)" />
          <KpiCard label="Faturamento Anasol" :value="formatMoney(revenueByLoja.anasol)" />
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <OrderVolumeChart :by-channel-series="data.orders_timeseries" granularity="day" />
          <SalesByChannelChart :channels="data.channel_breakdown" />
        </div>

        <HorizontalRankingChart
          title="Produtos mais vendidos"
          :subtitle="loja ? `Top 10 por SKU do pedido — ${loja === 'hidrabene' ? 'Hidrabene' : 'Anasol'}` : 'Top 10 por SKU do pedido — todas as lojas'"
          :entries="topProductsEntries"
          :value-formatter="(v) => `${formatStockQty(v)} un.`"
        />

        <RealSkusSoldChannelTable :products="realSkusSold" />
      </div>
    </template>

    <ReconciliationTab :from="from" :to="to" />
  </section>
</template>
