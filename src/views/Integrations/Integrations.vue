<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChannelCredentials } from './composables/useChannelCredentials'
import { useIdworks } from './composables/useIdworks'
import { usePagarme } from './composables/usePagarme'
import { useToast } from '@/composables/useToast'
import ChannelCard from './ChannelCard.vue'
import SimpleCredentialCard from './SimpleCredentialCard.vue'
import DataSourceConfigSection from './DataSourceConfigSection.vue'

const { channels, loading, errorMessage, fetchChannels, connect, syncNow, updateRole, backfillOrders } =
  useChannelCredentials()

const route = useRoute()
const router = useRouter()
const toast = useToast()

// TiktokOauthController#callback redireciona de volta pra cá com
// ?tiktok=connected|error&message=... — exibe o resultado e limpa a
// query da URL pra um refresh não reexibir o toast.
function showOauthRedirectResult() {
  const { tiktok, message } = route.query
  if (!tiktok) return

  if (tiktok === 'connected') {
    toast.success(message || 'Canal conectado com sucesso.')
  } else {
    toast.error(message || 'Não foi possível concluir a conexão do canal.')
  }

  const { tiktok: _tiktok, message: _message, credential_id: _credentialId, ...rest } = route.query
  router.replace({ query: rest })
}

const { integration: idworksIntegration, fetchStatus: fetchIdworksStatus, connect: connectIdworks, sync: syncIdworks } =
  useIdworks()
const { source: pagarmeSource, fetchStatus: fetchPagarmeStatus, connect: connectPagarme, sync: syncPagarme } =
  usePagarme()

const activeTab = ref('marketplaces')

const tabs = [
  { key: 'marketplaces', label: 'Lojas e marketplaces' },
  { key: 'erp_finance', label: 'ERP e financeiro' },
]

onMounted(() => {
  fetchChannels()
  fetchIdworksStatus()
  fetchPagarmeStatus()
  showOauthRedirectResult()
})
</script>

<template>
  <div class="space-y-8 p-6 lg:p-8">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Integrações</h1>
      <p class="mt-1 text-sm text-slate-500">
        Conecte cada canal de vendas para sincronizar produtos e estoque automaticamente.
      </p>
    </div>

    <div v-if="loading" class="text-sm text-slate-500">Carregando...</div>
    <div v-else-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div class="border-b border-slate-200">
      <nav class="flex gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="border-b-2 px-4 py-2.5 text-sm font-medium transition"
          :class="
            activeTab === tab.key
              ? 'border-indigo-500 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          "
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <section v-show="activeTab === 'marketplaces'" class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Lojas e marketplaces</h2>
        <p class="mt-1 text-sm text-slate-500">Canais de venda, estoque e pedidos.</p>
      </div>

      <div v-if="!loading && !errorMessage" class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChannelCard
          v-for="channel in channels"
          :key="channel.channel"
          :channel="channel"
          :all-channels="channels"
          :on-connect="connect"
          :on-sync="syncNow"
          :on-update-role="updateRole"
          :on-backfill-orders="backfillOrders"
        />
      </div>
    </section>

    <section v-show="activeTab === 'erp_finance'" class="space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">ERP e financeiro</h2>
        <p class="mt-1 text-sm text-slate-500">Custo real, frete real e reconciliação de pagamentos.</p>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SimpleCredentialCard
          title="idworks"
          :status="idworksIntegration.status"
          :last-synced-at="idworksIntegration.last_synced_at"
          :recent-logs="idworksIntegration.recent_logs || []"
          :fields="[
            { key: 'base_url', label: 'URL base da API (ex: https://hidrabene.api-idworks.com.br/1.0)' },
            { key: 'email', label: 'E-mail' },
            { key: 'password', label: 'Senha', secret: true },
          ]"
          :on-connect="connectIdworks"
          :on-sync="syncIdworks"
        />
        <SimpleCredentialCard
          title="Pagar.me"
          :status="pagarmeSource.status"
          :last-synced-at="pagarmeSource.last_synced_at"
          :recent-logs="pagarmeSource.recent_logs || []"
          :fields="[{ key: 'api_key', label: 'Secret Key', secret: true }]"
          :on-connect="connectPagarme"
          :on-sync="syncPagarme"
        />
      </div>

      <DataSourceConfigSection />
    </section>
  </div>
</template>
