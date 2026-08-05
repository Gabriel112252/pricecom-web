<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import api from '@/lib/api'
import AffiliateDetailDrawer from './AffiliateDetailDrawer.vue'

const STATUS_LABELS = {
  NORMAL: 'Ativo',
  PAUSED: 'Pausado',
}

const loading = ref(false)
const errorMessage = ref('')
const rows = ref([])
const statusFilter = ref('')
const searchQuery = ref('')
const detailCreatorId = ref(null)
const page = ref(1)
const meta = ref(null)
const tableWrapper = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/affiliates/creators', {
      params: { collaboration_status: statusFilter.value || undefined, q: searchQuery.value || undefined, page: page.value },
    })
    rows.value = data.rows || []
    meta.value = data.meta || null
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar os afiliados.'
  } finally {
    loading.value = false
  }
}

watch(statusFilter, () => {
  page.value = 1
  load()
})

// Debounced — busca livre não deve disparar uma chamada a cada tecla.
let searchDebounceTimer = null
watch(searchQuery, () => {
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 400)
})

onMounted(load)

function openDetail(row) {
  detailCreatorId.value = row.id
}
function closeDetail() {
  detailCreatorId.value = null
}

async function goToPage(newPage) {
  if (newPage < 1 || newPage > (meta.value?.total_pages || 1) || loading.value) return
  page.value = newPage
  await load()
  await nextTick()
  tableWrapper.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <select v-model="statusFilter" class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
        <option value="">Todos os status</option>
        <option value="NORMAL">Ativo</option>
        <option value="PAUSED">Pausado</option>
      </select>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Buscar por nome ou @usuário..."
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
      />
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    <div v-else-if="loading && rows.length === 0" class="text-sm text-slate-500">Carregando...</div>
    <p v-else-if="rows.length === 0 && searchQuery" class="text-sm text-slate-400">Nenhum criador encontrado para essa busca.</p>
    <p v-else-if="rows.length === 0" class="text-sm text-slate-400">Nenhum criador sincronizado ainda.</p>

    <div v-else class="space-y-3">
      <div ref="tableWrapper" class="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-4 py-2">Criador</th>
              <th class="px-4 py-2">Status</th>
              <th class="px-4 py-2">Produtos na vitrine</th>
              <th class="px-4 py-2">Conteúdo postado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="row in rows"
              :key="row.id"
              class="cursor-pointer hover:bg-slate-50"
              @click="openDetail(row)"
            >
              <td class="flex items-center gap-2 px-4 py-2">
                <span v-if="row.avatar_url" class="relative inline-block h-6 w-6 shrink-0">
                  <img :src="row.avatar_url" class="h-6 w-6 rounded-full object-cover" alt="" />
                  <span
                    v-if="row.has_unread"
                    class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-red-500"
                  />
                </span>
                <span class="font-medium text-slate-900">{{ row.nickname || row.username || row.creator_open_id }}</span>
              </td>
              <td class="px-4 py-2 text-slate-600">{{ STATUS_LABELS[row.collaboration_status] || row.collaboration_status || '—' }}</td>
              <td class="px-4 py-2 text-slate-600">{{ row.showcase_product_count }}</td>
              <td class="px-4 py-2 text-slate-600">{{ row.content_product_count }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="meta && meta.total_count > 0" class="flex items-center justify-between text-sm text-slate-500">
        <p>
          Mostrando {{ (meta.current_page - 1) * meta.per_page + 1 }}–{{ Math.min(meta.current_page * meta.per_page, meta.total_count) }}
          de {{ meta.total_count }} criadores
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

    <AffiliateDetailDrawer v-if="detailCreatorId" :creator-id="detailCreatorId" @close="closeDetail" @sent="load" />
  </div>
</template>
