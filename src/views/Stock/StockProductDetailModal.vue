<script setup>
import { onMounted, ref } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatStockQty } from '@/lib/format'

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

const props = defineProps({
  productId: { type: [Number, String], required: true },
})
const emit = defineEmits(['close'])

const auth = useAuthStore()
const toast = useToast()
const loading = ref(true)
const errorMessage = ref('')
const product = ref(null)
const channels = ref([])
const editingChannel = ref(null)
const editValue = ref('')
const updatingChannel = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get(`/stock_overview/${props.productId}`)
    product.value = data.product
    channels.value = data.channels || []
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar o detalhe do produto.'
  } finally {
    loading.value = false
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
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
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
          </span>
          <span
            v-else
            class="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
            title="Produto sem vínculo com o idworks — sem estoque de origem confiável."
          >
            Sem ERP
          </span>
        </div>

        <div v-if="channels.length === 0" class="mt-4 text-sm text-slate-400">
          Este produto não está listado em nenhum canal.
        </div>
        <table v-else class="mt-4 w-full text-sm">
          <thead>
            <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="pb-2 pr-3 font-semibold">Canal</th>
              <th class="pb-2 pr-3 text-right font-semibold">Estoque</th>
              <th class="pb-2 text-right font-semibold">Diferença</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in channels" :key="entry.listing_id" class="border-t border-slate-100">
              <td class="py-2 pr-3 text-slate-700">
                {{ channelLabel(entry.channel) }}
                <span v-if="entry.min_threshold != null" class="block text-xs text-slate-400">
                  mín: {{ formatStockQty(entry.min_threshold) }}
                </span>
              </td>
              <td class="py-2 pr-3 text-right tabular-nums">
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
                  <button
                    type="button"
                    class="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                    title="Confirmar"
                    aria-label="Confirmar nova quantidade"
                    @click="confirmEdit(entry)"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    class="rounded p-1 text-red-600 hover:bg-red-50"
                    title="Cancelar"
                    aria-label="Cancelar edição"
                    @click="cancelEdit"
                  >
                    ✕
                  </button>
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
              </td>
              <td class="py-2 text-right tabular-nums font-medium" :class="differenceClass(entry)">
                {{ formatDifference(entry.difference) }}
              </td>
            </tr>
          </tbody>
        </table>
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
