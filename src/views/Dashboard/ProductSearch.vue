<script setup>
import { ref, computed, watch } from 'vue'
import api from '@/lib/api'
import { formatMoney } from '@/lib/format'
import ProductsTimeseriesChart from './ProductsTimeseriesChart.vue'

// Complementa os cards de Top 10 (TopProductsByRevenueChart/
// TopProductsByMarginChart): um produto pode vender bastante em VOLUME sem
// entrar no Top 10 de receita/margem. Busca direta por SKU/nome contra
// GET /dashboard/products_search, que já traz total_qty_sold/total_revenue/
// by_channel prontos por produto — sem paginação separada, é autocomplete
// (até 10 resultados), não ranking.
//
// Seleção é múltipla (chips removíveis, não substitui a anterior): cada
// produto adicionado ganha seu próprio card de detalhe (total + breakdown
// por canal, igual ao comportamento original de 1 produto só) e alimenta o
// gráfico de evolução diária abaixo — mesmo campo de busca serve as duas
// visões, sem duplicar UI de busca em dois lugares da aba.
const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
  channelIds: { type: Array, default: () => [] },
})

const MAX_SELECTED = 6

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
const limitWarning = ref('')
const selectedList = ref([])

const selectedSkus = computed(() => selectedList.value.map((item) => item.sku))

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
  query.value = ''
  results.value = []
  isOpen.value = false

  if (selectedSkus.value.includes(result.sku)) return

  if (selectedList.value.length >= MAX_SELECTED) {
    limitWarning.value = `Máximo de ${MAX_SELECTED} produtos na comparação — remova algum antes de adicionar outro.`
    return
  }

  limitWarning.value = ''
  selectedList.value = [...selectedList.value, result]
}

function removeSelected(sku) {
  selectedList.value = selectedList.value.filter((item) => item.sku !== sku)
  limitWarning.value = ''
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

// Os cards de produtos já selecionados precisam refletir o período/canal
// atuais do dashboard, não os que estavam ativos no momento da busca.
// Promise.all em vez de sequencial: N produtos selecionados não devem
// serializar N requisições.
watch(
  () => [props.from, props.to, props.channelIds],
  async () => {
    if (!selectedList.value.length) return
    const refreshed = await Promise.all(
      selectedList.value.map(async (item) => {
        const matches = await search(item.sku)
        return matches.find((r) => r.sku === item.sku) || item
      }),
    )
    selectedList.value = refreshed
  },
  { deep: true },
)
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Buscar produtos</h3>
    <p class="mt-0.5 text-xs text-slate-400">
      Quantidade e receita de um ou mais produtos específicos no período, mesmo fora do Top 10 acima.
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
            :class="{ 'bg-slate-50 text-slate-400': selectedSkus.includes(result.sku) }"
            @mousedown.prevent="selectResult(result)"
          >
            <span class="text-slate-500">{{ result.sku }}</span>
            <span> — {{ result.name }}</span>
            <span v-if="selectedSkus.includes(result.sku)" class="ml-1 text-xs">(já selecionado)</span>
          </button>
        </template>
      </div>
    </div>

    <p v-if="errorMessage" class="mt-2 text-sm text-red-600">{{ errorMessage }}</p>
    <p v-if="limitWarning" class="mt-2 text-sm text-amber-600">{{ limitWarning }}</p>

    <div v-if="selectedList.length" class="mt-3 flex flex-wrap gap-2">
      <span
        v-for="item in selectedList"
        :key="item.sku"
        class="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 py-1 pl-3 pr-1.5 text-xs font-medium text-indigo-700"
      >
        {{ item.sku }} — {{ item.name }}
        <button
          type="button"
          class="rounded-full p-0.5 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-800"
          :aria-label="`Remover ${item.name} da comparação`"
          @click="removeSelected(item.sku)"
        >
          <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path
              d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
            />
          </svg>
        </button>
      </span>
    </div>

    <div v-if="selectedList.length" class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div v-for="item in selectedList" :key="item.sku" class="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p class="text-sm font-medium text-slate-800">{{ item.name }}</p>
        <p class="text-xs text-slate-500">SKU {{ item.sku }}</p>

        <div class="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-slate-500">Quantidade total vendida</p>
            <p class="text-2xl font-semibold tabular-nums text-slate-900">{{ formatQty(item.total_qty_sold) }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Receita total</p>
            <p class="text-2xl font-semibold tabular-nums text-slate-900">{{ formatMoney(item.total_revenue) }}</p>
          </div>
        </div>

        <table v-if="item.by_channel.length" class="mt-4 w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="pb-2 pr-2">Canal</th>
              <th class="pb-2 pr-2 text-right">Pedidos</th>
              <th class="pb-2 pr-2 text-right">Quantidade</th>
              <th class="pb-2 text-right">Receita</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in item.by_channel" :key="row.platform">
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
    <p v-else class="mt-3 text-sm text-slate-500">Busque por SKU ou nome para adicionar produtos à comparação.</p>
  </div>

  <ProductsTimeseriesChart class="mt-6" :skus="selectedSkus" :from="from" :to="to" :channel-ids="channelIds" />
</template>
