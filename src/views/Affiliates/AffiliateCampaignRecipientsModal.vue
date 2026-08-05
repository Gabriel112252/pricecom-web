<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import AffiliateDetailDrawer from './AffiliateDetailDrawer.vue'

const props = defineProps({
  campaignId: { type: [Number, String], required: true },
  campaignName: { type: String, default: '' },
})
const emit = defineEmits(['close'])

const STATUS_LABELS = {
  sent: 'Enviado',
  pending: 'Pendente',
  failed: 'Falhou',
}

const STATUS_BADGE_CLASSES = {
  sent: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  pending: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
  failed: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
}

const FILTER_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'sent', label: 'Enviados' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'failed', label: 'Falhas' },
]

const loading = ref(false)
const errorMessage = ref('')
const recipients = ref([])
const statusFilter = ref('all')
const detailCreatorId = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get(`/affiliate_campaigns/${props.campaignId}`)
    recipients.value = data.recipients || []
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar os destinatários.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filterCounts = computed(() => {
  const counts = { all: recipients.value.length, sent: 0, pending: 0, failed: 0 }
  for (const recipient of recipients.value) {
    if (counts[recipient.status] !== undefined) counts[recipient.status] += 1
  }
  return counts
})

const filteredRecipients = computed(() => {
  if (statusFilter.value === 'all') return recipients.value
  return recipients.value.filter((recipient) => recipient.status === statusFilter.value)
})
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white p-6 shadow-xl">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">Destinatários</h2>
          <p v-if="campaignName" class="text-xs text-slate-500">{{ campaignName }}</p>
        </div>
        <button type="button" class="text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <div v-if="!loading && !errorMessage" class="mt-4 flex gap-1.5 border-b border-slate-200 pb-2">
        <button
          v-for="tab in FILTER_TABS"
          :key="tab.key"
          type="button"
          class="rounded-full px-3 py-1 text-xs font-medium"
          :class="statusFilter === tab.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="statusFilter = tab.key"
        >
          {{ tab.label }} ({{ filterCounts[tab.key] }})
        </button>
      </div>

      <p v-if="errorMessage" class="mt-4 text-sm text-red-600">{{ errorMessage }}</p>
      <div v-else-if="loading" class="mt-4 text-sm text-slate-500">Carregando...</div>
      <p v-else-if="recipients.length === 0" class="mt-4 text-sm text-slate-400">Esta campanha ainda não tem destinatários.</p>
      <p v-else-if="filteredRecipients.length === 0" class="mt-4 text-sm text-slate-400">Nenhum destinatário com esse status.</p>

      <div v-else class="mt-3 -mx-6 overflow-y-auto px-6">
        <table class="w-full text-left text-sm">
          <thead class="sticky top-0 bg-white text-xs text-slate-500">
            <tr>
              <th class="py-2 pr-3 font-medium">Criador</th>
              <th class="py-2 pr-3 font-medium">Status</th>
              <th class="py-2 pr-3 font-medium">Enviado em</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="recipient in filteredRecipients"
              :key="recipient.id"
              class="cursor-pointer hover:bg-slate-50"
              @click="detailCreatorId = recipient.affiliate_creator_id"
            >
              <td class="py-2 pr-3">
                <p class="font-medium text-slate-900">{{ recipient.nickname || '—' }}</p>
                <p
                  v-if="recipient.status === 'failed' && recipient.error_message"
                  class="mt-0.5 max-w-[280px] truncate text-xs text-red-600"
                  :title="recipient.error_message"
                >
                  {{ recipient.error_message }}
                </p>
              </td>
              <td class="py-2 pr-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="STATUS_BADGE_CLASSES[recipient.status]">
                  {{ STATUS_LABELS[recipient.status] || recipient.status }}
                </span>
              </td>
              <td class="py-2 pr-3 text-slate-600">{{ formatDateTime(recipient.sent_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <AffiliateDetailDrawer v-if="detailCreatorId" :creator-id="detailCreatorId" @close="detailCreatorId = null" />
  </div>
</template>
