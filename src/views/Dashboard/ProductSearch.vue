<script setup>
import { ref, watch } from 'vue'
import api from '@/lib/api'
import { formatMoney } from '@/lib/format'

// Complementa os cards de Top 10 (TopProductsByRevenueChart/
// TopProductsByMarginChart): um produto pode vender bastante em VOLUME sem
// entrar no Top 10 de receita/margem. Busca direta por SKU/nome contra
// GET /dashboard/products_search, que já traz total_qty_sold/total_revenue/
// by_channel prontos por produto — sem paginação separada, é autocomplete
// (até 10 resultados), não ranking.
const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
  channelIds: { type: Array, default: () => [] },
})

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

function channelLabel(platform) {
  return CHANNEL_LABELS[platform] || platform
}

function formatQty(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

const query = ref('')
const results = ref([])
const isOpen = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const selected = ref(null)

async function search(term) {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/dashboard/products_search', {
      params: { q: term, from: props.from, to: props.to, channel_ids: props.channelIds },
    })
    return data.results
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível buscar produtos.'
    return []
  } finally {
    loading.value = false
  }
}

let debounceTimer = null
function onInput() {
  selected.value = null
  clearTimeout(debounceTimer)
  const term = query.value.trim()
  if (term.length < 2) {
    results.value = []
    isOpen.value = false
    return
  }
  debounceTimer = setTimeout(async () => {
    results.value = await search(term)
    isOpen.value = true
  }, 300)
}

function selectResult(result) {
  selected.value = result
  query.value = `${result.sku} — ${result.name}`
  results.value = []
  isOpen.value = false
}

function onFocus() {
  if (results.value.length) isOpen.value = true
}

function onBlur() {
  // Atraso pra deixar o @mousedown.prevent do item de resultado rodar antes
  // do dropdown fechar — sem isso o blur fecha a lista antes do clique.
  setTimeout(() => {
    isOpen.value = false
  }, 150)
}

// O painel de um produto já selecionado precisa refletir o período/canal
// atuais do dashboard, não os que estavam ativos no momento da busca.
watch(
  () => [props.from, props.to, props.channelIds],
  async () => {
    if (!selected.value) return
    const matches = await search(selected.value.sku)
    selected.value = matches.find((r) => r.sku === selected.value.sku) || null
  },
  { deep: true },
)
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Buscar produto</h3>
    <p class="mt-0.5 text-xs text-slate-400">
      Quantidade e receita total de um produto específico no período, mesmo fora do Top 10 acima.
    </p>

    <div class="relative mt-3 max-w-md">
      <input
        v-model="query"
        type="text"
        placeholder="Buscar por SKU ou nome..."
        class="w-full rounded-lg border border-slate-300 p-2 text-sm"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />
      <div
        v-if="isOpen && (results.length || loading)"
        class="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
      >
        <div v-if="loading" class="px-3 py-2 text-sm text-slate-400">Buscando...</div>
        <template v-else>
          <div v-if="!results.length" class="px-3 py-2 text-sm text-slate-400">Nenhum produto encontrado.</div>
          <button
            v-for="result in results"
            :key="result.sku"
            type="button"
            class="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
            @mousedown.prevent="selectResult(result)"
          >
            <span class="text-slate-500">{{ result.sku }}</span>
            <span class="text-slate-800"> — {{ result.name }}</span>
          </button>
        </template>
      </div>
    </div>

    <p v-if="errorMessage" class="mt-2 text-sm text-red-600">{{ errorMessage }}</p>

    <div v-if="selected" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p class="text-sm font-medium text-slate-800">{{ selected.name }}</p>
      <p class="text-xs text-slate-500">SKU {{ selected.sku }}</p>

      <div class="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p class="text-xs text-slate-500">Quantidade total vendida</p>
          <p class="text-2xl font-semibold tabular-nums text-slate-900">{{ formatQty(selected.total_qty_sold) }}</p>
        </div>
        <div>
          <p class="text-xs text-slate-500">Receita total</p>
          <p class="text-2xl font-semibold tabular-nums text-slate-900">{{ formatMoney(selected.total_revenue) }}</p>
        </div>
      </div>

      <table v-if="selected.by_channel.length" class="mt-4 w-full text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th class="pb-2 pr-2">Canal</th>
            <th class="pb-2 pr-2 text-right">Pedidos</th>
            <th class="pb-2 pr-2 text-right">Quantidade</th>
            <th class="pb-2 text-right">Receita</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in selected.by_channel" :key="row.platform">
            <td class="py-2 pr-2 text-slate-700">{{ channelLabel(row.platform) }}</td>
            <td class="py-2 pr-2 text-right tabular-nums text-slate-700">{{ row.orders_count }}</td>
            <td class="py-2 pr-2 text-right tabular-nums text-slate-700">{{ formatQty(row.qty_sold) }}</td>
            <td class="py-2 text-right tabular-nums text-slate-700">{{ formatMoney(row.revenue) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="mt-3 text-sm text-slate-500">Nenhuma venda no período/canal selecionados.</p>
    </div>
  </div>
</template>
