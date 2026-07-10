<script setup>
import { ref } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import CredentialForm from './CredentialForm.vue'
import ChannelRoleConfig from './ChannelRoleConfig.vue'
import { useToast } from '@/composables/useToast'
import { formatDateTime } from '@/lib/format'

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

const props = defineProps({
  channel: { type: Object, required: true },
  allChannels: { type: Array, required: true },
  onConnect: { type: Function, required: true },
  onSync: { type: Function, required: true },
  onUpdateRole: { type: Function, required: true },
})

const toast = useToast()
const showForm = ref(false)
const connecting = ref(false)
const syncing = ref(false)

async function handleConnectSubmit(credentials) {
  connecting.value = true
  try {
    await props.onConnect(props.channel.channel, credentials)
    toast.success(`${CHANNEL_LABELS[props.channel.channel]} conectado com sucesso.`)
    showForm.value = false
  } catch (e) {
    toast.error(e.response?.data?.errors?.[0] || 'Não foi possível conectar este canal.')
  } finally {
    connecting.value = false
  }
}

async function handleSyncNow() {
  syncing.value = true
  try {
    const result = await props.onSync(props.channel.channel)
    if (result.success) {
      toast.success(`${result.synced_count} produto(s) sincronizado(s).`)
    } else {
      toast.error(result.error_message || 'Falha na sincronização.')
    }
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível sincronizar agora.')
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between">
      <h3 class="text-sm font-semibold text-slate-900">{{ CHANNEL_LABELS[channel.channel] }}</h3>
      <StatusBadge :status="channel.status" />
    </div>

    <p class="mt-3 text-xs text-slate-400">
      Última sincronização: {{ channel.last_synced_at ? formatDateTime(channel.last_synced_at) : 'nunca' }}
    </p>

    <div class="mt-4 flex gap-2">
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        @click="showForm = !showForm"
      >
        {{ channel.status === 'pending' ? 'Conectar' : 'Editar credenciais' }}
      </button>
      <button
        type="button"
        :disabled="channel.status === 'pending' || syncing"
        title="Conecte o canal antes de sincronizar"
        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSyncNow"
      >
        {{ syncing ? 'Sincronizando...' : 'Sincronizar agora' }}
      </button>
    </div>

    <CredentialForm
      v-if="showForm"
      class="mt-4 border-t border-slate-100 pt-4"
      :channel="channel.channel"
      :required-fields="channel.required_fields"
      :submitting="connecting"
      @submit="handleConnectSubmit"
      @cancel="showForm = false"
    />

    <ChannelRoleConfig
      v-if="channel.status !== 'pending'"
      :channel="channel"
      :all-channels="allChannels"
      :on-update-role="onUpdateRole"
    />

    <div v-if="channel.recent_logs?.length" class="mt-4 border-t border-slate-100 pt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Últimas sincronizações</p>
      <ul class="mt-2 space-y-1.5">
        <li v-for="log in channel.recent_logs" :key="log.id" class="flex items-center justify-between gap-2 text-xs">
          <span class="text-slate-500">{{ formatDateTime(log.started_at) }}</span>
          <span class="truncate" :class="log.status === 'success' ? 'text-emerald-600' : 'text-red-600'">
            {{ log.status === 'success' ? `${log.synced_count ?? 0} produtos` : log.error_message || 'erro' }}
          </span>
        </li>
      </ul>
    </div>
    <p v-else class="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">Nenhuma sincronização ainda.</p>
  </div>
</template>
