<script setup>
import { onMounted } from 'vue'
import { useChannelCredentials } from './composables/useChannelCredentials'
import { useIdworks } from './composables/useIdworks'
import { usePagarme } from './composables/usePagarme'
import ChannelCard from './ChannelCard.vue'
import SimpleCredentialCard from './SimpleCredentialCard.vue'
import DataSourceConfigSection from './DataSourceConfigSection.vue'

const { channels, loading, errorMessage, fetchChannels, connect, syncNow, updateRole, backfillOrders } =
  useChannelCredentials()

const { integration: idworksIntegration, fetchStatus: fetchIdworksStatus, connect: connectIdworks, sync: syncIdworks } =
  useIdworks()
const { source: pagarmeSource, fetchStatus: fetchPagarmeStatus, connect: connectPagarme, sync: syncPagarme } =
  usePagarme()

onMounted(() => {
  fetchChannels()
  fetchIdworksStatus()
  fetchPagarmeStatus()
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

    <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-3">
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

    <div>
      <h2 class="text-lg font-semibold text-slate-900">ERP</h2>
      <p class="mt-1 text-sm text-slate-500">Custo real, imposto e frete real de produtos e pedidos.</p>
      <div class="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SimpleCredentialCard
          title="idworks"
          :status="idworksIntegration.status"
          :last-synced-at="idworksIntegration.last_synced_at"
          :fields="[
            { key: 'base_url', label: 'URL base da API (ex: https://hidrabene.api-idworks.com.br/1.0)' },
            { key: 'email', label: 'E-mail' },
            { key: 'password', label: 'Senha', secret: true },
          ]"
          :on-connect="connectIdworks"
          :on-sync="syncIdworks"
        />
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold text-slate-900">Financeiro</h2>
      <p class="mt-1 text-sm text-slate-500">Reconciliação automática de pagamentos, substituindo o CSV manual.</p>
      <div class="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SimpleCredentialCard
          title="Pagar.me"
          :status="pagarmeSource.status"
          :last-synced-at="pagarmeSource.last_synced_at"
          :fields="[{ key: 'api_key', label: 'Secret Key', secret: true }]"
          :on-connect="connectPagarme"
          :on-sync="syncPagarme"
        />
      </div>
    </div>

    <DataSourceConfigSection />
  </div>
</template>
