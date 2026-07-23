<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '@/lib/api'
import { formatMoneyOrDash, formatPctOrDash, formatDateTime } from '@/lib/format'
import { financialStatusBadge, financialStatusLabel } from './lib/tiktokFinancial'

const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
  channelIds: { type: Array, default: () => [] },
})

const SORT_COLUMNS = [
  { key: 'ordered_at', label: 'Data' },
  { key: 'revenue', label: 'Receita' },
  { key: 'settlement', label: 'Liquidado' },
  { key: 'fees', label: 'Taxas' },
  { key: 'profit', label: 'Lucro' },
  { key: 'margin_pct', label: 'Margem' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'synced', label: 'Sincronizado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'refunded', label: 'Estornado' },
  { value: 'partial', label: 'Parcial' },
  { value: 'error', label: 'Com erro' },
]

const loading = ref(false)
const errorMessage = ref('')
const rows = ref([])
const meta = ref({})
const page = ref(1)
const sort = ref('ordered_at')
const direction = ref('desc')

const filters = ref({
  order_number: '',
  financial_status: '',
  affiliate: '',
  subsidy: '',
  seller_discount: '',
  margin: '',
})

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/dashboard/tiktok_orders', {
      params: {
        from: props.from,
        to: props.to,
        channel_ids: props.channelIds,
        page: page.value,
        sort: sort.value,
        direction: direction.value,
        order_number: filters.value.order_number || undefined,
        financial_status: filters.value.financial_status || undefined,
        affiliate: filters.value.affiliate || undefined,
        subsidy: filters.value.subsidy || undefined,
        seller_discount: filters.value.seller_discount || undefined,
        margin: filters.value.margin || undefined,
      },
    })
    rows.value = data.rows || []
    meta.value = data.meta || {}
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar os pedidos TikTok.'
  } finally {
    loading.value = false
  }
}

function reloadFromFirstPage() {
  page.value = 1
  load()
}

function toggleSort(key) {
  if (sort.value === key) {
    direction.value = direction.value === 'asc' ? 'desc' : 'asc'
  } else {
    sort.value = key
    direction.value = 'desc'
  }
  reloadFromFirstPage()
}

function sortIndicator(key) {
  if (sort.value !== key) return ''
  return direction.value === 'asc' ? '↑' : '↓'
}

function goToPage(nextPage) {
  if (nextPage < 1 || nextPage > (meta.value.total_pages || 1)) return
  page.value = nextPage
  load()
}

watch(
  () => [props.from, props.to, props.channelIds],
  () => reloadFromFirstPage(),
)

onMounted(load)
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="space-y-3 border-b border-slate-200 p-5">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Pedidos TikTok Shop</h3>
        <p class="mt-0.5 text-xs text-slate-400">{{ meta.total_count || 0 }} pedidos no período</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="filters.order_number"
          type="text"
          placeholder="Buscar pedido"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          @change="reloadFromFirstPage"
        />
        <select
          v-model="filters.financial_status"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          @change="reloadFromFirstPage"
        >
          <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <select
          v-model="filters.affiliate"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          @change="reloadFromFirstPage"
        >
          <option value="">Afiliado (todos)</option>
          <option value="with">Com afiliado</option>
          <option value="without">Sem afiliado</option>
        </select>
        <select
          v-model="filters.subsidy"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          @change="reloadFromFirstPage"
        >
          <option value="">Subsídio (todos)</option>
          <option value="with">Com subsídio</option>
        </select>
        <select
          v-model="filters.seller_discount"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          @change="reloadFromFirstPage"
        >
          <option value="">Desconto vendedor (todos)</option>
          <option value="with">Com desconto</option>
        </select>
        <select
          v-model="filters.margin"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          @change="reloadFromFirstPage"
        >
          <option value="">Margem (todas)</option>
          <option value="positive">Margem positiva</option>
          <option value="negative">Margem negativa</option>
        </select>
      </div>
    </div>

    <div v-if="errorMessage" class="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div v-else class="overflow-x-auto" :class="{ 'opacity-60': loading }">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr class="text-left text-xs font-semibold uppercase text-slate-500">
            <th class="px-4 py-3">Pedido</th>
            <th v-for="col in SORT_COLUMNS" :key="col.key" class="px-4 py-3 text-right">
              <button type="button" class="inline-flex items-center gap-1" @click="toggleSort(col.key)">
                {{ col.label }} <span class="text-indigo-500">{{ sortIndicator(col.key) }}</span>
              </button>
            </th>
            <th class="px-4 py-3 text-right">Comissão afiliado</th>
            <th class="px-4 py-3 text-right">Comissão plataforma</th>
            <th class="px-4 py-3 text-right">Custo</th>
            <th class="px-4 py-3">Status financeiro</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading && !rows.length">
            <td colspan="12" class="px-4 py-8 text-center text-slate-400">Carregando pedidos...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="12" class="px-4 py-8 text-center text-slate-400">Nenhum pedido TikTok encontrado no período.</td>
          </tr>
          <tr v-for="row in rows" :key="row.id" class="text-slate-600">
            <td class="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{{ row.order_number || '—' }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatDateTime(row.ordered_at) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatMoneyOrDash(row.effective_revenue) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatMoneyOrDash(row.settlement_amount) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatMoneyOrDash(row.fees_total) }}</td>
            <td
              class="px-4 py-3 text-right font-semibold whitespace-nowrap"
              :class="Number(row.profit) < 0 ? 'text-red-600' : 'text-emerald-700'"
            >
              {{ row.profit == null ? '—' : formatMoneyOrDash(row.profit) }}
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatPctOrDash(row.margin_pct) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatMoneyOrDash(row.affiliate_commission) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatMoneyOrDash(row.platform_commission) }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">{{ formatMoneyOrDash(row.product_cost) }}</td>
            <td class="px-4 py-3 whitespace-nowrap">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset"
                :class="financialStatusBadge(row.financial_status).classes"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="financialStatusBadge(row.financial_status).dot"></span>
                {{ financialStatusLabel(row.financial_status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
        :disabled="(meta.current_page || 1) <= 1 || loading"
        @click="goToPage((meta.current_page || 1) - 1)"
      >
        Anterior
      </button>
      <span>Página {{ meta.current_page || 1 }} de {{ meta.total_pages || 1 }}</span>
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
        :disabled="(meta.current_page || 1) >= (meta.total_pages || 1) || loading"
        @click="goToPage((meta.current_page || 1) + 1)"
      >
        Próxima
      </button>
    </div>
  </div>
</template>
