<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatDateTime, formatStockQty } from '@/lib/format'
import StockProductDetailModal from './StockProductDetailModal.vue'

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

const STATUS_LABELS = {
  pending: 'Pendente',
  awaiting_confirmation: 'Aguardando confirmação',
  insufficient_reserve: 'Reserva insuficiente',
  failed: 'Falhou',
  executed: 'Executado',
  dismissed: 'Dispensado',
  skipped_duplicate: 'Duplicado (ignorado)',
  // Pool recuperou sozinho (sync do idworks, ou canal com menos alocado) —
  // ver StockAlert::STATUSES no backend. Distinto de "executado": nenhuma
  // reposição rodou, o alerta só deixou de ser necessário.
  resolved: 'Resolvido',
}

// "Abertos" (o default) agrupa os 4 status operacionalmente relevantes —
// o resto (executed/dismissed/skipped_duplicate) só interessa pra
// histórico, então fica escondido até o usuário escolher "Todos".
const OPEN_STATUSES = [ 'pending', 'awaiting_confirmation', 'insufficient_reserve', 'failed' ]

const STATUS_FILTER_OPTIONS = [
  { value: 'open', label: 'Abertos' },
  { value: '', label: 'Todos' },
  ...Object.entries(STATUS_LABELS).map(([ value, label ]) => ({ value, label })),
]

const auth = useAuthStore()
const toast = useToast()

const alerts = ref([])
const meta = ref({})
const loading = ref(true)
const errorMessage = ref('')
const statusFilter = ref('open')
const page = ref(1)
const workingId = ref(null)
const detailProductId = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const status = statusFilter.value === 'open' ? OPEN_STATUSES : statusFilter.value || undefined
    const { data } = await api.get('/stock_alerts', { params: { status, page: page.value, per_page: 50 } })
    alerts.value = data.stock_alerts
    meta.value = data.meta || {}
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar os alertas.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function onStatusChange() {
  page.value = 1
  load()
}

function goToPage(newPage) {
  if (newPage < 1 || newPage > (meta.value.total_pages || 1)) return
  page.value = newPage
  load()
}

function statusBadgeClass(status) {
  if (status === 'executed' || status === 'resolved') return 'bg-emerald-100 text-emerald-700'
  if (status === 'failed') return 'bg-red-100 text-red-700'
  if (status === 'insufficient_reserve') return 'bg-amber-100 text-amber-700'
  if (status === 'dismissed' || status === 'skipped_duplicate') return 'bg-slate-100 text-slate-500'
  return 'bg-indigo-100 text-indigo-700' // pending / awaiting_confirmation
}

function openDetail(alert) {
  detailProductId.value = alert.product_id
}

function closeDetail() {
  detailProductId.value = null
}

// Dismiss vale pra qualquer status "aberto" (mesma regra do backend —
// StockAlert::OPEN_STATUSES); confirmar só faz sentido pra
// awaiting_confirmation, que é o único caso que ainda não tentou escrever.
function canDismiss(alert) {
  return [ 'pending', 'awaiting_confirmation', 'insufficient_reserve' ].includes(alert.status)
}

async function confirmAlert(alert) {
  workingId.value = alert.id
  try {
    // Não executa na hora — cria a StockReplenishmentExecution e devolve
    // logo em seguida; StockAlerts::ExecuteReplenishmentJob faz a escrita
    // real no canal de forma assíncrona (ver o backend). O status muda pra
    // "pendente" aqui; recarregar mais tarde mostra executado/falhou.
    await api.post(`/stock_alerts/${alert.id}/confirm`)
    toast.success('Reposição enfileirada — acompanhe o status nesta lista.')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível confirmar a reposição.')
  } finally {
    await load()
    workingId.value = null
  }
}

async function dismissAlert(alert) {
  // alert.channel pode ser null — Fase 2: alerta é por produto, o canal só
  // aparece quando havia um canal de maior prioridade configurado no
  // momento do disparo (ver StockAlerts::EvaluationService#resolve_target).
  const channelSuffix = alert.channel ? ` (${CHANNEL_LABELS[alert.channel] || alert.channel})` : ''
  if (!window.confirm(`Dispensar o alerta de ${alert.product_sku}${channelSuffix}?`)) return

  workingId.value = alert.id
  try {
    await api.post(`/stock_alerts/${alert.id}/dismiss`)
    toast.success('Alerta dispensado.')
    await load()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível dispensar o alerta.')
  } finally {
    workingId.value = null
  }
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="!auth.isAdmin" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
      Confirmar ou dispensar um alerta exige acesso de administrador — você pode consultar a lista normalmente.
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <select
        v-model="statusFilter"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        @change="onStatusChange"
      >
        <option v-for="opt in STATUS_FILTER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Produto</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Canal</th>
            <th class="px-4 py-2 text-right font-medium text-slate-600">Estoque livre no disparo</th>
            <th class="px-4 py-2 text-right font-medium text-slate-600">Reposição sugerida</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Status</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Quando</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading">
            <td colspan="7" class="px-4 py-6 text-center text-slate-400">Carregando...</td>
          </tr>
          <tr v-else-if="alerts.length === 0">
            <td colspan="7" class="px-4 py-6 text-center text-slate-400">Nenhum alerta encontrado.</td>
          </tr>
          <template v-else>
            <tr v-for="alert in alerts" :key="alert.id">
              <td class="px-4 py-2">
                <button
                  type="button"
                  class="text-slate-700 underline decoration-dotted underline-offset-2 hover:text-indigo-700"
                  title="Ver detalhe do produto"
                  @click="openDetail(alert)"
                >
                  {{ alert.product_sku }}
                </button>
              </td>
              <td class="px-4 py-2 text-slate-600">{{ alert.channel ? (CHANNEL_LABELS[alert.channel] || alert.channel) : '—' }}</td>
              <td class="px-4 py-2 text-right tabular-nums text-slate-700">{{ formatStockQty(alert.qty_at_trigger) ?? '—' }}</td>
              <td class="px-4 py-2 text-right tabular-nums text-slate-700">{{ formatStockQty(alert.suggested_replenishment_qty) ?? '—' }}</td>
              <td class="px-4 py-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="statusBadgeClass(alert.status)">
                  {{ STATUS_LABELS[alert.status] || alert.status }}
                </span>
                <p v-if="alert.status === 'failed' && alert.error_message" class="mt-1 max-w-[220px] text-xs text-red-600">
                  {{ alert.error_message }}
                </p>
              </td>
              <td class="whitespace-nowrap px-4 py-2 text-xs text-slate-500">
                {{ formatDateTime(alert.executed_at || alert.created_at) }}
              </td>
              <td class="px-4 py-2 text-right">
                <div v-if="auth.isAdmin" class="flex justify-end gap-2">
                  <button
                    v-if="alert.status === 'awaiting_confirmation'"
                    type="button"
                    :disabled="workingId === alert.id"
                    class="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
                    @click="confirmAlert(alert)"
                  >
                    Confirmar reposição
                  </button>
                  <button
                    v-if="canDismiss(alert)"
                    type="button"
                    :disabled="workingId === alert.id"
                    class="text-xs font-medium text-slate-500 hover:underline disabled:opacity-50"
                    @click="dismissAlert(alert)"
                  >
                    Dispensar
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="!errorMessage && alerts.length" class="flex items-center justify-between text-xs text-slate-500">
      <p>Página {{ meta.current_page || 1 }} de {{ meta.total_pages || 1 }} · {{ meta.total_count || 0 }} alertas</p>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="(meta.current_page || 1) <= 1 || loading"
          @click="goToPage((meta.current_page || 1) - 1)"
        >
          Anterior
        </button>
        <button
          type="button"
          class="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="(meta.current_page || 1) >= (meta.total_pages || 1) || loading"
          @click="goToPage((meta.current_page || 1) + 1)"
        >
          Próxima
        </button>
      </div>
    </div>

    <StockProductDetailModal v-if="detailProductId" :product-id="detailProductId" @close="closeDetail" />
  </div>
</template>
