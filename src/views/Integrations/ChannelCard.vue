<script setup>
import { computed, ref } from 'vue'
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
  onBackfillOrders: { type: Function, default: null },
})

const toast = useToast()
const showForm = ref(false)
const connecting = ref(false)
const syncing = ref(false)
const backfilling = ref(false)

// Canais cuja conexão é OAuth (loja autoriza no site da plataforma):
// primeiro salvam-se as chaves do app, depois "Conectar" redireciona pro
// authorize_url. TikTok e Shopee compartilham exatamente o mesmo fluxo.
const OAUTH_CHANNELS = new Set(['tiktok', 'shopee'])
const isOauthChannel = computed(() => OAUTH_CHANNELS.has(props.channel.channel))
const hasOauthCredentials = computed(() => Boolean(props.channel.credentials_configured))
const connectButtonLabel = computed(() => {
  if (connecting.value && isOauthChannel.value && hasOauthCredentials.value) return 'Redirecionando...'
  if (isOauthChannel.value && !hasOauthCredentials.value) return 'Cadastrar credenciais'
  if (props.channel.status === 'pending') return 'Conectar'
  return isOauthChannel.value ? 'Reconectar' : 'Editar credenciais'
})

const ordersPollingRunning = computed(() => {
  if (props.channel.channel !== 'yampi') return false
  if (props.channel.orders_polling_running) return true

  return Boolean(props.channel.recent_logs?.some((log) => {
    if (log.action !== 'yampi_order_polling' || log.status !== 'pending' || log.finished_at) return false
    const startedAt = new Date(log.started_at).getTime()
    if (Number.isNaN(startedAt)) return true
    return Date.now() - startedAt < 20 * 60 * 1000
  }))
})

async function handleConnectClick() {
  if (!isOauthChannel.value || !hasOauthCredentials.value) {
    showForm.value = !showForm.value
    return
  }

  connecting.value = true
  try {
    await props.onConnect(props.channel.channel, {}, { authorize: true })
  } catch (e) {
    toast.error(e.response?.data?.error || `Não foi possível iniciar o OAuth de ${CHANNEL_LABELS[props.channel.channel]}.`)
  } finally {
    connecting.value = false
  }
}

async function handleConnectSubmit(credentials) {
  connecting.value = true
  try {
    await props.onConnect(props.channel.channel, credentials)
    if (isOauthChannel.value) {
      toast.success(`Credenciais de ${CHANNEL_LABELS[props.channel.channel]} salvas. Clique em Conectar para autorizar.`)
    } else {
      toast.success(`${CHANNEL_LABELS[props.channel.channel]} conectado com sucesso.`)
    }
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

async function handleBackfillOrders() {
  if (ordersPollingRunning.value) {
    toast.info('A sincronização de pedidos da Yampi já está em execução.')
    return
  }

  const confirmed = window.confirm(
    'Isso vai enfileirar a sincronização de pedidos da Yampi. Na primeira execução, serão buscados os últimos 30 dias. Continuar?',
  )
  if (!confirmed) return

  backfilling.value = true
  try {
    const result = await props.onBackfillOrders(30)
    if (result.already_running) {
      toast.info(result.message || 'A sincronização de pedidos da Yampi já está em execução.')
    } else if (result.enqueued) {
      toast.success('Sincronização de pedidos enfileirada.')
    } else if (result.success) {
      toast.success('Sincronização de pedidos iniciada.')
    } else {
      toast.error(result.error_message || 'Falha ao importar pedidos.')
    }
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível importar os pedidos agora.')
  } finally {
    backfilling.value = false
  }
}

function logLabel(log) {
  if (log.action === 'yampi_order_polling') {
    if (log.status === 'pending') return 'em andamento'
    if (log.status === 'success') {
      return `${log.created_count ?? 0} criados, ${log.updated_count ?? 0} atualizados, ${log.unchanged_count ?? 0} sem alteração`
    }
    if (log.status === 'skipped') return log.error_message || 'ignorado'
    return log.error_message || `${log.error_count ?? 0} erro(s), ${log.ignored_count ?? 0} ignorado(s)`
  }

  return log.status === 'success' ? `${log.synced_count ?? 0} produtos` : log.error_message || 'erro'
}

function logClass(log) {
  if (log.status === 'success') return 'text-emerald-600'
  if (log.status === 'pending') return 'text-indigo-600'
  if (log.status === 'skipped') return 'text-slate-500'
  return 'text-red-600'
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

    <!-- Canais OAuth em erro = token/refresh_token rejeitado pela
         plataforma (ex: Shopee TokenRefreshJob): só reautorizar resolve. -->
    <div
      v-if="isOauthChannel && channel.status === 'error'"
      class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
    >
      Autorização inválida ou expirada — clique em "Reconectar" para autorizar a loja novamente.
    </div>

    <div class="mt-4 flex gap-2">
      <button
        type="button"
        :disabled="connecting"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleConnectClick"
      >
        {{ connectButtonLabel }}
      </button>
      <button
        v-if="isOauthChannel && hasOauthCredentials"
        type="button"
        :disabled="connecting"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        @click="showForm = !showForm"
      >
        Editar credenciais
      </button>
      <button
        type="button"
        :disabled="channel.status === 'pending' || syncing"
        title="Conecte o canal antes de sincronizar"
        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSyncNow"
      >
        {{ syncing ? 'Sincronizando...' : channel.channel === 'yampi' ? 'Sincronizar produtos' : 'Sincronizar agora' }}
      </button>
      <button
        v-if="channel.channel === 'yampi'"
        type="button"
        :disabled="channel.status === 'pending' || backfilling || ordersPollingRunning"
        :title="ordersPollingRunning ? 'A sincronização de pedidos já está em execução' : 'Sincronização assíncrona de pedidos da Yampi'"
        class="rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleBackfillOrders"
      >
        {{ ordersPollingRunning ? 'Sincronizando pedidos...' : backfilling ? 'Enfileirando...' : 'Sincronizar agora' }}
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
          <span class="truncate" :class="logClass(log)">
            {{ logLabel(log) }}
          </span>
        </li>
      </ul>
    </div>
    <p v-else class="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">Nenhuma sincronização ainda.</p>
  </div>
</template>
