<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/lib/api'
import { formatDateTime } from '@/lib/format'

const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
})

const loading = ref(false)
const errorMessage = ref('')
const data = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data: response } = await api.get('/integration_health', {
      params: {
        provider: 'bling',
        view: 'dashboard',
        date_from: props.from,
        date_to: props.to,
      },
    })
    data.value = response
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar a saúde do Bling.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.from, props.to], load)
onMounted(load)

const connection = computed(() => data.value?.connection || {})
const summary = computed(() => data.value?.summary || {})
const recentIssues = computed(() => data.value?.recent_issues || [])

function connectionLabel(status) {
  return {
    connected: 'Conectado',
    disconnected: 'Desconectado',
    error: 'Erro de autenticação',
  }[status] || 'Indefinido'
}

function connectionClass(status) {
  return {
    connected: 'bg-emerald-100 text-emerald-700',
    disconnected: 'bg-slate-100 text-slate-600',
    error: 'bg-red-100 text-red-700',
  }[status] || 'bg-slate-100 text-slate-600'
}

function severityClass(severity) {
  return {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-amber-100 text-amber-700',
    medium: 'bg-blue-100 text-blue-700',
  }[severity] || 'bg-slate-100 text-slate-600'
}

function categoryLabel(category) {
  return {
    auth: 'OAuth',
    product: 'SKU / produto',
    validation: 'Validação',
    order_create: 'Criação do pedido',
    invoice: 'NF-e',
    tracking: 'Rastreio',
    status: 'Status',
  }[category] || category
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">ERP · Bling</p>
        <h2 class="mt-1 text-lg font-semibold text-slate-900">Saúde operacional</h2>
        <p class="mt-1 text-sm text-slate-500">Pedidos Yampi → Bling, NF-e, status e rastreio.</p>
      </div>
      <span
        v-if="data"
        class="w-fit rounded-full px-3 py-1 text-xs font-semibold"
        :class="connectionClass(connection.status)"
      >
        {{ connectionLabel(connection.status) }}
      </span>
    </div>

    <div v-if="loading && !data" class="mt-5 text-sm text-slate-500">Carregando Bling...</div>
    <div v-else-if="errorMessage" class="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <template v-else-if="data">
      <div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="rounded-lg border border-slate-200 p-4">
          <p class="text-xs text-slate-500">Pedidos no fluxo</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ summary.total_orders || 0 }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-4">
          <p class="text-xs text-slate-500">Criados no Bling</p>
          <p class="mt-1 text-2xl font-bold text-emerald-600">{{ summary.integrated_orders || 0 }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-4">
          <p class="text-xs text-slate-500">Ainda sem pedido</p>
          <p class="mt-1 text-2xl font-bold text-amber-600">{{ summary.pending_orders || 0 }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-4">
          <p class="text-xs text-slate-500">Erros operacionais</p>
          <p class="mt-1 text-2xl font-bold" :class="summary.critical_errors ? 'text-red-600' : 'text-slate-900'">
            {{ summary.orders_with_errors || 0 }}
          </p>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-lg bg-slate-50 p-3 text-sm">
          <span class="text-slate-500">SKU/produto</span>
          <strong class="ml-2 text-slate-900">{{ summary.product_issues || 0 }}</strong>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 text-sm">
          <span class="text-slate-500">NF-e</span>
          <strong class="ml-2 text-slate-900">{{ summary.invoice_issues || 0 }}</strong>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 text-sm">
          <span class="text-slate-500">Rastreio</span>
          <strong class="ml-2 text-slate-900">{{ summary.tracking_issues || 0 }}</strong>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 text-sm">
          <span class="text-slate-500">Status</span>
          <strong class="ml-2 text-slate-900">{{ summary.status_issues || 0 }}</strong>
        </div>
      </div>

      <div v-if="connection.auth_error" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ connection.auth_error }}
      </div>

      <div class="mt-5">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-slate-900">Pendências recentes</h3>
          <span class="text-xs text-slate-400">{{ recentIssues.length }} exibida(s)</span>
        </div>

        <div v-if="recentIssues.length === 0" class="mt-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
          Nenhuma pendência relevante do Bling neste período.
        </div>

        <div v-else class="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          <div v-for="issue in recentIssues" :key="issue.id" class="p-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium text-slate-900">
                Pedido {{ issue.yampi_number || issue.yampi_id || 'sem número' }}
              </span>
              <span class="rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="severityClass(issue.severity)">
                {{ issue.severity }}
              </span>
              <span class="text-xs text-slate-400">{{ categoryLabel(issue.category) }}</span>
            </div>
            <p class="mt-1 break-words text-xs text-slate-600">{{ issue.message }}</p>
            <p v-if="issue.recommendation" class="mt-1 text-xs text-slate-400">{{ issue.recommendation }}</p>
            <p v-if="issue.last_seen_at" class="mt-1 text-[11px] text-slate-400">{{ formatDateTime(issue.last_seen_at) }}</p>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
