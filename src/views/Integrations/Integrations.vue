<script setup>
import { onMounted } from 'vue'
import { useChannelCredentials } from './composables/useChannelCredentials'
import ChannelCard from './ChannelCard.vue'

const { channels, loading, errorMessage, fetchChannels, connect, syncNow, updateRole } = useChannelCredentials()

onMounted(fetchChannels)
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
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
      />
    </div>
  </div>
</template>
