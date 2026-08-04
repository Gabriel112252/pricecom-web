<script setup>
import { onMounted, ref, watch } from 'vue'
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
const detailCreatorId = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/affiliates/creators', {
      params: { collaboration_status: statusFilter.value || undefined },
    })
    rows.value = data.rows || []
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar os afiliados.'
  } finally {
    loading.value = false
  }
}

watch(statusFilter, load)
onMounted(load)

function openDetail(row) {
  detailCreatorId.value = row.id
}
function closeDetail() {
  detailCreatorId.value = null
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
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    <div v-else-if="loading && rows.length === 0" class="text-sm text-slate-500">Carregando...</div>
    <p v-else-if="rows.length === 0" class="text-sm text-slate-400">Nenhum criador sincronizado ainda.</p>

    <div v-else class="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
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
              <img v-if="row.avatar_url" :src="row.avatar_url" class="h-6 w-6 rounded-full object-cover" alt="" />
              <span class="font-medium text-slate-900">{{ row.nickname || row.username || row.creator_open_id }}</span>
            </td>
            <td class="px-4 py-2 text-slate-600">{{ STATUS_LABELS[row.collaboration_status] || row.collaboration_status || '—' }}</td>
            <td class="px-4 py-2 text-slate-600">{{ row.showcase_product_count }}</td>
            <td class="px-4 py-2 text-slate-600">{{ row.content_product_count }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <AffiliateDetailDrawer v-if="detailCreatorId" :creator-id="detailCreatorId" @close="closeDetail" @sent="load" />
  </div>
</template>
