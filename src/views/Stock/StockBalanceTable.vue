<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api'

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

const products = ref([])
const meta = ref({})
const loading = ref(true)
const errorMessage = ref('')
const search = ref('')
const channel = ref('')
const connectedChannels = ref([])
const page = ref(1)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/stock_overview', {
      params: { q: search.value || undefined, channel: channel.value || undefined, page: page.value, per_page: 50 },
    })
    products.value = data.products
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
    connectedChannels.value = data.filter((c) => c.status === 'active').map((c) => c.channel)
  } catch {
    // dropdown de canal fica só com "Todos" — não bloqueia o resto da tela
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

// Sem regra pra esse produto/canal = sem indicador (não inventamos um
// limite default). Com regra: só distinguimos normal/crítico — "atenção"
// exigiria um segundo limiar que StockAlertRule não tem hoje (só
// min_threshold), então não foi inventado.
function channelStatus(entry) {
  if (entry.min_threshold == null) return 'unknown'
  return Number(entry.stock_qty) <= Number(entry.min_threshold) ? 'critical' : 'normal'
}

function badgeClass(entry) {
  const status = channelStatus(entry)
  if (status === 'critical') return 'bg-red-100 text-red-700'
  if (status === 'normal') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-600'
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
        <option v-for="c in connectedChannels" :key="c" :value="c">{{ CHANNEL_LABELS[c] || c }}</option>
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
            <tr v-for="product in products" :key="product.id">
              <td class="px-4 py-2 text-slate-500">{{ product.sku }}</td>
              <td class="px-4 py-2 text-slate-800">{{ product.name }}</td>
              <td class="px-4 py-2 text-right tabular-nums text-slate-700">{{ product.qty_available ?? '—' }}</td>
              <td class="px-4 py-2">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="entry in product.channels"
                    :key="entry.channel"
                    class="rounded-full px-2 py-0.5 text-xs font-medium"
                    :class="badgeClass(entry)"
                    :title="entry.min_threshold != null ? `mínimo configurado: ${entry.min_threshold}` : 'sem regra de alerta configurada'"
                  >
                    {{ CHANNEL_LABELS[entry.channel] || entry.channel }}: {{ entry.stock_qty }}
                  </span>
                  <span v-if="!product.channels?.length" class="text-slate-300">—</span>
                </div>
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
