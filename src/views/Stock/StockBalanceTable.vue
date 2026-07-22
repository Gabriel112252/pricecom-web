<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { formatStockQty, stockDifferenceClass, formatStockDifference } from '@/lib/format'
import StockProductDetailModal from './StockProductDetailModal.vue'
import StockChannelSkuRow from './StockChannelSkuRow.vue'

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

const auth = useAuthStore()
const products = ref([])
const meta = ref({})
const loading = ref(true)
const errorMessage = ref('')
const search = ref('')
const channel = ref('')
const connectedChannels = ref([])
const activeChannels = ref(null)
const page = ref(1)
const sortActive = ref(false)
const sortDirection = ref('asc')
const detailProductId = ref(null)
// Chaves (group_key) dos grupos de produto-pai abertos na Visão por canal —
// ver StockOverviewController#channel_group_row_json. Reseta a cada load()
// pra não tentar expandir um grupo que nem existe mais na página atual.
const expandedGroups = ref(new Set())

const isChannelView = computed(() => !!channel.value)

const channels = computed(() => {
  const source = activeChannels.value ?? connectedChannels.value
  return [...new Set(source)].sort((a, b) => channelLabel(a).localeCompare(channelLabel(b), 'pt-BR'))
})

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/stock_overview', {
      params: {
        q: search.value || undefined,
        channel: channel.value || undefined,
        sort_by: isChannelView.value && sortActive.value ? channel.value : undefined,
        sort_dir: isChannelView.value && sortActive.value ? sortDirection.value : undefined,
        page: page.value,
        per_page: 50,
      },
    })
    products.value = data.products
    activeChannels.value = Array.isArray(data.active_channels) ? data.active_channels : null
    meta.value = data.meta || {}
    expandedGroups.value = new Set()
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar o estoque.'
  } finally {
    loading.value = false
  }
}

async function loadConnectedChannels() {
  try {
    const { data } = await api.get('/integrations/channels')
    connectedChannels.value = data
      .filter((entry) => entry.status === 'active' && entry.channel !== 'lucrofrete')
      .map((entry) => entry.channel)
  } catch {
    // O endpoint agregado continua sendo a fonte das colunas se esta leitura falhar.
  }
}

onMounted(() => {
  loadConnectedChannels()
  load()
})

let debounceTimer = null
function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
}

function onChannelChange() {
  page.value = 1
  // A ordenação anterior pode ter sido por outro canal — nem sempre faz
  // sentido na nova visão (ex: Visão Central não tem coluna ordenável).
  sortActive.value = false
  load()
}

function goToPage(newPage) {
  if (newPage < 1 || newPage > (meta.value.total_pages || 1)) return
  page.value = newPage
  load()
}

function channelLabel(channelName) {
  return CHANNEL_LABELS[channelName] || channelName
}

function toggleSort() {
  if (sortActive.value) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortActive.value = true
    sortDirection.value = 'asc'
  }
  page.value = 1
  load()
}

function sortIndicator() {
  if (!sortActive.value) return ''
  return sortDirection.value === 'asc' ? '↑' : '↓'
}

// Canais: badge resumido em vez de uma coluna por canal — ver
// StockOverviewController#central_row_json. Divergência tem prioridade
// visual sobre a contagem neutra.
function channelsSummaryLabel(product) {
  const summary = product.channels_summary
  if (!summary || summary.count === 0) return '—'
  if (summary.divergent_count > 0) {
    return summary.divergent_count === 1 ? '1 divergente' : `${summary.divergent_count} divergentes`
  }
  if (summary.count <= 3) return summary.channels.map(channelLabel).join(', ')
  return `${summary.count} canais`
}

function channelsSummaryClass(product) {
  const summary = product.channels_summary
  if (!summary || summary.count === 0) return 'bg-slate-100 text-slate-400'
  if (summary.divergent_count > 0) return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

function openDetail(product) {
  detailProductId.value = product.id
}

function closeDetail() {
  detailProductId.value = null
}

// Produto-pai do canal (ver StockOverviewController#channel_group_row_json)
// — só existe na Visão por canal, e só quando o canal filtrado tem esse
// conceito (TikTok/Shopify/Yampi com variação real); um "grupo" de 1 SKU
// já vem achatado pelo backend como linha solo, então isGroup nunca é true
// pra esse caso.
function isGroup(row) {
  return Array.isArray(row.children)
}

function toggleGroup(row) {
  const key = row.group_key
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key)
  } else {
    expandedGroups.value.add(key)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="search"
        type="text"
        placeholder="Buscar por SKU ou nome..."
        class="w-72 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
        @input="onSearchInput"
      />

      <select
        v-model="channel"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        @change="onChannelChange"
      >
        <option value="">Todos os canais</option>
        <!-- `channels` (not connectedChannels) — same root cause as the
             table columns: /integrations/channels only lists credentials
             with status "active", so a channel with real listings but a
             currently broken credential (ex: TikTok pending/error) would
             disappear from this dropdown too. `channels` already merges
             active credentials with real listing data (see #active_channels
             on StockOverviewController). -->
        <option v-for="c in channels" :key="c" :value="c">{{ channelLabel(c) }}</option>
      </select>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <!-- Visão Central: sem filtro de canal, uma linha por produto com o
         estoque de origem (idworks) e um resumo dos canais. Clicar na
         linha abre o detalhe por canal. -->
    <div v-else-if="!isChannelView" class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-2 text-left font-medium text-slate-600">SKU</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Nome</th>
            <th class="px-4 py-2 text-right font-medium text-slate-600">Estoque</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Canais</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading">
            <td colspan="4" class="px-4 py-6 text-center text-slate-400">Carregando...</td>
          </tr>
          <tr v-else-if="products.length === 0">
            <td colspan="4" class="px-4 py-6 text-center text-slate-400">Nenhum produto encontrado.</td>
          </tr>
          <template v-else>
            <tr
              v-for="product in products"
              :key="product.id"
              class="cursor-pointer hover:bg-slate-50"
              @click="openDetail(product)"
            >
              <td class="px-4 py-2 text-slate-500">{{ product.sku }}</td>
              <td class="px-4 py-2 text-slate-800">{{ product.name }}</td>
              <td class="px-4 py-2 text-right tabular-nums text-slate-700">
                <span v-if="product.has_origin">{{ formatStockQty(product.origin_qty_available) ?? '—' }}</span>
                <span
                  v-else
                  class="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                  title="Produto sem vínculo com o idworks — sem estoque de origem confiável."
                >
                  Sem ERP
                </span>
              </td>
              <td class="px-4 py-2">
                <span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" :class="channelsSummaryClass(product)">
                  {{ channelsSummaryLabel(product) }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Visão por canal: só produtos com listing nesse canal (filtro
         EXISTS já aplicado no backend). Compara direto com a origem. -->
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-2 text-left font-medium text-slate-600">SKU</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Nome</th>
            <th class="px-4 py-2 text-right font-medium text-slate-600">
              <button
                type="button"
                class="inline-flex items-center gap-1 whitespace-nowrap hover:text-indigo-700"
                :title="`Ordenar por estoque ${channelLabel(channel)}`"
                @click="toggleSort"
              >
                Estoque {{ channelLabel(channel) }}
                <span class="text-indigo-500">{{ sortIndicator() }}</span>
              </button>
            </th>
            <th class="px-4 py-2 text-right font-medium text-slate-600">Estoque de origem</th>
            <th class="px-4 py-2 text-right font-medium text-slate-600">Diferença</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading">
            <td colspan="5" class="px-4 py-6 text-center text-slate-400">Carregando...</td>
          </tr>
          <tr v-else-if="products.length === 0">
            <td colspan="5" class="px-4 py-6 text-center text-slate-400">Nenhum produto encontrado neste canal.</td>
          </tr>
          <template v-else>
            <template v-for="row in products" :key="row.group_key || row.id">
              <!-- Linha-pai: produto-pai do canal com 2+ SKUs (ver
                   StockOverviewController#channel_group_row_json). Um grupo
                   de 1 SKU já vem achatado como linha solo pelo backend, e
                   cai no ramo v-else abaixo, idêntico ao de antes do
                   agrupamento existir. -->
              <tr
                v-if="isGroup(row)"
                class="cursor-pointer bg-slate-50 hover:bg-slate-100"
                @click="toggleGroup(row)"
              >
                <td class="px-4 py-2 text-slate-800" colspan="2">
                  <span class="inline-flex items-center gap-2">
                    <span class="text-slate-400">{{ expandedGroups.has(row.group_key) ? '▾' : '▸' }}</span>
                    <span class="font-medium">{{ row.name }}</span>
                    <span class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {{ row.sku_count }} SKUs
                    </span>
                  </span>
                </td>
                <td class="px-4 py-2 text-right tabular-nums font-medium text-slate-700">
                  {{ formatStockQty(row.channel_stock_qty) ?? '—' }}
                </td>
                <td class="px-4 py-2 text-right tabular-nums text-slate-700">
                  <span v-if="row.has_origin">{{ formatStockQty(row.origin_qty_available) ?? '—' }}</span>
                  <span
                    v-else
                    class="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                    title="Nenhum SKU deste grupo tem vínculo com o idworks — sem estoque de origem confiável."
                  >
                    Sem ERP
                  </span>
                </td>
                <td class="px-4 py-2 text-right tabular-nums font-medium" :class="stockDifferenceClass(row)">
                  {{ formatStockDifference(row.difference) }}
                </td>
              </tr>
              <template v-if="isGroup(row) && expandedGroups.has(row.group_key)">
                <StockChannelSkuRow v-for="child in row.children" :key="child.id" :row="child" indent />
              </template>
              <StockChannelSkuRow v-if="!isGroup(row)" :row="row" />
            </template>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="!errorMessage && products.length" class="flex items-center justify-between text-xs text-slate-500">
      <p>Página {{ meta.current_page || 1 }} de {{ meta.total_pages || 1 }} · {{ meta.total_count || 0 }} produtos</p>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="(meta.current_page || 1) <= 1 || loading"
          @click="goToPage((meta.current_page || 1) - 1)"
        >
          Anterior
        </button>
        <button
          type="button"
          class="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="(meta.current_page || 1) >= (meta.total_pages || 1) || loading"
          @click="goToPage((meta.current_page || 1) + 1)"
        >
          Próxima
        </button>
      </div>
    </div>

    <StockProductDetailModal v-if="detailProductId" :product-id="detailProductId" @close="closeDetail" />
  </div>
</template>
