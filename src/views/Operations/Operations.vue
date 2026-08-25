<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatDateTime, formatStockQty } from '@/lib/format'
import PageHeader from '@/components/PageHeader.vue'
import { CONFLICT_TYPE_LABEL, SEVERITY_LABEL } from '@/views/Audit/lib/auditLabels'

const OPEN_STOCK_STATUSES = [ 'pending', 'awaiting_confirmation', 'insufficient_reserve', 'failed' ]
const ANOMALY_TYPES = [ 'order_volume_drop', 'sku_volume_drop' ]
const YAMPI_IDWORKS_OPERATION_TYPE = 'yampi_order_not_integrated'
const YAMPI_TRACKING_OPERATION_TYPE = 'yampi_tracking_not_synced'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

const TRACKING_ISSUE_LABEL = {
  idworks_tracking_code_missing: 'Sem código na IDWorks',
  idworks_tracking_url_missing: 'Sem URL na IDWorks',
  idworks_order_not_found: 'Pedido não encontrado na IDWorks',
  yampi_tracking_code_missing: 'Sem código na Yampi',
  yampi_tracking_url_missing: 'Sem URL na Yampi',
  yampi_tracking_sync_not_confirmed: 'Falha ao sincronizar na Yampi',
  yampi_order_not_found: 'Pedido não encontrado na Yampi',
  tracking_reconciliation_error: 'Erro na validação do rastreio',
}

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
  { key: 'tracking', label: 'Rastreio' },
  { key: 'anomaly', label: 'Anomalias' },
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
const testingWhatsapp = ref(false)

async function load() {
  loading.value = true
  sourceErrors.value = []

  const [ integrationsResult, stockResult, conflictsResult ] = await Promise.allSettled([
    api.get('/integration_health'),
    api.get('/stock_alerts', { params: { status: OPEN_STOCK_STATUSES, page: 1, per_page: 100 } }),
    api.get('/audit_conflicts', { params: { status: 'open', operational_queue: true, page: 1, per_page: 100 } }),
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
    sourceErrors.value.push('Auditoria e anomalias')
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

function isRecent(value) {
  const time = toTime(value)
  return time > 0 && time >= Date.now() - ONE_DAY_MS
}

function anomalyDescription(conflict) {
  const metadata = conflict.metadata || {}
  const expected = Number(conflict.expected_value || 0)
  const actual = Number(conflict.actual_value || 0)
  const drop = Number(metadata.drop_pct || 0)
  const windowMinutes = Number(metadata.window_minutes || 60)

  if (conflict.conflict_type === 'order_volume_drop') {
    const scope = metadata.channel_name || 'Todos os canais'
    return `${scope}: ${Math.round(actual)} pedido(s) nos últimos ${windowMinutes} min · esperado ~${expected.toFixed(1)} · queda ${drop.toFixed(0)}%`
  }

  const sku = metadata.sku || conflict.product_sku || 'sem SKU'
  const channelBreakdown = Array.isArray(metadata.channel_breakdown) ? metadata.channel_breakdown : []
  const affectedChannels = channelBreakdown
    .filter((row) => row?.affected)
    .map((row) => row.channel_name)
    .filter(Boolean)
  const channelLabel = affectedChannels.length
    ? ` · ${affectedChannels.length === 1 ? 'Canal' : 'Canais'}: ${affectedChannels.join(', ')}`
    : ''

  return `SKU ${sku}: ${actual.toFixed(0)} un. nos últimos ${windowMinutes} min · esperado ~${expected.toFixed(1)} · queda ${drop.toFixed(0)}%${channelLabel}`
}

function unintegratedOrderDescription(conflict) {
  const metadata = conflict.metadata || {}
  const order = metadata.yampi_number || metadata.yampi_id || 'sem identificação'
  const hours = Number(metadata.hours_waiting || 0)
  const waiting = hours > 0 ? `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h` : 'mais de 2h'

  return `Pedido Yampi ${order} pago há ${waiting} ainda não possui pedido/mapeamento na IDWorks.`
}

function trackingDescription(conflict) {
  const metadata = conflict.metadata || {}
  const order = metadata.yampi_number || metadata.yampi_id || 'sem identificação'
  const issue = TRACKING_ISSUE_LABEL[metadata.issue_code] || 'Rastreio não confirmado'

  return `Pedido Yampi ${order} está Em transporte sem rastreio confirmado · ${issue}.`
}

function trackingTechnicalDescription(conflict) {
  const metadata = conflict.metadata || {}
  const parts = [
    metadata.idworks_id ? `IDWorks ${metadata.idworks_id}` : null,
    `IDWorks: ${metadata.idworks_tracking_code || 'sem ShippingId'}`,
    `Yampi: ${metadata.yampi_tracking_code || 'sem track_code'}`,
    metadata.issue_message || null,
    metadata.last_error ? `Último erro: ${metadata.last_error}` : null,
  ].filter(Boolean)

  return parts.join(' · ')
}

const integrationIssues = computed(() =>
  integrationHealth.value.filter((item) => {
    if (item.health_status === 'pending') return true
    if (item.health_status !== 'error') return false

    return Number(item.logs_error_last_24h || 0) > 0
      || isRecent(item.last_error_at)
      || isRecent(item.last_event_error_at)
  })
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
        ? 'A integração apresentou uma falha recente que ainda precisa de atenção.'
        : `${health.events_pending_count || 0} evento(s) aguardando processamento.`,
    technicalDescription:
      health.health_status === 'error'
        ? `${health.logs_error_last_24h || 0} falha(s) de sync nas últimas 24h · última falha ${formatDateTime(health.last_event_error_at || health.last_error_at) || 'sem horário'}`
        : null,
    technicalError: health.health_status === 'error',
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
    technicalError: false,
    timestamp: alert.executed_at || alert.created_at,
    raw: alert,
  }))

  const conflicts = auditConflicts.value.map((conflict) => {
    const anomaly = ANOMALY_TYPES.includes(conflict.conflict_type)
    const unintegrated = conflict.conflict_type === YAMPI_IDWORKS_OPERATION_TYPE
    const tracking = conflict.conflict_type === YAMPI_TRACKING_OPERATION_TYPE
    const metadata = conflict.metadata || {}
    const kind = tracking ? 'tracking' : (unintegrated ? 'integration' : (anomaly ? 'anomaly' : 'audit'))

    return {
      key: `${kind}-${conflict.id}`,
      kind,
      kindLabel: tracking ? 'Rastreio' : (unintegrated ? 'Integração' : (anomaly ? 'Anomalia' : 'Auditoria')),
      severity: conflict.severity || 'medium',
      statusLabel: tracking
        ? (TRACKING_ISSUE_LABEL[metadata.issue_code] || 'Sem rastreio')
        : unintegrated ? 'Não integrado' : (anomaly ? 'Detectado' : 'Aberto'),
      title: CONFLICT_TYPE_LABEL[conflict.conflict_type] || conflict.conflict_type,
      description: tracking
        ? trackingDescription(conflict)
        : unintegrated
          ? unintegratedOrderDescription(conflict)
          : anomaly
            ? anomalyDescription(conflict)
            : [
                conflict.order_number ? `Pedido ${conflict.order_number}` : null,
                conflict.product_sku ? `SKU ${conflict.product_sku}` : null,
              ].filter(Boolean).join(' · ') || 'Conflito sem pedido ou SKU vinculado.',
      technicalDescription: tracking
        ? trackingTechnicalDescription(conflict)
        : unintegrated
          ? (metadata.last_error ? `Erro IDWorks: ${metadata.last_error}` : 'O integrador revalida automaticamente e remove esta pendência assim que o mapping IDWorks existir.')
          : anomaly ? 'Baseline: mesmo horário das 4 semanas anteriores.' : null,
      technicalError: Boolean(metadata.last_error),
      timestamp: tracking
        ? (metadata.detected_at || metadata.last_checked_at || conflict.updated_at || conflict.created_at)
        : unintegrated
          ? (metadata.paid_at || conflict.updated_at || conflict.created_at)
          : anomaly ? (conflict.updated_at || conflict.created_at) : conflict.created_at,
      raw: conflict,
    }
  })

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
const integrationCount = computed(() => queue.value.filter((item) => item.kind === 'integration').length)
const anomalyCount = computed(() => queue.value.filter((item) => item.kind === 'anomaly').length)

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

async function reprocessUnintegratedOrder(item) {
  const metadata = item.raw.metadata || {}
  const order = metadata.yampi_number || metadata.yampi_id || item.raw.id
  if (!window.confirm(`Reprocessar o pedido Yampi ${order} para a IDWorks?`)) return

  workingKey.value = item.key
  try {
    const response = await api.post(`/audit_conflicts/${item.raw.id}/reprocess`)
    const status = response.data?.status

    if (status === 'already_resolved') {
      toast.success('O pedido já estava integrado. A pendência foi resolvida.')
    } else {
      toast.success('Pedido reenfileirado no integrador.')
    }

    await load()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível reprocessar o pedido.')
  } finally {
    workingKey.value = null
  }
}

async function updateConflict(item, status) {
  const verb = status === 'resolved' ? 'resolver' : 'ocultar'
  if (!window.confirm(`Deseja ${verb} esta pendência?`)) return

  workingKey.value = item.key
  try {
    await api.patch(`/audit_conflicts/${item.raw.id}`, { status })
    toast.success(status === 'resolved' ? 'Pendência resolvida.' : 'Pendência ocultada.')
    await load()
  } catch {
    toast.error('Não foi possível atualizar a pendência.')
  } finally {
    workingKey.value = null
  }
}

async function testWhatsappAlert() {
  testingWhatsapp.value = true
  try {
    await api.post('/operational_notifications/whatsapp_test')
    toast.success('Teste de WhatsApp enfileirado. A mensagem deve chegar em instantes.')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível disparar o teste de WhatsApp.')
  } finally {
    testingWhatsapp.value = false
  }
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader title="Operação" subtitle="O que precisa de atenção agora, sem misturar histórico resolvido com a fila atual.">
      <template #actions>
        <button
          v-if="auth.isAdmin"
          type="button"
          :disabled="testingWhatsapp"
          class="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          @click="testWhatsappAlert"
        >
          {{ testingWhatsapp ? 'Enviando teste...' : 'Testar WhatsApp' }}
        </button>
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
        <p class="mt-2 text-3xl font-bold text-slate-900">{{ integrationCount }}</p>
        <p class="mt-1 text-xs text-slate-400">com erro ou processamento pendente</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Anomalias</p>
        <p class="mt-2 text-3xl font-bold text-slate-900">{{ anomalyCount }}</p>
        <p class="mt-1 text-xs text-slate-400">quedas de volume fora do padrão</p>
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

      <template v-else>
        <article
          v-for="item in visibleQueue"
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
              <p
                v-if="item.technicalDescription"
                class="mt-1 break-words text-xs"
                :class="item.technicalError ? 'font-medium text-red-600' : 'text-slate-400'"
              >
                {{ item.technicalDescription }}
              </p>
              <p v-if="item.timestamp" class="mt-2 text-xs text-slate-400">{{ formatDateTime(item.timestamp) }}</p>
            </div>

            <div class="flex shrink-0 flex-wrap items-center gap-2">
              <template v-if="item.kind === 'integration'">
                <button
                  v-if="auth.isAdmin && item.raw.conflict_type === YAMPI_IDWORKS_OPERATION_TYPE"
                  type="button"
                  :disabled="workingKey === item.key"
                  class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="reprocessUnintegratedOrder(item)"
                >
                  {{ workingKey === item.key ? 'Reprocessando...' : 'Reprocessar' }}
                </button>
                <button
                  v-if="auth.isAdmin && item.raw.conflict_type === YAMPI_IDWORKS_OPERATION_TYPE"
                  type="button"
                  :disabled="workingKey === item.key"
                  class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="updateConflict(item, 'ignored')"
                >
                  Ocultar
                </button>
                <RouterLink
                  v-if="auth.isAdmin"
                  :to="{ name: 'integrations' }"
                  class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Ver integração
                </RouterLink>
              </template>

              <template v-else-if="item.kind === 'tracking'">
                <span class="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                  Resolve automaticamente ao receber rastreio ou sair de Em transporte
                </span>
                <button
                  v-if="auth.isAdmin && item.raw.conflict_type === YAMPI_TRACKING_OPERATION_TYPE"
                  type="button"
                  :disabled="workingKey === item.key"
                  class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="updateConflict(item, 'ignored')"
                >
                  Ocultar
                </button>
                <RouterLink
                  v-if="auth.isAdmin"
                  :to="{ name: 'integrations' }"
                  class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Ver integração
                </RouterLink>
              </template>

              <template v-else-if="item.kind === 'anomaly'">
                <span class="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                  Resolve automaticamente ao normalizar
                </span>
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
                  Ocultar
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
      </template>
    </section>
  </div>
</template>