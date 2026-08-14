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
const selectedList = ref([])

const selectedSkus = computed(() => selectedList.value.map((item) => item.sku))

// Uma linha por produto+canal (mais granular que o total agregado). Produto
// sem venda no período/canal vira 1 linha com canal "—" em vez de sumir da
// tabela. groupIndex alimenta o fundo alternado entre produtos na template.
const productRowGroups = computed(() =>
  selectedList.value.map((item, groupIndex) => ({
    sku: item.sku,
    name: item.name,
    groupIndex,
    rows: item.by_channel.length
      ? item.by_channel
      : [{ platform: null, orders_count: 0, qty_sold: 0, revenue: 0 }],
  })),
)

// Soma quantidade/receita de todas as linhas produto+canal visíveis na
// tabela. Não soma "Pedidos": um pedido com itens de mais de um produto
// contaria mais de uma vez, o que não é o mesmo que "total de pedidos" —
// só quantidade e receita foram pedidos, e esses somam sem esse problema.
const tableTotals = computed(() =>
  productRowGroups.value.reduce(
    (totals, group) => {
      group.rows.forEach((row) => {
        totals.qty_sold += Number(row.qty_sold || 0)
        totals.revenue += Number(row.revenue || 0)
      })
      return totals
    },
    { qty_sold: 0, revenue: 0 },
  ),
)

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

  selectedList.value = [...selectedList.value, result]
}

function removeSelected(sku) {
  selectedList.value = selectedList.value.filter((item) => item.sku !== sku)
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

    <div v-if="selectedList.length" class="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full min-w-[640px] text-sm">
        <thead>
          <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th class="px-3 py-2">SKU</th>
            <th class="px-3 py-2">Produto</th>
            <th class="px-3 py-2">Canal</th>
            <th class="px-3 py-2 text-right">Pedidos</th>
            <th class="px-3 py-2 text-right">Quantidade</th>
            <th class="px-3 py-2 text-right">Receita</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in productRowGroups" :key="group.sku">
            <tr
              v-for="(row, rowIndex) in group.rows"
              :key="`${group.sku}-${row.platform ?? 'none'}`"
              :class="[
                group.groupIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/60',
                rowIndex === 0 && group.groupIndex > 0 ? 'border-t-2 border-slate-200' : 'border-t border-slate-100',
              ]"
            >
              <td v-if="rowIndex === 0" :rowspan="group.rows.length" class="px-3 py-2 align-top font-medium text-slate-700">
                {{ group.sku }}
              </td>
              <td v-if="rowIndex === 0" :rowspan="group.rows.length" class="px-3 py-2 align-top text-slate-700">
                {{ group.name }}
              </td>
              <td class="px-3 py-2 text-slate-700">{{ row.platform ? channelLabel(row.platform) : '—' }}</td>
              <td class="px-3 py-2 text-right tabular-nums text-slate-700">{{ row.orders_count }}</td>
              <td class="px-3 py-2 text-right tabular-nums text-slate-700">{{ formatQty(row.qty_sold) }}</td>
              <td class="px-3 py-2 text-right tabular-nums text-slate-700">{{ formatMoney(row.revenue) }}</td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="border-t-2 border-slate-300 bg-slate-100 font-semibold text-slate-900">
            <td class="px-3 py-2" colspan="4">Total</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatQty(tableTotals.qty_sold) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatMoney(tableTotals.revenue) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p v-else class="mt-3 text-sm text-slate-500">Busque por SKU ou nome para adicionar produtos à comparação.</p>
  </div>

  <ProductsTimeseriesChart class="mt-6" :skus="selectedSkus" :from="from" :to="to" :channel-ids="channelIds" />
</template>
