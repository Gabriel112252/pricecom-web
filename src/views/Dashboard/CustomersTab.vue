<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/lib/api'
import { formatPct } from '@/lib/format'
import InlineAlertBanner from './InlineAlertBanner.vue'
import RepeatPurchaseRateChart from './RepeatPurchaseRateChart.vue'
import RepeatOrderShareChart from './RepeatOrderShareChart.vue'
import RepurchaseGapHistogramChart from './RepurchaseGapHistogramChart.vue'
import HorizontalRankingChart from './HorizontalRankingChart.vue'

const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
})

// v1 só suporta Yampi (único canal com customer_email persistido — ver
// Dashboard::BuildCustomers). TikTok Shop fica no seletor mas não é
// html-disabled: selecioná-lo dispara a mesma chamada, o backend responde
// supported:false + motivo, e a UI mostra esse motivo em vez de forçar um
// botão morto sem explicação acessível.
const CHANNELS = [
  { key: 'yampi', label: 'Yampi' },
  { key: 'tiktok', label: 'TikTok Shop (em breve)' },
]

const activeChannel = ref('yampi')
const loading = ref(false)
const errorMessage = ref('')
const data = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data: response } = await api.get('/dashboard/customers', {
      params: { from: props.from, to: props.to, channel: activeChannel.value },
    })
    data.value = response
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar os dados de clientes.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.from, props.to, activeChannel.value], load)
onMounted(load)

const supported = computed(() => data.value?.supported === true)
const granularity = computed(() => data.value?.granularity || 'day')

// ---- 1) % de clientes que recompram ----
const repeatPurchaseRate = computed(() => data.value?.repeat_purchase_rate || null)
const repeatPurchaseTimeline = computed(() => repeatPurchaseRate.value?.timeline || [])
const repeatPurchaseDetail = computed(() => {
  if (!repeatPurchaseRate.value) return ''
  return `${repeatPurchaseRate.value.repeat_customers}/${repeatPurchaseRate.value.total_customers} clientes com 2+ pedidos no período selecionado`
})
const repeatPurchaseNote = computed(() => {
  const count = repeatPurchaseRate.value?.orders_without_customer_email_count
  if (!count) return ''
  return `${count} pedido(s) do período sem e-mail capturado — fora do cálculo.`
})

// ---- 2) % de pedidos que são recompra ----
const repeatOrderShare = computed(() => data.value?.repeat_order_share || null)
const repeatOrderTimeline = computed(() => repeatOrderShare.value?.timeline || [])
const repeatOrderDetail = computed(() => {
  if (!repeatOrderShare.value) return ''
  return `${repeatOrderShare.value.repeat_orders}/${repeatOrderShare.value.total_orders} pedidos são 2ª+ compra do cliente (histórico completo)`
})
const repeatOrderNote = computed(() => {
  const count = repeatOrderShare.value?.orders_without_customer_email_count
  if (!count) return ''
  return `${count} pedido(s) do período sem e-mail capturado — fora do cálculo.`
})

// ---- 3) Tempo até a recompra ----
const gapHistogram = computed(() => data.value?.repurchase_gap_histogram || null)

// ---- 4) Produtos mais recomprados ----
const productRankings = computed(() => data.value?.repeat_product_rankings || null)
const minCustomersThreshold = computed(() => productRankings.value?.min_customers_threshold ?? 20)

const volumeRankingEntries = computed(() =>
  (productRankings.value?.by_volume || []).map((p) => ({ label: p.sku, name: p.name, value: p.repeat_purchase_count }))
)
const pctRankingEntries = computed(() =>
  (productRankings.value?.by_customer_pct || []).map((p) => ({ label: p.sku, name: p.name, value: p.repeat_customers_pct }))
)
</script>

<template>
  <section class="space-y-6">
    <div class="relative isolate overflow-hidden border-b border-slate-200">
      <nav class="flex gap-1">
        <button
          v-for="channel in CHANNELS"
          :key="channel.key"
          type="button"
          class="border-b-2 px-4 py-2 text-sm font-medium transition"
          :class="
            activeChannel === channel.key
              ? 'border-indigo-500 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          "
          @click="activeChannel = channel.key"
        >
          {{ channel.label }}
        </button>
      </nav>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>

    <InlineAlertBanner
      v-else-if="data && !supported"
      tone="neutral"
      title="Canal ainda não suportado"
      :detail="data.unsupported_reason"
    />

    <template v-else-if="supported">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RepeatPurchaseRateChart
          :timeline="repeatPurchaseTimeline"
          :granularity="granularity"
          :value-pct="repeatPurchaseRate?.value_pct ?? null"
          :delta-pct="repeatPurchaseRate?.vs_previous_pct ?? null"
          :detail="repeatPurchaseDetail"
          :note="repeatPurchaseNote"
        />
        <RepeatOrderShareChart
          :timeline="repeatOrderTimeline"
          :granularity="granularity"
          :value-pct="repeatOrderShare?.value_pct ?? null"
          :detail="repeatOrderDetail"
          :note="repeatOrderNote"
        />
      </div>

      <RepurchaseGapHistogramChart
        :buckets="gapHistogram?.buckets || []"
        :median-days="gapHistogram?.median_days ?? null"
        :sample-size="gapHistogram?.sample_size ?? 0"
      />

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HorizontalRankingChart
          title="Produtos mais recomprados — volume"
          subtitle="Total de recompras por produto (histórico completo)"
          :entries="volumeRankingEntries"
        />
        <HorizontalRankingChart
          title="Produtos mais recomprados — % de clientes"
          :subtitle="`% de clientes com 2+ compras do produto (mínimo ${minCustomersThreshold} clientes únicos)`"
          :entries="pctRankingEntries"
          :value-formatter="(v) => formatPct(v)"
          :axis-formatter="(v) => `${v}%`"
        />
      </div>
    </template>
  </section>
</template>
