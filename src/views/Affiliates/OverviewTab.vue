<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api'
import InlineAlertBanner from '../Dashboard/InlineAlertBanner.vue'
import HorizontalRankingChart from '../Dashboard/HorizontalRankingChart.vue'
import AffiliateCreatorsTrendChart from './AffiliateCreatorsTrendChart.vue'

const loading = ref(false)
const errorMessage = ref('')
const data = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data: response } = await api.get('/affiliates/overview')
    data.value = response
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar a visão geral de afiliados.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const supported = computed(() => data.value?.supported === true)
const topCreatorsEntries = computed(() =>
  (data.value?.top_creators_by_content || []).map((c) => ({ label: c.label, name: c.name, value: c.value })),
)
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading && !data" class="text-sm text-slate-500">Carregando...</div>
    <p v-else-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <InlineAlertBanner
      v-else-if="data && !supported"
      tone="neutral"
      title="TikTok Shop ainda não conectado"
      detail="Conecte a credencial TikTok Shop com os escopos de Afiliados para começar a sincronizar criadores."
    />

    <template v-else-if="supported">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Total de criadores</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900">{{ data.total_creators }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Criadores ativos</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900">{{ data.active_creators }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Produtos em vitrine</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900">{{ data.showcase_product_count_total }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-medium text-slate-500">Conteúdo postado</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900">{{ data.content_product_count_total }}</p>
        </div>
      </div>

      <AffiliateCreatorsTrendChart :snapshots="data.daily_snapshots || []" />

      <HorizontalRankingChart
        title="Top criadores por conteúdo postado"
        subtitle="content_product_count por criador"
        :entries="topCreatorsEntries"
      />
    </template>
  </div>
</template>
