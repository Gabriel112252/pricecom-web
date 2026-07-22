<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatStockQty } from '@/lib/format'

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

const auth = useAuthStore()
const toast = useToast()
const products = ref([])
const meta = ref({})
const loading = ref(true)
const errorMessage = ref('')
const search = ref('')
const channel = ref('')
const connectedChannels = ref([])
const activeChannels = ref(null)
const page = ref(1)
const sortChannel = ref(null)
const sortDirection = ref('asc')
const editingKey = ref(null)
const editValue = ref('')
const updatingKey = ref(null)

const channels = computed(() => {
  const listingChannels = new Set(
    products.value.flatMap((product) => (product.channels || []).map((entry) => entry.channel)),
  )
  // The aggregate endpoint is authoritative: a stale listing from a
  // disconnected channel must not resurrect a column. The fallback only
  // supports older API responses that predate active_channels.
  const configuredChannels = activeChannels.value === null ? connectedChannels.value : activeChannels.value
  const source = configuredChannels.length || activeChannels.value !== null ? configuredChannels : [...listingChannels]

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
        sort_by: sortChannel.value || undefined,
        sort_dir: sortChannel.value ? sortDirection.value : undefined,
        page: page.value,
        per_page: 50,
      },
    })
    products.value = data.products
    activeChannels.value = Array.isArray(data.active_channels) ? data.active_channels : null
    meta.value = data.meta || {}
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

function channelEntry(product, channelName) {
  return product.channels?.find((entry) => entry.channel === channelName)
}

function cellKey(product, channelName) {
  return `${product.id}:${channelName}`
}

function toggleSort(channelName) {
  if (sortChannel.value === channelName) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortChannel.value = channelName
    sortDirection.value = 'asc'
  }
  page.value = 1
  load()
}

function sortIndicator(channelName) {
  if (sortChannel.value !== channelName) return ''
  return sortDirection.value === 'asc' ? '↑' : '↓'
}

function channelStatus(entry) {
  if (!entry || entry.min_threshold == null) return 'unknown'
  return Number(entry.stock_qty) <= Number(entry.min_threshold) ? 'critical' : 'normal'
}

function valueClass(entry) {
  const status = channelStatus(entry)
  if (status === 'critical') return 'text-red-700'
  if (status === 'normal') return 'text-emerald-700'
  return 'text-slate-700'
}

function startEdit(product, channelName) {
  const entry = channelEntry(product, channelName)
  if (!auth.isAdmin || !entry?.listing_id || updatingKey.value) return

  editingKey.value = cellKey(product, channelName)
  editValue.value = formatStockQty(entry.stock_qty) ?? ''
}

function cancelEdit() {
  if (updatingKey.value) return
  editingKey.value = null
  editValue.value = ''
}

async function confirmEdit(product, channelName) {
  const key = cellKey(product, channelName)
  if (editingKey.value !== key || updatingKey.value === key) return

  const entry = channelEntry(product, channelName)
  const requestedQuantity = editValue.value
  if (!entry?.listing_id || requestedQuantity === '' || Number.isNaN(Number(requestedQuantity)) || Number(requestedQuantity) < 0) {
    cancelEdit()
    toast.error('Informe uma quantidade maior ou igual a zero.')
    return
  }

  editingKey.value = null
  updatingKey.value = key

  try {
    const { data } = await api.patch(`/channel_product_listings/${entry.listing_id}`, {
      quantity: requestedQuantity,
    })
    const updatedListing = data.channel_product_listing || data
    entry.stock_qty = updatedListing.stock_qty
  } catch (e) {
    // entry.stock_qty was not changed before the request, so the old value is
    // naturally restored in the cell when the remote write fails.
    toast.error(e.response?.data?.error || 'Não foi possível atualizar o estoque no canal.')
  } finally {
    updatingKey.value = null
    editValue.value = ''
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

    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-2 text-left font-medium text-slate-600">SKU</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Nome</th>
            <th class="px-4 py-2 text-right font-medium text-slate-600">Estoque idworks</th>
            <th v-for="channelName in channels" :key="channelName" class="px-4 py-2 text-right font-medium text-slate-600">
              <button
                type="button"
                class="inline-flex items-center gap-1 whitespace-nowrap hover:text-indigo-700"
                :title="`Ordenar por estoque ${channelLabel(channelName)}`"
                @click="toggleSort(channelName)"
              >
                {{ channelLabel(channelName) }}
                <span class="text-indigo-500">{{ sortIndicator(channelName) }}</span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading">
            <td :colspan="3 + channels.length" class="px-4 py-6 text-center text-slate-400">Carregando...</td>
          </tr>
          <tr v-else-if="products.length === 0">
            <td :colspan="3 + channels.length" class="px-4 py-6 text-center text-slate-400">Nenhum produto encontrado.</td>
          </tr>
          <template v-else>
            <tr v-for="product in products" :key="product.id">
              <td class="px-4 py-2 text-slate-500">{{ product.sku }}</td>
              <td class="px-4 py-2 text-slate-800">{{ product.name }}</td>
              <td class="px-4 py-2 text-right tabular-nums text-slate-700">{{ formatStockQty(product.qty_available) ?? '—' }}</td>
              <td v-for="channelName in channels" :key="channelName" class="px-4 py-2 text-right tabular-nums">
                <template v-if="channelEntry(product, channelName)">
                  <span
                    v-if="updatingKey === cellKey(product, channelName)"
                    class="inline-flex items-center gap-1 text-xs text-indigo-600"
                  >
                    <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Atualizando...
                  </span>
                  <span v-else-if="editingKey === cellKey(product, channelName)" class="inline-flex items-center gap-1">
                    <input
                      v-model="editValue"
                      type="number"
                      min="0"
                      step="any"
                      class="w-20 rounded border border-indigo-400 px-2 py-1 text-right tabular-nums text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      aria-label="Nova quantidade"
                      @keydown.enter.prevent="confirmEdit(product, channelName)"
                      @keydown.esc.prevent="cancelEdit"
                    />
                    <button
                      type="button"
                      class="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                      title="Confirmar"
                      aria-label="Confirmar nova quantidade"
                      @click="confirmEdit(product, channelName)"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      class="rounded p-1 text-red-600 hover:bg-red-50"
                      title="Cancelar"
                      aria-label="Cancelar edição"
                      @click="cancelEdit"
                    >
                      ✕
                    </button>
                  </span>
                  <button
                    v-else-if="auth.isAdmin"
                    type="button"
                    class="rounded px-1.5 py-0.5 font-medium underline decoration-dotted underline-offset-2 hover:bg-indigo-50"
                    :class="valueClass(channelEntry(product, channelName))"
                    :title="`Editar estoque ${channelLabel(channelName)}`"
                    @click="startEdit(product, channelName)"
                  >
                    {{ formatStockQty(channelEntry(product, channelName).stock_qty) ?? '—' }}
                  </button>
                  <span v-else :class="valueClass(channelEntry(product, channelName))">
                    {{ formatStockQty(channelEntry(product, channelName).stock_qty) ?? '—' }}
                  </span>
                </template>
                <span v-else class="text-slate-300">—</span>
              </td>
            </tr>
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
  </div>
</template>
