<script setup>
import { onMounted, ref } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatStockQty, formatDateTime } from '@/lib/format'

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

const SELLING_STATUS_LABELS = {
  selling: 'Vendendo',
  draft: 'Rascunho',
  inactive: 'Inativo',
  reviewing: 'Em análise',
  rejected: 'Reprovado',
  platform_blocked: 'Bloqueado pela plataforma',
  deleted: 'Excluído',
  unknown: 'Desconhecido',
}

const SELLING_STATUS_CLASS = {
  selling: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-slate-100 text-slate-600',
  inactive: 'bg-slate-100 text-slate-500',
  reviewing: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  platform_blocked: 'bg-red-100 text-red-700',
  deleted: 'bg-red-100 text-red-700',
  unknown: 'bg-slate-100 text-slate-400',
}

// Same 3 categories the backend's ChannelProductListingsController#CHANNEL_ACTIONS
// whitelists — the UI only ever offers what the backend actually accepts.
const CHANNEL_ACTIONS = {
  shopify: [
    { name: 'activate', label: 'Ativar' },
    { name: 'draft', label: 'Marcar rascunho' },
    { name: 'archive', label: 'Arquivar' },
    { name: 'publish', label: 'Publicar' },
    { name: 'unpublish', label: 'Despublicar' },
  ],
  tiktok: [
    { name: 'activate', label: 'Ativar' },
    { name: 'deactivate', label: 'Desativar' },
  ],
  yampi: [
    { name: 'activate_product', label: 'Ativar produto' },
    { name: 'deactivate_product', label: 'Desativar produto' },
    { name: 'block_sale', label: 'Bloquear venda do SKU' },
    { name: 'unblock_sale', label: 'Desbloquear venda do SKU' },
  ],
}

const EXECUTION_STATUS_LABELS = {
  pending: 'Pendente',
  executing: 'Em execução',
  succeeded: 'Sucesso',
  failed: 'Falhou',
  skipped: 'Ignorado',
}

const EXECUTION_STATUS_CLASS = {
  pending: 'bg-indigo-100 text-indigo-700',
  executing: 'bg-indigo-100 text-indigo-700',
  succeeded: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  skipped: 'bg-slate-100 text-slate-500',
}

const AUTOMATION_LEVELS = [
  { value: 'manual', label: 'Manual — só notifica' },
  { value: 'semi_automatic', label: 'Semi-automático — aguarda confirmação' },
  { value: 'automatic', label: 'Automático — repõe direto' },
]

const props = defineProps({
  productId: { type: [Number, String], required: true },
})
const emit = defineEmits(['close'])

const auth = useAuthStore()
const toast = useToast()
const loading = ref(true)
const errorMessage = ref('')
const product = ref(null)
const rule = ref(null)
const channels = ref([])
const history = ref(null)
const editingChannel = ref(null)
const editValue = ref('')
const updatingChannel = ref(null)
const runningAction = ref(null)
const editingPriority = ref(null)
const priorityValue = ref('')
const ruleForm = ref(null)
const savingRule = ref(false)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get(`/stock_overview/${props.productId}`)
    product.value = data.product
    rule.value = data.rule
    channels.value = data.channels || []
    history.value = data.replenishment_history || null
    ruleForm.value = blankRuleForm(data.rule)
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar o detalhe do produto.'
  } finally {
    loading.value = false
  }
}

function blankRuleForm(existingRule) {
  return {
    min_threshold: existingRule ? Number(existingRule.min_threshold) : 0,
    target_level: existingRule ? Number(existingRule.target_level) : '',
    automation_level: existingRule?.automation_level || 'manual',
    active: existingRule ? existingRule.active : true,
  }
}

onMounted(load)

function channelLabel(channelName) {
  return CHANNEL_LABELS[channelName] || channelName
}

function differenceClass(entry) {
  if (entry.difference == null) return 'text-slate-300'
  return entry.divergent ? 'text-amber-700' : 'text-slate-700'
}

function formatDifference(value) {
  if (value == null) return '—'
  const formatted = formatStockQty(value)
  if (formatted == null) return '—'
  return Number(value) > 0 ? `+${formatted}` : formatted
}

function startEdit(entry) {
  if (!auth.isAdmin || updatingChannel.value) return

  editingChannel.value = entry.channel
  editValue.value = formatStockQty(entry.stock_qty) ?? ''
}

function cancelEdit() {
  if (updatingChannel.value) return
  editingChannel.value = null
  editValue.value = ''
}

async function confirmEdit(entry) {
  if (editingChannel.value !== entry.channel || updatingChannel.value === entry.channel) return

  const requestedQuantity = editValue.value
  if (requestedQuantity === '' || Number.isNaN(Number(requestedQuantity)) || Number(requestedQuantity) < 0) {
    cancelEdit()
    toast.error('Informe uma quantidade maior ou igual a zero.')
    return
  }

  editingChannel.value = null
  updatingChannel.value = entry.channel

  try {
    const { data } = await api.patch(`/channel_product_listings/${entry.listing_id}`, {
      quantity: requestedQuantity,
    })
    const updatedListing = data.channel_product_listing || data
    entry.stock_qty = updatedListing.stock_qty
    // Mesma tolerância (0) do backend, ver
    // StockOverviewController::DIVERGENCE_TOLERANCE — só pra feedback
    // imediato; reabrir o modal busca o valor autoritativo.
    if (product.value?.has_origin) {
      entry.difference = Number(updatedListing.stock_qty) - Number(product.value.origin_qty_available)
      entry.divergent = entry.difference !== 0
    }
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível atualizar o estoque no canal.')
  } finally {
    updatingChannel.value = null
    editValue.value = ''
  }
}

function startEditPriority(entry) {
  if (!auth.isAdmin || updatingChannel.value) return
  editingPriority.value = entry.channel
  priorityValue.value = entry.channel_priority ?? ''
}

function cancelEditPriority() {
  editingPriority.value = null
  priorityValue.value = ''
}

async function confirmEditPriority(entry) {
  if (editingPriority.value !== entry.channel) return

  const raw = priorityValue.value
  if (raw !== '' && (Number.isNaN(Number(raw)) || Number(raw) <= 0 || !Number.isInteger(Number(raw)))) {
    toast.error('Prioridade deve ser um número inteiro maior que zero (ou vazio).')
    return
  }

  editingPriority.value = null
  try {
    const { data } = await api.patch(`/channel_product_listings/${entry.listing_id}`, {
      channel_priority: raw,
    })
    entry.channel_priority = data.channel_priority
    toast.success('Prioridade atualizada.')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível atualizar a prioridade.')
  } finally {
    priorityValue.value = ''
  }
}

function actionsFor(channelName) {
  return CHANNEL_ACTIONS[channelName] || []
}

async function runAction(entry, action) {
  if (!auth.isAdmin || runningAction.value) return
  if (!window.confirm(`${action.label} o produto em ${channelLabel(entry.channel)}?`)) return

  runningAction.value = `${entry.channel}:${action.name}`
  try {
    const { data } = await api.post(`/channel_product_listings/${entry.listing_id}/channel_action`, {
      channel_action_name: action.name,
    })
    Object.assign(entry, {
      remote_status: data.remote_status,
      remote_status_reason: data.remote_status_reason,
      remote_status_synced_at: data.remote_status_synced_at,
      status_stale: data.status_stale,
      selling_status: data.selling_status,
      selling_enabled: data.selling_enabled,
      replenishment_eligible: data.replenishment_eligible,
    })
    toast.success('Ação aplicada.')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível aplicar a ação.')
  } finally {
    runningAction.value = null
  }
}

async function saveRule() {
  if (!auth.isAdmin || savingRule.value) return

  savingRule.value = true
  try {
    const payload = { product_id: props.productId, ...ruleForm.value }
    const { data } = rule.value
      ? await api.put(`/stock_alert_rules/${rule.value.id}`, payload)
      : await api.post('/stock_alert_rules', payload)
    rule.value = data
    ruleForm.value = blankRuleForm(data)
    toast.success('Automação salva.')
  } catch (e) {
    const errors = e.response?.data?.errors
    toast.error(errors ? errors.join(', ') : 'Não foi possível salvar a automação.')
  } finally {
    savingRule.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">{{ product?.name || 'Produto' }}</h2>
          <p class="text-sm text-slate-500">{{ product?.sku }}</p>
        </div>
        <button type="button" class="shrink-0 text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <div v-if="loading" class="mt-6 text-sm text-slate-400">Carregando...</div>
      <div v-else-if="errorMessage" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ errorMessage }}
      </div>
      <template v-else>
        <div class="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span class="text-slate-500">Estoque de origem (idworks)</span>
          <span v-if="product.has_origin" class="font-medium tabular-nums text-slate-800">
            {{ formatStockQty(product.origin_qty_available) ?? '—' }}
            <span class="ml-2 text-xs font-normal text-slate-400">livre: {{ formatStockQty(product.free_reserve) ?? '—' }}</span>
          </span>
          <span
            v-else
            class="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
            title="Produto sem vínculo com o idworks — sem estoque de origem confiável."
          >
            Sem ERP
          </span>
        </div>

        <!-- Canais -->
        <h3 class="mt-5 text-sm font-semibold text-slate-900">Canais</h3>
        <div v-if="channels.length === 0" class="mt-2 text-sm text-slate-400">
          Este produto não está listado em nenhum canal.
        </div>
        <div v-else class="mt-2 space-y-3">
          <div v-for="entry in channels" :key="entry.listing_id" class="rounded-lg border border-slate-200 p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-medium text-slate-800">{{ channelLabel(entry.channel) }}</span>
              <div class="flex items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="SELLING_STATUS_CLASS[entry.selling_status] || SELLING_STATUS_CLASS.unknown">
                  {{ SELLING_STATUS_LABELS[entry.selling_status] || entry.selling_status }}
                </span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="entry.replenishment_eligible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                >
                  Elegível: {{ entry.replenishment_eligible ? 'Sim' : 'Não' }}
                </span>
              </div>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <div>
                <span class="text-xs text-slate-400">Estoque neste canal</span>
                <div class="tabular-nums">
                  <span
                    v-if="updatingChannel === entry.channel"
                    class="inline-flex items-center gap-1 text-xs text-indigo-600"
                  >
                    <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Atualizando...
                  </span>
                  <span v-else-if="editingChannel === entry.channel" class="inline-flex items-center gap-1">
                    <input
                      v-model="editValue"
                      type="number"
                      min="0"
                      step="any"
                      class="w-20 rounded border border-indigo-400 px-2 py-1 text-right tabular-nums text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      aria-label="Nova quantidade"
                      @keydown.enter.prevent="confirmEdit(entry)"
                      @keydown.esc.prevent="cancelEdit"
                    />
                    <button type="button" class="rounded p-1 text-emerald-600 hover:bg-emerald-50" title="Confirmar" @click="confirmEdit(entry)">✓</button>
                    <button type="button" class="rounded p-1 text-red-600 hover:bg-red-50" title="Cancelar" @click="cancelEdit">✕</button>
                  </span>
                  <button
                    v-else-if="auth.isAdmin"
                    type="button"
                    class="rounded px-1.5 py-0.5 font-medium text-slate-700 underline decoration-dotted underline-offset-2 hover:bg-indigo-50"
                    title="Editar estoque neste canal"
                    @click="startEdit(entry)"
                  >
                    {{ formatStockQty(entry.stock_qty) ?? '—' }}
                  </button>
                  <span v-else class="text-slate-700">{{ formatStockQty(entry.stock_qty) ?? '—' }}</span>
                  <span class="ml-2 font-medium" :class="differenceClass(entry)">{{ formatDifference(entry.difference) }}</span>
                </div>
              </div>

              <div>
                <span class="text-xs text-slate-400">Última sincronização</span>
                <div>
                  {{ formatDateTime(entry.remote_status_synced_at) }}
                  <span v-if="entry.status_stale" class="ml-1 text-amber-600" title="Sincronização desatualizada (mais de 6h)">⚠</span>
                </div>
              </div>

              <div>
                <span class="text-xs text-slate-400">Prioridade de abastecimento</span>
                <div>
                  <span v-if="editingPriority === entry.channel" class="inline-flex items-center gap-1">
                    <input
                      v-model="priorityValue"
                      type="number"
                      min="1"
                      step="1"
                      class="w-16 rounded border border-indigo-400 px-2 py-1 text-right tabular-nums text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      aria-label="Nova prioridade"
                      @keydown.enter.prevent="confirmEditPriority(entry)"
                      @keydown.esc.prevent="cancelEditPriority"
                    />
                    <button type="button" class="rounded p-1 text-emerald-600 hover:bg-emerald-50" title="Confirmar" @click="confirmEditPriority(entry)">✓</button>
                    <button type="button" class="rounded p-1 text-red-600 hover:bg-red-50" title="Cancelar" @click="cancelEditPriority">✕</button>
                  </span>
                  <button
                    v-else-if="auth.isAdmin"
                    type="button"
                    class="rounded px-1.5 py-0.5 font-medium text-slate-700 underline decoration-dotted underline-offset-2 hover:bg-indigo-50"
                    title="Editar prioridade"
                    @click="startEditPriority(entry)"
                  >
                    {{ entry.channel_priority ?? '—' }}
                  </button>
                  <span v-else>{{ entry.channel_priority ?? '—' }}</span>
                </div>
              </div>
            </div>

            <p v-if="entry.remote_status_reason" class="mt-2 text-xs text-slate-400">{{ entry.remote_status_reason }}</p>

            <div v-if="auth.isAdmin && actionsFor(entry.channel).length" class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="action in actionsFor(entry.channel)"
                :key="action.name"
                type="button"
                :disabled="runningAction === `${entry.channel}:${action.name}`"
                class="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                @click="runAction(entry, action)"
              >
                {{ runningAction === `${entry.channel}:${action.name}` ? 'Aplicando...' : action.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Automação -->
        <h3 class="mt-5 text-sm font-semibold text-slate-900">Automação</h3>
        <div v-if="!auth.isAdmin && !rule" class="mt-2 text-sm text-slate-400">Nenhuma regra configurada.</div>
        <div v-else-if="ruleForm" class="mt-2 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 text-sm">
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Estoque mínimo (pool)</span>
            <input
              v-model.number="ruleForm.min_threshold"
              type="number" min="0" step="0.001" :disabled="!auth.isAdmin"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-50"
            />
          </label>
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Abastecer até</span>
            <input
              v-model.number="ruleForm.target_level"
              type="number" min="0" step="0.001" :disabled="!auth.isAdmin"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-50"
            />
          </label>
          <label class="col-span-2 text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Automação</span>
            <select v-model="ruleForm.automation_level" :disabled="!auth.isAdmin" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-50">
              <option v-for="a in AUTOMATION_LEVELS" :key="a.value" :value="a.value">{{ a.label }}</option>
            </select>
          </label>
          <label class="col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input v-model="ruleForm.active" type="checkbox" :disabled="!auth.isAdmin" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            Regra ativa
          </label>
          <p class="col-span-2 text-xs text-slate-400">
            A reposição automática escreve no canal de maior prioridade configurada acima (menor número = maior prioridade).
          </p>
          <div v-if="auth.isAdmin" class="col-span-2 flex justify-end">
            <button
              type="button"
              :disabled="savingRule"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              @click="saveRule"
            >
              {{ savingRule ? 'Salvando...' : (rule ? 'Salvar automação' : 'Criar regra') }}
            </button>
          </div>
        </div>

        <!-- Histórico -->
        <h3 class="mt-5 text-sm font-semibold text-slate-900">Histórico de abastecimento</h3>
        <div v-if="!history || history.executions.length === 0" class="mt-2 text-sm text-slate-400">
          Nenhum abastecimento registrado ainda.
        </div>
        <template v-else>
          <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
            <div>Total abastecido: <span class="font-medium text-slate-700">{{ formatStockQty(history.total_replenished) ?? '0' }}</span></div>
            <div>Último: <span class="font-medium text-slate-700">{{ formatDateTime(history.last_replenishment_at) }}</span></div>
            <div>Falhas: <span class="font-medium text-slate-700">{{ history.failed_count }}</span></div>
            <div>Ignorados: <span class="font-medium text-slate-700">{{ history.skipped_count }}</span></div>
          </div>
          <div class="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
            <table class="w-full text-xs">
              <thead class="sticky top-0 bg-slate-50">
                <tr class="text-left text-slate-500">
                  <th class="px-2 py-1.5 font-semibold">Canal</th>
                  <th class="px-2 py-1.5 font-semibold">Status</th>
                  <th class="px-2 py-1.5 text-right font-semibold">Solicitado</th>
                  <th class="px-2 py-1.5 text-right font-semibold">Confirmado</th>
                  <th class="px-2 py-1.5 font-semibold">Quando</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="execution in history.executions" :key="execution.id" class="border-t border-slate-100">
                  <td class="px-2 py-1.5 text-slate-700">{{ channelLabel(execution.channel) }}</td>
                  <td class="px-2 py-1.5">
                    <span class="rounded-full px-1.5 py-0.5 font-medium" :class="EXECUTION_STATUS_CLASS[execution.status]">
                      {{ EXECUTION_STATUS_LABELS[execution.status] || execution.status }}
                    </span>
                    <p v-if="execution.error_message" class="mt-0.5 max-w-[220px] text-red-600">{{ execution.error_message }}</p>
                  </td>
                  <td class="px-2 py-1.5 text-right tabular-nums">{{ formatStockQty(execution.requested_qty) ?? '—' }}</td>
                  <td class="px-2 py-1.5 text-right tabular-nums">{{ formatStockQty(execution.confirmed_qty) ?? '—' }}</td>
                  <td class="px-2 py-1.5 text-slate-500">{{ formatDateTime(execution.finished_at || execution.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </template>

      <div class="mt-5 flex justify-end">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="emit('close')"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
</template>
