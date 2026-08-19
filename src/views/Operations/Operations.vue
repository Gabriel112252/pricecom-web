<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatDateTime, formatStockQty } from '@/lib/format'
import PageHeader from '@/components/PageHeader.vue'
import { CONFLICT_TYPE_LABEL, SEVERITY_LABEL } from '@/views/Audit/lib/auditLabels'

const OPEN_STOCK_STATUSES = [ 'pending', 'awaiting_confirmation', 'insufficient_reserve', 'failed' ]

const STOCK_STATUS_LABEL = {
  pending: 'Pendente',
  awaiting_confirmation: 'Aguardando confirmação',
  insufficient_reserve: 'Reserva insuficiente',
  failed: 'Falhou',
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'critical', label: 'Críticos' },
  { key: 'integration', label: 'Integrações' },
  { key: 'stock', label: 'Estoque' },
  { key: 'audit', label: 'Auditoria' },
]

const auth = useAuthStore()
const toast = useToast()

const integrationHealth = ref([])
const stockAlerts = ref([])
const auditConflicts = ref([])
const loading = ref(false)
const sourceErrors = ref([])
const workingKey = ref(null)
const activeFilter = ref('all')
const searchTerm = ref('')

async function load() {
  loading.value = true
  sourceErrors.value = []

  const [ integrationsResult, stockResult, conflictsResult ] = await Promise.allSettled([
    api.get('/integration_health'),
    api.get('/stock_alerts', { params: { status: OPEN_STOCK_STATUSES, page: 1, per_page: 100 } }),
    api.get('/audit_conflicts', { params: { status: 'open', page: 1, per_page: 100 } }),
  ])

  if (integrationsResult.status === 'fulfilled') {
    integrationHealth.value = integrationsResult.value.data || []
  } else {
    integrationHealth.value = []
    sourceErrors.value.push('Integrações')
  }

  if (stockResult.status === 'fulfilled') {
    stockAlerts.value = stockResult.value.data?.stock_alerts || []
  } else {
    stockAlerts.value = []
    sourceErrors.value.push('Estoque')
  }

  if (conflictsResult.status === 'fulfilled') {
    auditConflicts.value = conflictsResult.value.data?.audit_conflicts || []
  } else {
    auditConflicts.value = []
    sourceErrors.value.push('Auditoria')
  }

  loading.value = false
}

onMounted(load)

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 0
}

function integrationSeverity(health) {
  return health.health_status === 'error' ? 'critical' : 'medium'
}

function stockSeverity(alert) {
  if (alert.status === 'failed') return 'critical'
  if (alert.status === 'insufficient_reserve') return 'high'
  if (alert.status === 'awaiting_confirmation') return 'medium'
  return 'low'
}

function toTime(value) {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

const integrationIssues = computed(() =>
  integrationHealth.value.filter((item) => [ 'error', 'pending' ].includes(item.health_status))
)

const queue = computed(() => {
  const integrations = integrationIssues.value.map((health) => ({
    key: `integration-${health.id}`,
    kind: 'integration',
    kindLabel: 'Integração',
    severity: integrationSeverity(health),
    statusLabel: health.health_status === 'error' ? 'Com erro' : 'Pendente',
    title: health.name || health.channel_name || health.provider || `Integração #${health.id}`,
    description:
      health.health_status === 'error'
        ? 'A integração apresentou falha depois da última execução bem-sucedida.'
        : `${health.events_pending_count || 0} evento(s) aguardando processamento.`,
    technicalDescription:
      health.health_status === 'error'
        ? `${health.logs_error_last_24h || 0} falha(s) de sync nas últimas 24h · ${health.events_error_count || 0} evento(s) com erro`
        : null,
    timestamp: health.last_event_error_at || health.last_error_at || health.last_event_at || health.last_synced_at,
    raw: health,
  }))

  const stock = stockAlerts.value.map((alert) => ({
    key: `stock-${alert.id}`,
    kind: 'stock',
    kindLabel: 'Estoque',
    severity: stockSeverity(alert),
    statusLabel: STOCK_STATUS_LABEL[alert.status] || alert.status,
    title: `SKU ${alert.product_sku}`,
    description:
      alert.status === 'failed'
        ? 'A reposição automática não foi concluída.'
        : alert.status === 'insufficient_reserve'
          ? 'Não há reserva suficiente para executar a reposição sugerida.'
          : alert.status === 'awaiting_confirmation'
            ? 'Reposição aguardando confirmação.'
            : 'Alerta de estoque aguardando processamento.',
    technicalDescription: `Reserva livre: ${formatStockQty(alert.qty_at_trigger) ?? '—'} · Reposição sugerida: ${formatStockQty(alert.suggested_replenishment_qty) ?? '—'} · Canal: ${alert.channel || 'sem canal alvo'}`,
    timestamp: alert.executed_at || alert.created_at,
    raw: alert,
  }))

  const conflicts = auditConflicts.value.map((conflict) => ({
    key: `audit-${conflict.id}`,
    kind: 'audit',
    kindLabel: 'Auditoria',
    severity: conflict.severity || 'medium',
    statusLabel: 'Aberto',
    title: CONFLICT_TYPE_LABEL[conflict.conflict_type] || conflict.conflict_type,
    description: [
      conflict.order_number ? `Pedido ${conflict.order_number}` : null,
      conflict.product_sku ? `SKU ${conflict.product_sku}` : null,
    ].filter(Boolean).join(' · ') || 'Conflito sem pedido ou SKU vinculado.',
    technicalDescription: null,
    timestamp: conflict.created_at,
    raw: conflict,
  }))

  return [ ...integrations, ...stock, ...conflicts ].sort((a, b) => {
    const bySeverity = severityRank(b.severity) - severityRank(a.severity)
    if (bySeverity !== 0) return bySeverity
    return toTime(b.timestamp) - toTime(a.timestamp)
  })
})

const visibleQueue = computed(() => {
  const term = searchTerm.value.trim().toLocaleLowerCase('pt-BR')

  return queue.value.filter((item) => {
    if (activeFilter.value === 'critical' && item.severity !== 'critical') return false
    if (![ 'all', 'critical' ].includes(activeFilter.value) && item.kind !== activeFilter.value) return false

    if (!term) return true

    return [ item.title, item.description, item.technicalDescription, item.kindLabel ]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase('pt-BR').includes(term))
  })
})

const criticalCount = computed(() => queue.value.filter((item) => item.severity === 'critical').length)

function countForFilter(key) {
  if (key === 'all') return queue.value.length
  if (key === 'critical') return criticalCount.value
  return queue.value.filter((item) => item.kind === key).length
}

function severityClass(severity) {
  return {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-amber-100 text-amber-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-slate-100 text-slate-600',
  }[severity] || 'bg-slate-100 text-slate-600'
}

function canDismissStock(alert) {
  return [ 'pending', 'awaiting_confirmation', 'insufficient_reserve' ].includes(alert.status)
}

async function confirmStock(item) {
  workingKey.value = item.key
  try {
    await api.post(`/stock_alerts/${item.raw.id}/confirm`)
    toast.success('Reposição enfileirada.')
    await load()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível confirmar a reposição.')
  } finally {
    workingKey.value = null
  }
}

async function dismissStock(item) {
  if (!window.confirm(`Dispensar o alerta de estoque do SKU ${item.raw.product_sku}?`)) return

  workingKey.value = item.key
  try {
    await api.post(`/stock_alerts/${item.raw.id}/dismiss`)
    toast.success('Alerta de estoque dispensado.')
    await load()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível dispensar o alerta.')
  } finally {
    workingKey.value = null
  }
}

async function updateConflict(item, status) {
  const verb = status === 'resolved' ? 'resolver' : 'ignorar'
  if (!window.confirm(`Deseja ${verb} este conflito?`)) return

  workingKey.value = item.key
  try {
    await api.patch(`/audit_conflicts/${item.raw.id}`, { status })
    toast.success(status === 'resolved' ? 'Conflito resolvido.' : 'Conflito ignorado.')
    await load()
  } catch {
    toast.error('Não foi possível atualizar o conflito.')
  } finally {
    workingKey.value = null
  }
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader title="Operação" subtitle="O que precisa de atenção agora, sem misturar histórico resolvido com a fila atual.">
      <template #actions>
        <button
          type="button"
          :disabled="loading"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          @click="load"
        >
          {{ loading ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pendências</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{{ queue.length }}</p>
        <p class="mt-1 text-xs text-slate-400">somente itens ainda ativos</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Críticos</p>
        <p class="mt-2 text-3xl font-bold text-red-600">{{ criticalCount }}</p>
        <p class="mt-1 text-xs text-slate-400">prioridade máxima</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Integrações</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{{ integrationIssues.length }}</p>
        <p class="mt-1 text-xs text-slate-400">com erro ou processamento pendente</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Estoque + auditoria</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{{ stockAlerts.length + auditConflicts.length }}</p>
        <p class="mt-1 text-xs text-slate-400">alertas e divergências abertas</p>
      </div>
    </div>

    <div
      v-if="sourceErrors.length"
      class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700"
    >
      A fila foi carregada parcialmente. Não foi possível consultar: {{ sourceErrors.join(', ') }}.
    </div>

    <section class="space-y-4">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex max-w-full gap-2 overflow-x-auto pb-1">
          <button
            v-for="filter in FILTERS"
            :key="filter.key"
            type="button"
            class="shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition"
            :class="activeFilter === filter.key
              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
            @click="activeFilter = filter.key"
          >
            {{ filter.label }}
            <span class="ml-1 text-xs opacity-70">{{ countForFilter(filter.key) }}</span>
          </button>
        </div>

        <input
          v-model="searchTerm"
          type="search"
          placeholder="Buscar pedido, SKU ou integração"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none xl:w-80"
        />
      </div>

      <div v-if="loading && queue.length === 0" class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Carregando operação...
      </div>

      <div v-else-if="visibleQueue.length === 0" class="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">
        Nenhuma pendência encontrada neste filtro.
      </div>

      <article
        v-for="item in visibleQueue"
        v-else
        :key="item.key"
        class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">{{ item.kindLabel }}</span>
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="severityClass(item.severity)">
                {{ SEVERITY_LABEL[item.severity] || item.severity }}
              </span>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {{ item.statusLabel }}
              </span>
            </div>
            <h3 class="mt-2 break-words text-sm font-semibold text-slate-900 sm:text-base">{{ item.title }}</h3>
            <p class="mt-1 break-words text-sm text-slate-600">{{ item.description }}</p>
            <p v-if="item.technicalDescription" class="mt-1 break-words text-xs text-slate-400">{{ item.technicalDescription }}</p>
            <p v-if="item.timestamp" class="mt-2 text-xs text-slate-400">{{ formatDateTime(item.timestamp) }}</p>
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <template v-if="item.kind === 'integration'">
              <RouterLink
                v-if="auth.isAdmin"
                :to="{ name: 'integrations' }"
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Ver integração
              </RouterLink>
            </template>

            <template v-else-if="item.kind === 'stock'">
              <button
                v-if="auth.isAdmin && item.raw.status === 'awaiting_confirmation'"
                type="button"
                :disabled="workingKey === item.key"
                class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="confirmStock(item)"
              >
                Confirmar reposição
              </button>
              <button
                v-if="auth.isAdmin && canDismissStock(item.raw)"
                type="button"
                :disabled="workingKey === item.key"
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                @click="dismissStock(item)"
              >
                Dispensar
              </button>
              <RouterLink
                :to="{ name: 'inventory' }"
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Ver estoque
              </RouterLink>
            </template>

            <template v-else>
              <button
                type="button"
                :disabled="workingKey === item.key"
                class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                @click="updateConflict(item, 'resolved')"
              >
                Resolver
              </button>
              <button
                type="button"
                :disabled="workingKey === item.key"
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                @click="updateConflict(item, 'ignored')"
              >
                Ignorar
              </button>
              <RouterLink
                :to="{ name: 'audit', query: { severity: item.raw.severity } }"
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Ver auditoria
              </RouterLink>
            </template>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
