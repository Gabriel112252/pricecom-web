<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api from '@/lib/api'
import { formatDateTime, formatMoney } from '@/lib/format'

// Vídeos das criadoras com colaboração direcionada (TikTok Shop).
// "Assistir" abre o vídeo no TikTok; "Baixar" traz o .mp4 guardado no
// Pricecom. Um vídeo que ainda não tem arquivo é pedido à API
// (POST /affiliate_videos/:id/download) e consultado a cada poucos
// segundos até o link aparecer — aí o download começa sozinho.
const ORDER_OPTIONS = [
  { value: 'gmv', label: 'Mais vendidos (GMV)' },
  { value: 'views', label: 'Mais vistos' },
  { value: 'recentes', label: 'Mais recentes' },
]
const POLL_INTERVAL_MS = 4000
const POLL_MAX_ATTEMPTS = 45 // ~3 minutos

const compactNumber = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const shortDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

const loading = ref(false)
const errorMessage = ref('')
const downloadError = ref('')
const rows = ref([])
const meta = ref(null)
const lastSync = ref(null)
const page = ref(1)
const order = ref('gmv')
const creatorQuery = ref('')
const productQuery = ref('')
const onlyDownloaded = ref(false)
const preparing = ref({})
const tableWrapper = ref(null)
const pollTimers = new Map()

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/affiliate_videos', {
      params: {
        ordem: order.value,
        criadora: creatorQuery.value || undefined,
        produto: productQuery.value || undefined,
        somente_baixados: onlyDownloaded.value || undefined,
        page: page.value,
      },
    })
    rows.value = data.rows || []
    meta.value = data.meta || null
    lastSync.value = data.last_sync || null
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar os vídeos.'
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

watch([order, onlyDownloaded], reload)

// Debounced — busca livre não deve disparar uma chamada a cada tecla.
let searchDebounceTimer = null
watch([creatorQuery, productQuery], () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(reload, 400)
})

onMounted(load)

onBeforeUnmount(() => {
  clearTimeout(searchDebounceTimer)
  pollTimers.forEach((timer) => clearTimeout(timer))
  pollTimers.clear()
})

async function goToPage(newPage) {
  if (newPage < 1 || newPage > (meta.value?.total_pages || 1) || loading.value) return
  page.value = newPage
  await load()
  await nextTick()
  tableWrapper.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function setPreparing(id, value) {
  const next = { ...preparing.value }
  if (value) next[id] = true
  else delete next[id]
  preparing.value = next
}

function finishDownload(row, url) {
  row.download_url = url
  row.download_status = 'downloaded'
  setPreparing(row.id, false)
  pollTimers.delete(row.id)
  window.location.href = url
}

function failDownload(row, message) {
  setPreparing(row.id, false)
  pollTimers.delete(row.id)
  downloadError.value = message || 'Não foi possível baixar o vídeo.'
}

function pollStatus(row, attempt) {
  if (attempt >= POLL_MAX_ATTEMPTS) {
    failDownload(row, 'O download está demorando. Tente de novo em alguns minutos.')
    return
  }
  const timer = setTimeout(async () => {
    try {
      const { data } = await api.get(`/affiliate_videos/${row.id}`)
      if (data.download_url) {
        finishDownload(row, data.download_url)
      } else if (data.download_status === 'failed') {
        failDownload(row, data.download_error ? `Não foi possível baixar este vídeo: ${data.download_error}` : null)
      } else {
        pollStatus(row, attempt + 1)
      }
    } catch (e) {
      failDownload(row, e.response?.data?.error)
    }
  }, POLL_INTERVAL_MS)
  pollTimers.set(row.id, timer)
}

async function requestDownload(row) {
  if (preparing.value[row.id]) return
  downloadError.value = ''
  setPreparing(row.id, true)
  try {
    const { data } = await api.post(`/affiliate_videos/${row.id}/download`)
    if (data.download_url) {
      finishDownload(row, data.download_url)
    } else {
      pollStatus(row, 0)
    }
  } catch (e) {
    failDownload(row, e.response?.data?.error)
  }
}

function formatPosted(isoDateTime) {
  return isoDateTime ? shortDate.format(new Date(isoDateTime)) : '—'
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <select v-model="order" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
        <option v-for="option in ORDER_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <input
        v-model="creatorQuery"
        type="text"
        placeholder="Buscar criadora (@ ou nome)..."
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />
      <input
        v-model="productQuery"
        type="text"
        placeholder="Buscar produto..."
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />
      <label class="flex items-center gap-2 text-sm text-slate-600">
        <input v-model="onlyDownloaded" type="checkbox" class="rounded border-slate-300" />
        Só os já baixados
      </label>
    </div>

    <p class="text-xs text-slate-500">
      "Assistir" abre o vídeo no TikTok. "Baixar" traz o arquivo .mp4 — os que ainda não estão no Pricecom levam
      alguns segundos para ficar prontos e o download começa sozinho.
      <span v-if="lastSync?.finished_at">Última sincronização: {{ formatDateTime(lastSync.finished_at) }}.</span>
    </p>

    <p v-if="downloadError" class="text-sm text-red-600">{{ downloadError }}</p>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    <div v-else-if="loading && rows.length === 0" class="text-sm text-slate-500">Carregando...</div>
    <p v-else-if="rows.length === 0" class="text-sm text-slate-400">Nenhum vídeo encontrado.</p>

    <div v-else class="space-y-3">
      <div ref="tableWrapper" class="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-2">Criadora</th>
              <th class="px-4 py-2">Vídeo</th>
              <th class="px-4 py-2 text-right">GMV</th>
              <th class="px-4 py-2 text-right">Vendidos</th>
              <th class="px-4 py-2 text-right">Views</th>
              <th class="px-4 py-2">Postado</th>
              <th class="px-4 py-2"><span class="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in rows" :key="row.id" class="hover:bg-slate-50">
              <td class="px-4 py-2">
                <div class="font-medium text-slate-900">{{ row.nickname || row.username || '—' }}</div>
                <div v-if="row.username" class="text-xs text-slate-500">@{{ row.username }}</div>
              </td>
              <td class="max-w-xs px-4 py-2">
                <div class="truncate text-slate-700" :title="row.title">{{ row.title || '—' }}</div>
                <div v-if="row.products?.length" class="truncate text-xs text-slate-500" :title="row.products.join(', ')">
                  {{ row.products.join(', ') }}
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-2 text-right text-slate-700">
                {{ row.gmv !== null && row.gmv !== undefined ? formatMoney(row.gmv) : '—' }}
              </td>
              <td class="px-4 py-2 text-right text-slate-600">{{ row.items_sold ?? '—' }}</td>
              <td class="px-4 py-2 text-right text-slate-600">
                {{ row.views !== null && row.views !== undefined ? compactNumber.format(row.views) : '—' }}
              </td>
              <td class="whitespace-nowrap px-4 py-2 text-slate-600">{{ formatPosted(row.posted_at) }}</td>
              <td class="whitespace-nowrap px-4 py-2">
                <div class="flex items-center justify-end gap-2">
                  <a
                    v-if="row.tiktok_url"
                    :href="row.tiktok_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Assistir
                  </a>
                  <a
                    v-if="row.download_url"
                    :href="row.download_url"
                    class="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                  >
                    Baixar
                  </a>
                  <button
                    v-else
                    type="button"
                    :disabled="preparing[row.id]"
                    class="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
                    @click="requestDownload(row)"
                  >
                    {{ preparing[row.id] ? 'Preparando...' : 'Baixar' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="meta && meta.total_count > 0" class="flex items-center justify-between text-sm text-slate-500">
        <p>
          Mostrando {{ (meta.current_page - 1) * meta.per_page + 1 }}–{{ Math.min(meta.current_page * meta.per_page, meta.total_count) }}
          de {{ meta.total_count }} vídeos
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="meta.current_page === 1 || loading"
            @click="goToPage(meta.current_page - 1)"
          >
            Anterior
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="meta.current_page === meta.total_pages || loading"
            @click="goToPage(meta.current_page + 1)"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
