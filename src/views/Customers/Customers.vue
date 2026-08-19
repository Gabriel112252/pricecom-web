<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Download, Filter, Info, RefreshCw, Search, X } from '@lucide/vue'
import api from '@/lib/api'
import { formatMoney, formatPct } from '@/lib/format'
import PageHeader from '@/components/PageHeader.vue'
import TabNav from '@/components/TabNav.vue'
import CustomersTab from '@/views/Dashboard/CustomersTab.vue'

const TABS = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'base', label: 'Base de clientes' },
  { key: 'rfm', label: 'RFM' },
]

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

const today = new Date()
const ninetyDaysAgo = new Date()
ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89)

const activeTab = ref('overview')
const overview = ref(null)
const rfm = ref(null)
const channels = ref([])
const loadingOverview = ref(false)
const loadingBase = ref(false)
const loadingRfm = ref(false)
const exporting = ref(false)
const errorMessage = ref('')

const repurchaseFrom = ref(isoDate(ninetyDaysAgo))
const repurchaseTo = ref(isoDate(today))

const rows = ref([])
const meta = ref({ page: 1, per_page: 50, total: 0, total_pages: 0 })

const filters = ref({
  q: '',
  min_total_spent: '',
  max_total_spent: '',
  min_average_ticket: '',
  min_orders: '',
  min_recency_days: '',
  max_recency_days: '',
  repeat: '',
  purchased_sku: '',
  never_purchased_sku: '',
  state: '',
  first_channel_id: '',
  sort: 'total_spent',
  direction: 'desc',
})

const hasFilters = computed(() =>
  Object.entries(filters.value).some(([key, value]) => !['sort', 'direction'].includes(key) && String(value || '').trim() !== '')
)

const coverageWithIdentity = computed(() =>
  (overview.value?.coverage || []).filter((row) => Number(row.orders_with_identity || 0) > 0)
)

function apiParams(page = meta.value.page || 1) {
  return Object.fromEntries(
    Object.entries({ ...filters.value, page, per_page: meta.value.per_page || 50 })
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )
}

async function loadOverview() {
  loadingOverview.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/customers/overview')
    overview.value = data
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar a visão de clientes.'
  } finally {
    loadingOverview.value = false
  }
}

async function loadBase(page = 1) {
  loadingBase.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/customers', { params: apiParams(page) })
    rows.value = data.rows || []
    meta.value = data.meta || meta.value
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar a base de clientes.'
  } finally {
    loadingBase.value = false
  }
}

async function loadRfm() {
  loadingRfm.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/customers/rfm')
    rfm.value = data
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar o RFM.'
  } finally {
    loadingRfm.value = false
  }
}

async function loadChannels() {
  try {
    const { data } = await api.get('/channels')
    channels.value = Array.isArray(data) ? data : data?.rows || []
  } catch {
    channels.value = []
  }
}

function clearFilters() {
  filters.value = {
    q: '',
    min_total_spent: '',
    max_total_spent: '',
    min_average_ticket: '',
    min_orders: '',
    min_recency_days: '',
    max_recency_days: '',
    repeat: '',
    purchased_sku: '',
    never_purchased_sku: '',
    state: '',
    first_channel_id: '',
    sort: 'total_spent',
    direction: 'desc',
  }
  loadBase(1)
}

function applyPreset(type) {
  clearFiltersWithoutLoad()
  if (type === 'top20' && overview.value?.top20_cutoff != null) {
    filters.value.min_total_spent = overview.value.top20_cutoff
  }
  if (type === 'repeat') filters.value.repeat = 'yes'
  if (type === 'inactive60') filters.value.min_recency_days = 60
  if (type === 'ticket200') filters.value.min_average_ticket = 200
  loadBase(1)
}

function clearFiltersWithoutLoad() {
  filters.value.q = ''
  filters.value.min_total_spent = ''
  filters.value.max_total_spent = ''
  filters.value.min_average_ticket = ''
  filters.value.min_orders = ''
  filters.value.min_recency_days = ''
  filters.value.max_recency_days = ''
  filters.value.repeat = ''
  filters.value.purchased_sku = ''
  filters.value.never_purchased_sku = ''
  filters.value.state = ''
  filters.value.first_channel_id = ''
  filters.value.sort = 'total_spent'
  filters.value.direction = 'desc'
}

async function exportCsv() {
  exporting.value = true
  try {
    const { data } = await api.get('/customers/export', { params: apiParams(1), responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `clientes-${isoDate(new Date())}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível exportar a base.'
  } finally {
    exporting.value = false
  }
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function customerName(row) {
  return row.name || row.email || 'Cliente sem nome'
}

function skuPreview(row) {
  const skus = row.purchased_skus || []
  if (!skus.length) return '—'
  const visible = skus.slice(0, 3).join(', ')
  return skus.length > 3 ? `${visible} +${skus.length - 3}` : visible
}

watch(activeTab, (tab) => {
  if (tab === 'base' && !rows.value.length) loadBase(1)
  if (tab === 'rfm' && !rfm.value) loadRfm()
})

onMounted(() => {
  loadOverview()
  loadChannels()
})
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader
      title="Clientes"
      subtitle="Entenda quem compra, quem volta e quais grupos merecem atenção agora."
    />

    <TabNav v-model="activeTab" :tabs="TABS" />

    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <section v-show="activeTab === 'overview'" class="space-y-6">
      <div v-if="loadingOverview && !overview" class="text-sm text-slate-500">Carregando clientes...</div>

      <template v-else-if="overview">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">Clientes identificados</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ overview.total_customers.toLocaleString('pt-BR') }}</p>
            <p class="mt-2 text-xs text-slate-500">Histórico consolidado por e-mail</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">Clientes que recompraram</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ formatPct(overview.repeat_customer_rate, 1) }}</p>
            <p class="mt-2 text-xs text-slate-500">{{ overview.repeat_customers.toLocaleString('pt-BR') }} clientes com 2+ compras</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">Ticket médio</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ formatMoney(overview.average_order_ticket) }}</p>
            <p class="mt-2 text-xs text-slate-500">Valor médio por pedido desses clientes</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">Tempo mediano até recompra</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">
              {{ overview.median_repurchase_days == null ? '—' : `${Number(overview.median_repurchase_days).toFixed(1)} dias` }}
            </p>
            <p class="mt-2 text-xs text-slate-500">Mediana entre compras consecutivas</p>
          </article>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">Valor médio por cliente</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ formatMoney(overview.average_customer_value) }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">Top 20% da base</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ formatPct(overview.top20_revenue_share, 1) }} da receita</p>
            <p class="mt-1 text-xs text-slate-500">Corte atual a partir de {{ formatMoney(overview.top20_cutoff) }} acumulados</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">Novos nos últimos 30 dias</p>
            <p class="mt-2 text-2xl font-semibold text-slate-900">{{ overview.new_customers_30d.toLocaleString('pt-BR') }}</p>
          </article>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-start gap-3">
            <Info class="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
            <div>
              <h3 class="font-semibold text-slate-900">Cobertura da identificação</h3>
              <p class="mt-1 text-sm text-slate-600">{{ overview.note }}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <span
                  v-for="channel in coverageWithIdentity"
                  :key="channel.channel_id"
                  class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {{ channel.channel_name || channel.platform }} · {{ channel.coverage_pct }}% com identificação
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="mb-3">
            <h2 class="text-lg font-semibold text-slate-900">Recompra</h2>
            <p class="text-sm text-slate-500">Evolução dos últimos 90 dias e histórico de produtos mais recomprados.</p>
          </div>
          <CustomersTab :from="repurchaseFrom" :to="repurchaseTo" />
        </div>
      </template>
    </section>

    <section v-show="activeTab === 'base'" class="space-y-5">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Encontre o grupo de clientes que você precisa</h2>
            <p class="mt-1 text-sm text-slate-500">Combine filtros e transforme uma pergunta comercial em uma lista concreta.</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            :disabled="exporting || loadingBase"
            @click="exportCsv"
          >
            <Download class="h-4 w-4" />
            {{ exporting ? 'Exportando...' : 'Exportar CSV' }}
          </button>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <button class="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100" @click="applyPreset('top20')">Top 20% clientes</button>
          <button class="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100" @click="applyPreset('repeat')">Comprou 2x ou mais</button>
          <button class="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100" @click="applyPreset('inactive60')">Sem comprar há 60+ dias</button>
          <button class="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100" @click="applyPreset('ticket200')">Ticket acima de R$ 200</button>
        </div>

        <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label class="relative xl:col-span-2">
            <Search class="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input v-model="filters.q" type="text" placeholder="Nome ou e-mail" class="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm" @keyup.enter="loadBase(1)" />
          </label>
          <input v-model="filters.min_total_spent" type="number" min="0" step="0.01" placeholder="Gastou pelo menos R$" class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <input v-model="filters.min_average_ticket" type="number" min="0" step="0.01" placeholder="Ticket médio acima de R$" class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <input v-model="filters.min_orders" type="number" min="1" placeholder="Mínimo de compras" class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <input v-model="filters.min_recency_days" type="number" min="0" placeholder="Sem comprar há pelo menos X dias" class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <input v-model="filters.max_recency_days" type="number" min="0" placeholder="Comprou nos últimos X dias" class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <select v-model="filters.repeat" class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">Qualquer frequência</option>
            <option value="yes">Já recomprou</option>
            <option value="no">Comprou uma vez</option>
          </select>
          <input v-model.trim="filters.purchased_sku" type="text" placeholder="Comprou o SKU..." class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <input v-model.trim="filters.never_purchased_sku" type="text" placeholder="Nunca comprou o SKU..." class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <input v-model.trim="filters.state" type="text" maxlength="2" placeholder="UF (ex.: SP)" class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase" />
          <select v-model="filters.first_channel_id" class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">Qualquer canal de entrada</option>
            <option v-for="channel in channels" :key="channel.id" :value="channel.id">{{ channel.name || channel.platform }}</option>
          </select>
          <select v-model="filters.sort" class="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
            <option value="total_spent">Ordenar por valor gasto</option>
            <option value="orders_count">Ordenar por compras</option>
            <option value="average_ticket">Ordenar por ticket médio</option>
            <option value="last_purchase_at">Ordenar por última compra</option>
            <option value="recency_days">Ordenar por dias sem comprar</option>
          </select>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700" @click="loadBase(1)">
            <Filter class="h-4 w-4" /> Aplicar filtros
          </button>
          <button v-if="hasFilters" type="button" class="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800" @click="clearFilters">
            <X class="h-4 w-4" /> Limpar
          </button>
          <span v-if="meta.total" class="text-sm text-slate-500"><strong class="text-slate-900">{{ meta.total.toLocaleString('pt-BR') }}</strong> clientes encontrados</span>
        </div>
      </div>

      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div v-if="loadingBase" class="p-8 text-center text-sm text-slate-500">Buscando clientes...</div>
        <div v-else-if="!rows.length" class="p-8 text-center text-sm text-slate-500">Nenhum cliente encontrado com esses filtros.</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-4 py-3">Cliente</th>
                <th class="px-4 py-3">Compras</th>
                <th class="px-4 py-3">Valor total</th>
                <th class="px-4 py-3">Ticket médio</th>
                <th class="px-4 py-3">Última compra</th>
                <th class="px-4 py-3">Entrada</th>
                <th class="px-4 py-3">Produtos</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="row in rows" :key="row.customer_key" class="hover:bg-slate-50/70">
                <td class="px-4 py-3">
                  <div class="font-medium text-slate-900">{{ customerName(row) }}</div>
                  <div class="text-xs text-slate-500">{{ row.email }}</div>
                  <div v-if="row.state" class="mt-0.5 text-xs text-slate-400">{{ row.state }}</div>
                </td>
                <td class="px-4 py-3 font-medium text-slate-800">{{ row.orders_count }}</td>
                <td class="px-4 py-3 font-medium text-slate-900">{{ formatMoney(row.total_spent) }}</td>
                <td class="px-4 py-3 text-slate-700">{{ formatMoney(row.average_ticket) }}</td>
                <td class="px-4 py-3">
                  <div class="text-slate-800">{{ formatDate(row.last_purchase_at) }}</div>
                  <div class="text-xs text-slate-500">há {{ row.recency_days }} dia(s)</div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-slate-800">{{ row.first_channel?.name || row.first_channel?.platform || '—' }}</div>
                  <div class="text-xs text-slate-500">{{ row.first_sku || 'SKU não identificado' }}</div>
                </td>
                <td class="max-w-xs px-4 py-3 text-xs text-slate-600">{{ skuPreview(row) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="meta.total_pages > 1" class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <button class="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40" :disabled="meta.page <= 1 || loadingBase" @click="loadBase(meta.page - 1)">Anterior</button>
          <span class="text-slate-500">Página {{ meta.page }} de {{ meta.total_pages }}</span>
          <button class="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40" :disabled="meta.page >= meta.total_pages || loadingBase" @click="loadBase(meta.page + 1)">Próxima</button>
        </div>
      </div>
    </section>

    <section v-show="activeTab === 'rfm'" class="space-y-5">
      <div v-if="loadingRfm && !rfm" class="text-sm text-slate-500">Calculando RFM...</div>
      <template v-else-if="rfm">
        <div class="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <div class="flex items-start gap-3">
            <Info class="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" />
            <div>
              <h2 class="font-semibold text-indigo-950">{{ rfm.title }}</h2>
              <p class="mt-1 text-sm leading-6 text-indigo-900">{{ rfm.explanation }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-semibold text-slate-900">R · Recência</p>
            <p class="mt-2 text-sm text-slate-600">Há quanto tempo o cliente comprou.</p>
            <span class="mt-4 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Score aguardando ciclo de reposição</span>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-semibold text-slate-900">F · Frequência</p>
            <p class="mt-2 text-sm text-slate-600">Quantas compras o cliente já fez.</p>
            <p class="mt-4 text-xs text-slate-500">{{ rfm.scores.frequency.rule }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-semibold text-slate-900">M · Valor</p>
            <p class="mt-2 text-sm text-slate-600">Quanto o cliente já deixou na marca.</p>
            <p class="mt-4 text-xs text-slate-500">{{ rfm.scores.monetary.rule }}</p>
          </article>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">Base com 2+ compras</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ formatPct(rfm.maturity.f2_plus_pct, 2) }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ rfm.maturity.customers_f2_plus.toLocaleString('pt-BR') }} de {{ rfm.maturity.total_customers.toLocaleString('pt-BR') }} clientes</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">Gatilho para RFM completo</p>
            <p class="mt-2 text-3xl font-semibold text-slate-900">{{ formatPct(rfm.maturity.full_rfm_trigger_pct, 0) }}</p>
            <p class="mt-1 text-xs text-slate-500">Quando a frequência tiver variação suficiente para segmentação completa.</p>
          </article>
        </div>

        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 class="font-semibold text-slate-900">Maiores valores da base</h3>
              <p class="text-xs text-slate-500">RFM parcial: R em dias, F e M pontuados de 1 a 5.</p>
            </div>
            <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Atualizar" @click="loadRfm"><RefreshCw class="h-4 w-4" /></button>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 text-sm">
              <thead class="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-4 py-3">Cliente</th>
                  <th class="px-4 py-3">Recência</th>
                  <th class="px-4 py-3">F</th>
                  <th class="px-4 py-3">M</th>
                  <th class="px-4 py-3">FM</th>
                  <th class="px-4 py-3">Compras</th>
                  <th class="px-4 py-3">Valor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="row in rfm.rows" :key="row.customer_key">
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-900">{{ row.name || row.email }}</div>
                    <div class="text-xs text-slate-500">{{ row.email }}</div>
                  </td>
                  <td class="px-4 py-3 text-slate-700">{{ row.recency_days }} dias</td>
                  <td class="px-4 py-3"><span class="rounded-md bg-slate-100 px-2 py-1 font-semibold">{{ row.score_f }}</span></td>
                  <td class="px-4 py-3"><span class="rounded-md bg-slate-100 px-2 py-1 font-semibold">{{ row.score_m }}</span></td>
                  <td class="px-4 py-3"><span class="rounded-md bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">{{ row.score_fm }}</span></td>
                  <td class="px-4 py-3">{{ row.orders_count }}</td>
                  <td class="px-4 py-3 font-medium text-slate-900">{{ formatMoney(row.total_spent) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>
