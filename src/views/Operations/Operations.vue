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
const runtime = ref({ processing: { queues: [] }, incidents: [] })
const loading = ref(false)
const sourceErrors = ref([])
const workingKey = ref(null)
const activeFilter = ref('all')
const searchTerm = ref('')
const testingWhatsapp = ref(false)

async function load() {
  loading.value = true
  sourceErrors.value = []

  const [ integrationsResult, runtimeResult, stockResult, conflictsResult ] = await Promise.allSettled([
    api.get('/integration_health'),
    api.get('/integration_health', { params: { runtime: 1 } }),
    api.get('/stock_alerts', { params: { status: OPEN_STOCK_STATUSES, page: 1, per_page: 100 } }),
    api.get('/audit_conflicts', { params: { status: 'open', operational_queue: true, page: 1, per_page: 100 } }),
  ])

  if (integrationsResult.status === 'fulfilled') integrationHealth.value = integrationsResult.value.data || []
  else { integrationHealth.value = []; sourceErrors.value.push('Integrações') }

  if (runtimeResult.status === 'fulfilled') runtime.value = runtimeResult.value.data || { processing: { queues: [] }, incidents: [] }
  else { runtime.value = { processing: { queues: [] }, incidents: [] }; sourceErrors.value.push('Filas de processamento') }

  if (stockResult.status === 'fulfilled') stockAlerts.value = stockResult.value.data?.stock_alerts || []
  else { stockAlerts.value = []; sourceErrors.value.push('Estoque') }

  if (conflictsResult.status === 'fulfilled') auditConflicts.value = conflictsResult.value.data?.audit_conflicts || []
  else { auditConflicts.value = []; sourceErrors.value.push('Auditoria e anomalias') }

  loading.value = false
}

onMounted(load)

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 0
}

function toTime(value) {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function severityClass(severity) {
  return {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-amber-100 text-amber-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-slate-100 text-slate-600',
  }[severity] || 'bg-slate-100 text-slate-600'
}

function queueSeverity(q) {
  if (Number(q.duplicate_jobs || 0) > 100 || Number(q.latency_seconds || 0) > 1800) return 'critical'
  if (Number(q.duplicate_jobs || 0) > 0 || Number(q.latency_seconds || 0) > 300) return 'high'
  if (Number(q.size || 0) > 0) return 'medium'
  return 'low'
}

function formatDuration(seconds) {
  const value = Number(seconds || 0)
  if (value < 60) return `${Math.round(value)}s`
  if (value < 3600) return `${Math.round(value / 60)}min`
  return `${(value / 3600).toFixed(1)}h`
}

function growthLabel(value) {
  if (value === null || value === undefined) return 'aguardando próximo snapshot'
  const sign = Number(value) > 0 ? '+' : ''
  return `${sign}${Number(value).toFixed(2)} jobs/min`
}

const processing = computed(() => runtime.value?.processing || { queues: [] })
const processingQueues = computed(() => processing.value.queues || [])
const incidents = computed(() => runtime.value?.incidents || [])

const queue = computed(() => {
  const integrations = integrationHealth.value
    .filter((health) => health.health_status === 'error' || health.health_status === 'pending')
    .map((health) => ({
      key: `integration-${health.id}`,
      kind: 'integration',
      kindLabel: 'Integração',
      severity: health.health_status === 'error' ? 'critical' : 'medium',
      statusLabel: health.health_status === 'error' ? 'Com erro' : 'Pendente',
      title: health.name || health.channel_name || health.provider || `Integração #${health.id}`,
      description: health.health_status === 'error'
        ? `${health.logs_error_last_24h || 0} falha(s) nas últimas 24h.`
        : `${health.events_pending_count || 0} evento(s) aguardando processamento.`,
      technicalDescription: health.health_status === 'error'
        ? `Última falha: ${formatDateTime(health.last_event_error_at || health.last_error_at) || 'sem horário'}`
        : null,
      timestamp: health.last_event_error_at || health.last_error_at || health.last_event_at || health.last_synced_at,
      raw: health,
    }))

  const stock = stockAlerts.value.map((alert) => ({
    key: `stock-${alert.id}`,
    kind: 'stock',
    kindLabel: 'Estoque',
    severity: alert.status === 'failed' ? 'critical' : alert.status === 'insufficient_reserve' ? 'high' : 'medium',
    statusLabel: alert.status,
    title: `SKU ${alert.product_sku}`,
    description: alert.status === 'failed'
      ? 'A reposição automática não foi concluída.'
      : `Reserva livre: ${formatStockQty(alert.qty_at_trigger) ?? '—'} · reposição sugerida: ${formatStockQty(alert.suggested_replenishment_qty) ?? '—'}`,
    timestamp: alert.executed_at || alert.created_at,
    raw: alert,
  }))

  const conflicts = auditConflicts.value.map((conflict) => {
    const metadata = conflict.metadata || {}
    const anomaly = ANOMALY_TYPES.includes(conflict.conflict_type)
    const tracking = conflict.conflict_type === YAMPI_TRACKING_OPERATION_TYPE
    const unintegrated = conflict.conflict_type === YAMPI_IDWORKS_OPERATION_TYPE
    const kind = tracking ? 'tracking' : unintegrated ? 'integration' : anomaly ? 'anomaly' : 'audit'
    const order = metadata.yampi_number || metadata.yampi_id || conflict.order_number

    return {
      key: `${kind}-${conflict.id}`,
      kind,
      kindLabel: tracking ? 'Rastreio' : unintegrated ? 'Integração' : anomaly ? 'Anomalia' : 'Auditoria',
      severity: conflict.severity || 'medium',
      statusLabel: tracking ? (TRACKING_ISSUE_LABEL[metadata.issue_code] || 'Sem rastreio') : conflict.status,
      title: CONFLICT_TYPE_LABEL[conflict.conflict_type] || conflict.conflict_type,
      description: tracking
        ? `Pedido Yampi ${order || 'sem identificação'} sem rastreio confirmado.`
        : unintegrated
          ? `Pedido Yampi ${order || 'sem identificação'} ainda não possui integração confirmada.`
          : metadata.last_error || conflict.notes || 'Pendência operacional aberta.',
      technicalDescription: metadata.last_error ? `Último erro: ${metadata.last_error}` : null,
      timestamp: conflict.updated_at || conflict.created_at,
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

function countForFilter(key) {
  if (key === 'all') return queue.value.length
  if (key === 'critical') return criticalCount.value
  return queue.value.filter((item) => item.kind === key).length
}

async function confirmStock(item) {
  workingKey.value = item.key
  try {
    await api.post(`/stock_alerts/${item.raw.id}/confirm`)
    toast.success('Reposição enfileirada.')
    await load()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível confirmar a reposição.')
  } finally { workingKey.value = null }
}

async function dismissStock(item) {
  if (!window.confirm(`Dispensar o alerta do SKU ${item.raw.product_sku}?`)) return
  workingKey.value = item.key
  try {
    await api.post(`/stock_alerts/${item.raw.id}/dismiss`)
    toast.success('Alerta dispensado.')
    await load()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível dispensar o alerta.')
  } finally { workingKey.value = null }
}

async function reprocessUnintegratedOrder(item) {
  if (!window.confirm('Reprocessar este pedido?')) return
  workingKey.value = item.key
  try {
    await api.post(`/audit_conflicts/${item.raw.id}/reprocess`)
    toast.success('Pedido reenfileirado.')
    await load()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível reprocessar o pedido.')
  } finally { workingKey.value = null }
}

async function updateConflict(item, status) {
  workingKey.value = item.key
  try {
    await api.patch(`/audit_conflicts/${item.raw.id}`, { status })
    toast.success(status === 'resolved' ? 'Pendência resolvida.' : 'Pendência ocultada.')
    await load()
  } catch {
    toast.error('Não foi possível atualizar a pendência.')
  } finally { workingKey.value = null }
}

async function testWhatsappAlert() {
  testingWhatsapp.value = true
  try {
    await api.post('/operational_notifications/whatsapp_test')
    toast.success('Teste de WhatsApp enfileirado.')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível disparar o teste.')
  } finally { testingWhatsapp.value = false }
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader title="Operação" subtitle="Erros, filas, causas prováveis e solução operacional em um único lugar.">
      <template #actions>
        <button v-if="auth.isAdmin" type="button" :disabled="testingWhatsapp" class="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 disabled:opacity-50" @click="testWhatsappAlert">
          {{ testingWhatsapp ? 'Enviando...' : 'Testar WhatsApp' }}
        </button>
        <button type="button" :disabled="loading" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-50" @click="load">
          {{ loading ? 'Atualizando...' : 'Atualizar' }}
        </button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p class="text-xs font-semibold uppercase text-slate-500">Pendências</p><p class="mt-2 text-3xl font-bold">{{ queue.length }}</p></div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p class="text-xs font-semibold uppercase text-slate-500">Críticos</p><p class="mt-2 text-3xl font-bold text-red-600">{{ criticalCount }}</p></div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p class="text-xs font-semibold uppercase text-slate-500">Jobs enfileirados</p><p class="mt-2 text-3xl font-bold">{{ processing.total_enqueued || 0 }}</p><p class="mt-1 text-xs text-slate-400">{{ processing.busy || 0 }}/{{ processing.concurrency || 0 }} workers ocupados</p></div>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p class="text-xs font-semibold uppercase text-slate-500">Retry / Dead</p><p class="mt-2 text-3xl font-bold">{{ processing.retry_count || 0 }} / {{ processing.dead_count || 0 }}</p><p class="mt-1 text-xs text-slate-400">Scheduled: {{ processing.scheduled_count || 0 }}</p></div>
    </div>

    <div v-if="sourceErrors.length" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
      Carregamento parcial. Falhou: {{ sourceErrors.join(', ') }}.
    </div>

    <section class="space-y-3">
      <div>
        <h2 class="text-base font-semibold text-slate-900">Filas de processamento</h2>
        <p class="text-sm text-slate-500">Tamanho, atraso do job mais antigo, crescimento e duplicidade estimada.</p>
      </div>

      <div v-if="processing.available === false" class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Sidekiq/Redis indisponível: {{ processing.error }}
      </div>

      <div v-else-if="processingQueues.length === 0" class="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhuma fila encontrada.</div>

      <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th class="px-4 py-3">Sistema</th><th class="px-4 py-3">Fila</th><th class="px-4 py-3">Jobs</th><th class="px-4 py-3">Mais antigo</th><th class="px-4 py-3">Crescimento</th><th class="px-4 py-3">Duplicados</th><th class="px-4 py-3">Saúde</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="q in processingQueues" :key="`${q.source || 'unknown'}-${q.name}`">
                <td class="px-4 py-3 text-xs font-medium text-slate-500">{{ q.source_label || q.source || 'Pricecom' }}</td>
                <td class="px-4 py-3 font-semibold text-slate-900">{{ q.name }}</td>
                <td class="px-4 py-3">{{ q.size }}</td>
                <td class="px-4 py-3">{{ formatDuration(q.latency_seconds) }}</td>
                <td class="px-4 py-3">{{ growthLabel(q.growth_per_minute) }}</td>
                <td class="px-4 py-3">{{ q.duplicate_jobs }} <span class="text-xs text-slate-400">em amostra {{ q.sampled_jobs }}</span></td>
                <td class="px-4 py-3"><span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="severityClass(queueSeverity(q))">{{ SEVERITY_LABEL[queueSeverity(q)] || queueSeverity(q) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="space-y-3">
      <div>
        <h2 class="text-base font-semibold text-slate-900">Erros conhecidos e solução</h2>
        <p class="text-sm text-slate-500">Runbook dos problemas que já encontramos nas integrações e filas.</p>
      </div>
      <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <details v-for="incident in incidents" :key="incident.code" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary class="cursor-pointer list-none">
            <div class="flex items-center justify-between gap-3">
              <div><p class="font-semibold text-slate-900">{{ incident.title }}</p><p class="mt-1 text-xs text-slate-400">{{ incident.match }}</p></div>
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="severityClass(incident.severity)">{{ SEVERITY_LABEL[incident.severity] || incident.severity }}</span>
            </div>
          </summary>
          <div class="mt-4 space-y-3 border-t border-slate-100 pt-3 text-sm">
            <div><p class="text-xs font-semibold uppercase text-slate-400">Causa provável</p><p class="mt-1 text-slate-600">{{ incident.cause }}</p></div>
            <div><p class="text-xs font-semibold uppercase text-slate-400">Solução</p><p class="mt-1 text-slate-600">{{ incident.solution }}</p></div>
            <div class="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">Ação: {{ incident.action }}</div>
          </div>
        </details>
      </div>
    </section>

    <section class="space-y-4">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex max-w-full gap-2 overflow-x-auto pb-1">
          <button v-for="filter in FILTERS" :key="filter.key" type="button" class="shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium" :class="activeFilter === filter.key ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600'" @click="activeFilter = filter.key">
            {{ filter.label }} <span class="ml-1 text-xs opacity-70">{{ countForFilter(filter.key) }}</span>
          </button>
        </div>
        <input v-model="searchTerm" type="search" placeholder="Buscar pedido, SKU ou integração" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm xl:w-80" />
      </div>

      <div v-if="loading && queue.length === 0" class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Carregando operação...</div>
      <div v-else-if="visibleQueue.length === 0" class="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">Nenhuma pendência encontrada neste filtro.</div>

      <template v-else>
        <article v-for="item in visibleQueue" :key="item.key" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2"><span class="text-xs font-semibold uppercase text-slate-400">{{ item.kindLabel }}</span><span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="severityClass(item.severity)">{{ SEVERITY_LABEL[item.severity] || item.severity }}</span><span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{ item.statusLabel }}</span></div>
              <h3 class="mt-2 font-semibold text-slate-900">{{ item.title }}</h3>
              <p class="mt-1 text-sm text-slate-600">{{ item.description }}</p>
              <p v-if="item.technicalDescription" class="mt-1 text-xs font-medium text-red-600">{{ item.technicalDescription }}</p>
              <p v-if="item.timestamp" class="mt-2 text-xs text-slate-400">{{ formatDateTime(item.timestamp) }}</p>
            </div>

            <div v-if="auth.isAdmin" class="flex shrink-0 flex-wrap gap-2">
              <button v-if="item.raw.conflict_type === YAMPI_IDWORKS_OPERATION_TYPE" type="button" :disabled="workingKey === item.key" class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" @click="reprocessUnintegratedOrder(item)">Reprocessar</button>
              <button v-if="item.kind === 'stock' && item.raw.status === 'awaiting_confirmation'" type="button" :disabled="workingKey === item.key" class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" @click="confirmStock(item)">Confirmar reposição</button>
              <button v-if="item.kind === 'stock'" type="button" :disabled="workingKey === item.key" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-50" @click="dismissStock(item)">Dispensar</button>
              <button v-if="item.raw.conflict_type" type="button" :disabled="workingKey === item.key" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 disabled:opacity-50" @click="updateConflict(item, 'ignored')">Ocultar</button>
              <RouterLink v-if="item.kind === 'integration' || item.kind === 'tracking'" :to="{ name: 'integrations' }" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600">Ver integração</RouterLink>
            </div>
          </div>
        </article>
      </template>
    </section>
  </div>
</template>
