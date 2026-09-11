<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/lib/api'
import { formatMoney, formatMoneyOrDash, formatStockQty } from '@/lib/format'
import LojaFilter from './LojaFilter.vue'
import KpiCard from './KpiCard.vue'
import OrderVolumeChart from './OrderVolumeChart.vue'
import HorizontalRankingChart from './HorizontalRankingChart.vue'
import RealSkusSoldChannelTable from './RealSkusSoldChannelTable.vue'
import ReconciliationTab from './ReconciliationTab.vue'
import BlingPanel from './BlingPanel.vue'

const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
})

const IDWORKS_MARKETPLACE_CHANNELS = [ 'Mercado Livre', 'Shopee', 'TikTok Shop' ]

const loja = ref('')
const loading = ref(false)
const idworksError = ref('')
const blingError = ref('')
const data = ref(null)
const blingData = ref(null)

async function load() {
  loading.value = true
  idworksError.value = ''
  blingError.value = ''

  const [ idworksResult, blingResult ] = await Promise.allSettled([
    api.get('/idworks_dashboard', {
      params: { start_date: props.from, end_date: props.to, loja: loja.value || undefined },
    }),
    api.get('/integration_health', {
      params: {
        provider: 'bling',
        view: 'dashboard',
        date_from: props.from,
        date_to: props.to,
      },
    }),
  ])

  if (idworksResult.status === 'fulfilled') {
    data.value = idworksResult.value.data
  } else {
    data.value = null
    idworksError.value = idworksResult.reason?.response?.data?.errors?.[0]
      || idworksResult.reason?.response?.data?.error
      || 'Não foi possível carregar o IDWorks.'
  }

  if (blingResult.status === 'fulfilled') {
    blingData.value = blingResult.value.data
  } else {
    blingData.value = null
    blingError.value = blingResult.reason?.response?.data?.error || 'Bling indisponível neste período.'
  }

  loading.value = false
}

watch(() => [ props.from, props.to, loja.value ], load)
onMounted(load)

const idworksMarketplaceRows = computed(() =>
  (data.value?.idworks_channel_breakdown || []).filter((row) => IDWORKS_MARKETPLACE_CHANNELS.includes(row.channel))
)

const idworksMarketplaceOrders = computed(() =>
  idworksMarketplaceRows.value.reduce((sum, row) => sum + Number(row.orders_count || 0), 0)
)

const idworksMarketplaceRevenue = computed(() =>
  idworksMarketplaceRows.value.reduce((sum, row) => sum + Number(row.net_revenue || 0), 0)
)

const blingSummary = computed(() => blingData.value?.summary || {})
const blingOrders = computed(() => Number(blingSummary.value.total_orders || 0))
const erpOrders = computed(() => blingData.value ? idworksMarketplaceOrders.value + blingOrders.value : null)

const idworksMarketplaceSeries = computed(() =>
  (data.value?.idworks_orders_timeseries || []).filter((row) => IDWORKS_MARKETPLACE_CHANNELS.includes(row.channel))
)

const marketplaceProducts = computed(() =>
  (data.value?.real_skus_sold || [])
    .map((product) => {
      const quantity = (product.channel_breakdown || [])
        .filter((row) => IDWORKS_MARKETPLACE_CHANNELS.includes(row.channel))
        .reduce((sum, row) => sum + Number(row.quantity || 0), 0)

      return {
        ...product,
        marketplace_quantity: quantity,
      }
    })
    .filter((product) => product.marketplace_quantity > 0)
    .sort((a, b) => b.marketplace_quantity - a.marketplace_quantity)
    .slice(0, 10)
)

const marketplaceProductEntries = computed(() =>
  marketplaceProducts.value.map((product) => ({
    label: product.sku,
    name: product.name,
    value: product.marketplace_quantity,
  }))
)

const displayedMarketplaceUnits = computed(() =>
  marketplaceProducts.value.reduce((sum, product) => sum + product.marketplace_quantity, 0)
)

const channelCards = computed(() => {
  const byName = Object.fromEntries(idworksMarketplaceRows.value.map((row) => [ row.channel, row ]))

  return [
    { name: 'Mercado Livre', erp: 'IDWorks', orders: Number(byName['Mercado Livre']?.orders_count || 0) },
    { name: 'Shopee', erp: 'IDWorks', orders: Number(byName.Shopee?.orders_count || 0) },
    { name: 'TikTok Shop', erp: 'IDWorks', orders: Number(byName['TikTok Shop']?.orders_count || 0) },
    { name: 'Site / Yampi', erp: 'Bling', orders: blingData.value ? blingOrders.value : null },
  ]
})

const pricecomTopProducts = computed(() =>
  (data.value?.top_products || []).map((product) => ({
    label: product.sku,
    name: product.name,
    value: product.quantity,
  }))
)
</script>

<template>
  <section class="space-y-6">
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-indigo-500">Operação ERP</p>
          <h2 class="mt-1 text-xl font-semibold text-slate-900">Pedidos e produtos primeiro</h2>
          <p class="mt-1 text-sm text-slate-500">ERP é a fonte principal. Lojas e Pricecom ficam como conciliação e contexto.</p>
        </div>
        <div class="flex flex-wrap gap-2 text-xs font-semibold">
          <span class="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">IDWorks · Mercado Livre</span>
          <span class="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">IDWorks · Shopee</span>
          <span class="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">IDWorks · TikTok Shop</span>
          <span class="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">Bling · Site/Yampi</span>
        </div>
      </div>
    </div>

    <div v-if="loading && !data" class="text-sm text-slate-500">Carregando operação dos ERPs...</div>
    <div v-if="idworksError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{{ idworksError }}</div>
    <div v-if="blingError" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{{ blingError }}</div>

    <template v-if="data">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pedidos ERP" :value="erpOrders === null ? '—' : String(erpOrders)" />
        <KpiCard label="IDWorks · marketplaces" :value="String(idworksMarketplaceOrders)" />
        <KpiCard label="Bling · Site/Yampi" :value="blingData ? String(blingOrders) : '—'" />
        <KpiCard label="Unidades · top SKUs conciliados" :value="formatStockQty(displayedMarketplaceUnits) ?? '0'" />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="channel in channelCards" :key="channel.name" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-slate-900">{{ channel.name }}</p>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{{ channel.erp }}</span>
          </div>
          <p class="mt-3 text-3xl font-bold text-slate-900">{{ channel.orders === null ? '—' : channel.orders }}</p>
          <p class="mt-1 text-xs text-slate-400">pedidos no período</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <OrderVolumeChart
          title="Volume de pedidos · IDWorks"
          subtitle="Somente Mercado Livre, Shopee e TikTok Shop"
          :by-channel-series="idworksMarketplaceSeries"
          granularity="day"
        />

        <HorizontalRankingChart
          title="Produtos mais vendidos · marketplaces"
          subtitle="Quantidade conciliada por SKU nos canais do IDWorks"
          :entries="marketplaceProductEntries"
          :value-formatter="(value) => `${formatStockQty(value)} un.`"
        />
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        O IDWorks espelha pedidos diretamente no Pricecom. As unidades por SKU usam as linhas conciliadas do pedido e o canal nativo do IDWorks; o espelho atual do Bling ainda expõe volume de pedidos e exceções, mas não as linhas de itens.
      </div>

      <BlingPanel :from="from" :to="to" />

      <details class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary class="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-700">Dados secundários · Pricecom / lojas / financeiro</summary>
        <div class="space-y-6 border-t border-slate-100 p-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Conciliação</p>
              <p class="mt-1 text-sm text-slate-500">Use estes dados para comparar o que entrou pelas lojas com o que chegou ao ERP.</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-slate-700">Loja</span>
              <LojaFilter v-model="loja" />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Pricecom · pedidos" :value="String(data.orders_count ?? 0)" />
            <KpiCard label="Pricecom · faturamento" :value="formatMoney(data.revenue_total)" />
            <KpiCard label="IDWorks · faturamento marketplaces" :value="formatMoney(idworksMarketplaceRevenue)" />
            <KpiCard label="Pricecom · ticket" :value="formatMoneyOrDash(data.average_ticket)" />
          </div>

          <HorizontalRankingChart
            title="Produtos no Pricecom"
            subtitle="Ranking secundário para conferência das linhas importadas"
            :entries="pricecomTopProducts"
            :value-formatter="(value) => `${formatStockQty(value)} un.`"
          />

          <RealSkusSoldChannelTable :products="data.real_skus_sold || []" />
        </div>
      </details>
    </template>

    <div>
      <div class="mb-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Conciliação operacional</p>
        <h3 class="mt-1 text-lg font-semibold text-slate-900">Divergências e pedidos fora do fluxo esperado</h3>
      </div>
      <ReconciliationTab :from="from" :to="to" />
    </div>
  </section>
</template>
