<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '@/lib/api'
import { formatMoney, formatDateTime } from '@/lib/format'

const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
  channelIds: { type: Array, default: () => [] },
})

const loading = ref(false)
const errorMessage = ref('')
const rows = ref([])
const meta = ref({})
const coverage = ref({})
const page = ref(1)
const sort = ref('freight_margin')
const direction = ref('asc')

const SORTABLE_COLUMNS = [
  { key: 'ordered_at', label: 'Data' },
  { key: 'freight', label: 'Frete cobrado' },
  { key: 'real_freight_cost', label: 'Custo real' },
  { key: 'freight_margin', label: 'Margem' },
]

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/dashboard/freight_orders', {
      params: {
        from: props.from,
        to: props.to,
        channel_ids: props.channelIds,
        page: page.value,
        sort: sort.value,
        direction: direction.value,
      },
    })
    rows.value = data.rows || []
    meta.value = data.meta || {}
    coverage.value = data.coverage || {}
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar os pedidos de frete.'
  } finally {
    loading.value = false
  }
}

function toggleSort(key) {
  if (sort.value === key) {
    direction.value = direction.value === 'asc' ? 'desc' : 'asc'
  } else {
    sort.value = key
    direction.value = 'asc'
  }
  page.value = 1
  load()
}

function sortIndicator(key) {
  if (sort.value !== key) return ''
  return direction.value === 'asc' ? '↑' : '↓'
}

function goToPage(newPage) {
  if (newPage < 1 || newPage > (meta.value.total_pages || 1)) return
  page.value = newPage
  load()
}

watch(
  () => [props.from, props.to, props.channelIds],
  () => {
    page.value = 1
    load()
  },
)

onMounted(load)

const coverageLabel = computed(() => {
  const total = Number(coverage.value.total || 0)
  const withCost = Number(coverage.value.with_real_cost || 0)
  return `${withCost} de ${total} pedidos com dado de frete real`
})
const hasMissingCoverage = computed(() => Number(coverage.value.without_real_cost || 0) > 0)
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Pedidos por margem de frete</h3>
        <p class="mt-0.5 text-xs text-slate-400">Frete cobrado x custo real por pedido · piores prejuízos primeiro</p>
      </div>
      <div class="text-right text-xs">
        <p class="font-medium text-slate-700">{{ coverageLabel }}</p>
        <p v-if="hasMissingCoverage" class="mt-0.5 text-amber-600">
          {{ coverage.without_real_cost }} pedido(s) sem custo real (fora da tabela)
        </p>
      </div>
    </div>

    <div v-if="errorMessage" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {{ errorMessage }}
    </div>
    <div v-else-if="loading && !rows.length" class="mt-4 py-10 text-center text-sm text-slate-400">
      Carregando pedidos...
    </div>
    <div v-else-if="!rows.length" class="mt-4 py-10 text-center text-sm text-slate-400">
      Nenhum pedido com custo real de frete no período.
    </div>
    <template v-else>
      <div class="mt-4 overflow-x-auto" :class="{ 'opacity-60': loading }">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th class="py-2 pr-3 font-semibold">Pedido</th>
              <th class="py-2 pr-3 font-semibold">Cliente</th>
              <th
                v-for="col in SORTABLE_COLUMNS"
                :key="col.key"
                class="cursor-pointer select-none py-2 pr-3 font-semibold hover:text-slate-700"
                @click="toggleSort(col.key)"
              >
                {{ col.label }} <span class="text-indigo-500">{{ sortIndicator(col.key) }}</span>
              </th>
              <th class="py-2 font-semibold">UF</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-b border-slate-100">
              <td class="py-2 pr-3 font-medium text-slate-900">{{ row.order_number || '—' }}</td>
              <td class="max-w-[180px] truncate py-2 pr-3 text-slate-600" :title="row.customer_name">
                {{ row.customer_name || '—' }}
              </td>
              <td class="whitespace-nowrap py-2 pr-3 text-slate-600">{{ formatDateTime(row.ordered_at) }}</td>
              <td class="whitespace-nowrap py-2 pr-3 text-slate-900">{{ formatMoney(row.freight) }}</td>
              <td class="whitespace-nowrap py-2 pr-3 text-slate-900">{{ formatMoney(row.real_freight_cost) }}</td>
              <td
                class="whitespace-nowrap py-2 pr-3 font-semibold"
                :class="Number(row.freight_margin) < 0 ? 'text-red-600' : 'text-emerald-700'"
              >
                {{ formatMoney(row.freight_margin) }}
              </td>
              <td class="py-2 text-slate-600">{{ row.state || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center justify-between text-xs text-slate-500">
        <p>
          Página {{ meta.current_page || 1 }} de {{ meta.total_pages || 1 }} · {{ meta.total_count || 0 }} pedidos
        </p>
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
    </template>
  </div>
</template>
