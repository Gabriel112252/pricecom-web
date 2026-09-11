<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api'
import { formatDateTime, formatStockQty } from '@/lib/format'
import Operations from './Operations.vue'

const IDWORKS_MARKETPLACE_CHANNELS = [ 'Mercado Livre', 'Shopee', 'TikTok Shop' ]

const loading = ref(false)
const idworksData = ref(null)
const blingData = ref(null)
const integrationHealth = ref([])
const sourceErrors = ref([])

function localISODate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = localISODate()

async function loadErpVolume() {
  loading.value = true
  sourceErrors.value = []

  const [ idworksResult, blingResult, healthResult ] = await Promise.allSettled([
    api.get('/idworks_dashboard', { params: { start_date: today, end_date: today } }),
    api.get('/integration_health', {
      params: { provider: 'bling', view: 'dashboard', date_from: today, date_to: today },
    }),
    api.get('/integration_health'),
  ])

  if (idworksResult.status === 'fulfilled') {
    idworksData.value = idworksResult.value.data
  } else {
    idworksData.value = null
    sourceErrors.value.push('IDWorks')
  }

  if (blingResult.status === 'fulfilled') {
    blingData.value = blingResult.value.data
  } else {
    blingData.value = null
    sourceErrors.value.push('Bling')
  }

  if (healthResult.status === 'fulfilled') {
    integrationHealth.value = healthResult.value.data || []
  } else {
    integrationHealth.value = []
    sourceErrors.value.push('Saúde das integrações')
  }

  loading.value = false
}

onMounted(loadErpVolume)

const idworksRows = computed(() =>
  (idworksData.value?.idworks_channel_breakdown || []).filter((row) => IDWORKS_MARKETPLACE_CHANNELS.includes(row.channel))
)

const idworksOrders = computed(() =>
  idworksRows.value.reduce((sum, row) => sum + Number(row.orders_count || 0), 0)
)

const blingSummary = computed(() => blingData.value?.summary || {})
const blingOrders = computed(() => Number(blingSummary.value.total_orders || 0))
const totalOrders = computed(() => blingData.value ? idworksOrders.value + blingOrders.value : null)

const channelVolumes = computed(() => {
  const rows = Object.fromEntries(idworksRows.value.map((row) => [ row.channel, Number(row.orders_count || 0) ]))
  return [
    { channel: 'Mercado Livre', erp: 'IDWorks', orders: rows['Mercado Livre'] || 0 },
    { channel: 'Shopee', erp: 'IDWorks', orders: rows.Shopee || 0 },
    { channel: 'TikTok Shop', erp: 'IDWorks', orders: rows['TikTok Shop'] || 0 },
    { channel: 'Site / Yampi', erp: 'Bling', orders: blingData.value ? blingOrders.value : null },
  ]
})

const topProducts = computed(() =>
  (idworksData.value?.real_skus_sold || [])
    .map((product) => {
      const quantity = (product.channel_breakdown || [])
        .filter((row) => IDWORKS_MARKETPLACE_CHANNELS.includes(row.channel))
        .reduce((sum, row) => sum + Number(row.quantity || 0), 0)
      return { ...product, marketplace_quantity: quantity }
    })
    .filter((product) => product.marketplace_quantity > 0)
    .sort((a, b) => b.marketplace_quantity - a.marketplace_quantity)
    .slice(0, 5)
)

const currentErpIssues = computed(() =>
  integrationHealth.value
    .filter((health) => {
      if (![ 'error', 'pending' ].includes(health.health_status)) return false

      const provider = String(health.provider || '').toLocaleLowerCase('pt-BR')
      const identity = [ health.provider, health.name, health.channel_name ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')

      if (provider === 'bling') return true

      // Yampi agora pertence ao Bling. Pendências históricas Yampi → IDWorks
      // continuam acessíveis na fila técnica abaixo, mas não entram no cockpit atual.
      if (identity.includes('yampi') && identity.includes('idworks')) return false

      return provider === 'idworks' || identity.includes('idworks')
    })
    .sort((a, b) => {
      if (a.health_status === b.health_status) return 0
      return a.health_status === 'error' ? -1 : 1
    })
)

function issueTitle(issue) {
  return issue.name || issue.channel_name || issue.provider || 'ERP sem identificação'
}

function issueDescription(issue) {
  if (issue.provider === 'bling') {
    return issue.last_error_message || issue.message || 'Pendência operacional no fluxo Site/Yampi → Bling.'
  }

  if (issue.health_status === 'error') {
    return issue.last_error_message || 'Falha recente na integração com o IDWorks.'
  }

  return `${Number(issue.events_pending_count || 0)} evento(s) aguardando processamento.`
}
</script>

<template>
  <div>
    <section class="space-y-4 px-6 pt-6 lg:px-8 lg:pt-8">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-indigo-500">Operação ERP · hoje</p>
          <h1 class="mt-1 text-2xl font-semibold text-slate-900">Volume antes das exceções</h1>
          <p class="mt-1 text-sm text-slate-500">IDWorks = Mercado Livre, Shopee e TikTok Shop · Bling = Site/Yampi.</p>
        </div>
        <button
          type="button"
          :disabled="loading"
          class="w-fit rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          @click="loadErpVolume"
        >
          {{ loading ? 'Atualizando volume...' : 'Atualizar volume' }}
        </button>
      </div>

      <div v-if="sourceErrors.length" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
        Dados ERP parciais. Não foi possível consultar: {{ sourceErrors.join(', ') }}.
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pedidos ERP hoje</p>
          <p class="mt-2 text-3xl font-bold text-slate-900">{{ totalOrders === null ? '—' : totalOrders }}</p>
          <p class="mt-1 text-xs text-slate-400">IDWorks + Bling, sem canais duplicados</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">IDWorks</p>
          <p class="mt-2 text-3xl font-bold text-slate-900">{{ idworksOrders }}</p>
          <p class="mt-1 text-xs text-slate-400">ML + Shopee + TikTok</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Bling</p>
          <p class="mt-2 text-3xl font-bold text-slate-900">{{ blingData ? blingOrders : '—' }}</p>
          <p class="mt-1 text-xs text-slate-400">Site / Yampi</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Bling pendentes</p>
          <p class="mt-2 text-3xl font-bold" :class="Number(blingSummary.pending_orders || 0) > 0 ? 'text-amber-600' : 'text-slate-900'">
            {{ blingData ? Number(blingSummary.pending_orders || 0) : '—' }}
          </p>
          <p class="mt-1 text-xs text-slate-400">ainda sem pedido criado no ERP</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="row in channelVolumes" :key="row.channel" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-semibold text-slate-900">{{ row.channel }}</span>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{{ row.erp }}</span>
          </div>
          <p class="mt-2 text-2xl font-bold text-slate-900">{{ row.orders === null ? '—' : row.orders }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Fluxo Bling</p>
              <h2 class="mt-1 text-sm font-semibold text-slate-900">Site/Yampi → ERP</h2>
            </div>
            <span class="text-xs text-slate-400">hoje</span>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div class="rounded-lg bg-slate-50 p-3">
              <p class="text-xs text-slate-500">Recebidos</p>
              <strong class="mt-1 block text-xl text-slate-900">{{ blingData ? Number(blingSummary.total_orders || 0) : '—' }}</strong>
            </div>
            <div class="rounded-lg bg-slate-50 p-3">
              <p class="text-xs text-slate-500">Integrados</p>
              <strong class="mt-1 block text-xl text-emerald-600">{{ blingData ? Number(blingSummary.integrated_orders || 0) : '—' }}</strong>
            </div>
            <div class="rounded-lg bg-slate-50 p-3">
              <p class="text-xs text-slate-500">Pendentes</p>
              <strong class="mt-1 block text-xl text-amber-600">{{ blingData ? Number(blingSummary.pending_orders || 0) : '—' }}</strong>
            </div>
            <div class="rounded-lg bg-slate-50 p-3">
              <p class="text-xs text-slate-500">Com erro</p>
              <strong class="mt-1 block text-xl text-red-600">{{ blingData ? Number(blingSummary.orders_with_errors || 0) : '—' }}</strong>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Produtos</p>
            <h2 class="mt-1 text-sm font-semibold text-slate-900">SKUs com maior saída nos marketplaces IDWorks</h2>
          </div>
          <div v-if="topProducts.length === 0" class="mt-4 text-sm text-slate-400">Sem produtos conciliados hoje.</div>
          <div v-else class="mt-4 divide-y divide-slate-100">
            <div v-for="product in topProducts" :key="product.id || product.sku" class="flex items-center justify-between gap-4 py-2.5">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900">{{ product.sku }}</p>
                <p class="truncate text-xs text-slate-400">{{ product.name }}</p>
              </div>
              <strong class="shrink-0 text-sm text-slate-900">{{ formatStockQty(product.marketplace_quantity) }} un.</strong>
            </div>
          </div>
          <p class="mt-3 text-xs text-slate-400">Quantidade vem das linhas conciliadas com o canal nativo do IDWorks. O espelho atual do Bling ainda não entrega linhas de itens.</p>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Exceções ERP atuais</p>
            <h2 class="mt-1 text-sm font-semibold text-slate-900">Somente IDWorks marketplaces e Bling Site/Yampi</h2>
          </div>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{{ currentErpIssues.length }}</span>
        </div>

        <div v-if="currentErpIssues.length === 0" class="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
          Nenhuma exceção ativa dos ERPs no modelo atual.
        </div>

        <div v-else class="mt-4 divide-y divide-slate-100">
          <div v-for="issue in currentErpIssues" :key="`${issue.provider}-${issue.id}`" class="py-3 first:pt-0 last:pb-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-slate-900">{{ issueTitle(issue) }}</span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="issue.health_status === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">
                {{ issue.health_status === 'error' ? 'Erro' : 'Pendente' }}
              </span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-500">{{ issue.provider || 'ERP' }}</span>
            </div>
            <p class="mt-1 text-sm text-slate-600">{{ issueDescription(issue) }}</p>
            <p v-if="issue.last_error_at || issue.last_event_error_at" class="mt-1 text-xs text-slate-400">
              {{ formatDateTime(issue.last_event_error_at || issue.last_error_at) }}
            </p>
          </div>
        </div>
      </div>

      <details class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary class="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-700">
          Fila técnica completa · estoque, auditoria e histórico legado
        </summary>
        <div class="border-t border-slate-100">
          <Operations />
        </div>
      </details>
    </section>
  </div>
</template>
