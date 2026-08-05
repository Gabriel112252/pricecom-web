<script setup>
import { onMounted, ref } from 'vue'
import api from '@/lib/api'
import InlineAlertBanner from '../Dashboard/InlineAlertBanner.vue'
import AffiliateCampaignFormModal from './AffiliateCampaignFormModal.vue'
import AffiliateCampaignRecipientsModal from './AffiliateCampaignRecipientsModal.vue'

const STATUS_LABELS = {
  draft: 'Rascunho',
  sending: 'Enviando',
  completed: 'Concluída',
}

const loading = ref(false)
const errorMessage = ref('')
const campaigns = ref([])
const showForm = ref(false)
const selectedCampaign = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/affiliate_campaigns')
    campaigns.value = data.rows || []
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar as campanhas.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function onCreated() {
  showForm.value = false
  load()
}

function openRecipients(campaign) {
  selectedCampaign.value = campaign
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-slate-500">Disparo em massa com métrica de envio e visualização estimada.</p>
      <button
        type="button"
        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        @click="showForm = true"
      >
        Nova campanha
      </button>
    </div>

    <InlineAlertBanner
      tone="neutral"
      title="Sobre a métrica de visualização"
      detail="unread_message_count é por conversa, não por mensagem — 'ainda não visualizou' é uma estimativa, não uma taxa de leitura exata."
    />

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    <div v-else-if="loading && campaigns.length === 0" class="text-sm text-slate-500">Carregando...</div>
    <p v-else-if="campaigns.length === 0" class="text-sm text-slate-400">Nenhuma campanha disparada ainda.</p>

    <div v-else class="space-y-3">
      <div
        v-for="campaign in campaigns"
        :key="campaign.id"
        class="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
        role="button"
        tabindex="0"
        @click="openRecipients(campaign)"
        @keydown.enter="openRecipients(campaign)"
      >
        <div class="flex items-center justify-between">
          <p class="font-medium text-slate-900">{{ campaign.name }}</p>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {{ STATUS_LABELS[campaign.status] || campaign.status }}
          </span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p class="text-xs text-slate-500">Destinatários</p>
            <p class="font-medium text-slate-900">{{ campaign.recipients_count }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Enviados</p>
            <p class="font-medium text-slate-900">{{ campaign.sent_count }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Falhas</p>
            <p class="font-medium text-slate-900">{{ campaign.failed_count }}</p>
          </div>
          <div>
            <p class="text-xs text-slate-500">Ainda não visualizou (estimativa)</p>
            <p class="font-medium text-slate-900">
              <span v-if="campaign.unread_check_failed">não foi possível verificar</span>
              <span v-else-if="campaign.not_viewed_estimate === null">—</span>
              <span v-else>{{ campaign.not_viewed_estimate }}</span>
            </p>
          </div>
        </div>
        <p class="mt-3 text-right text-xs font-medium text-indigo-600">Ver destinatários →</p>
      </div>
    </div>

    <AffiliateCampaignFormModal v-if="showForm" @close="showForm = false" @created="onCreated" />
    <AffiliateCampaignRecipientsModal
      v-if="selectedCampaign"
      :campaign-id="selectedCampaign.id"
      :campaign-name="selectedCampaign.name"
      @close="selectedCampaign = null"
    />
  </div>
</template>
