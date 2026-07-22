<script setup>
import { ref } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatStockQty, stockDifferenceClass, formatStockDifference } from '@/lib/format'

// Uma linha de SKU na Visão por canal — usada tanto pra uma linha solo
// (produto sem irmãos no canal) quanto pra cada filho dentro de um grupo
// de produto-pai expandido (StockBalanceTable.vue), com o MESMO formato de
// dado (channel_row_json no backend) nos dois casos.
const props = defineProps({
  row: { type: Object, required: true },
  indent: { type: Boolean, default: false },
})

const auth = useAuthStore()
const toast = useToast()
const editing = ref(false)
const editValue = ref('')
const updating = ref(false)

function startEdit() {
  if (!auth.isAdmin || !props.row.listing_id || updating.value) return
  editing.value = true
  editValue.value = formatStockQty(props.row.channel_stock_qty) ?? ''
}

function cancelEdit() {
  if (updating.value) return
  editing.value = false
  editValue.value = ''
}

async function confirmEdit() {
  if (!editing.value || updating.value) return

  const requestedQuantity = editValue.value
  if (!props.row.listing_id || requestedQuantity === '' || Number.isNaN(Number(requestedQuantity)) || Number(requestedQuantity) < 0) {
    cancelEdit()
    toast.error('Informe uma quantidade maior ou igual a zero.')
    return
  }

  editing.value = false
  updating.value = true

  try {
    const { data } = await api.patch(`/channel_product_listings/${props.row.listing_id}`, {
      quantity: requestedQuantity,
    })
    const updatedListing = data.channel_product_listing || data
    props.row.channel_stock_qty = updatedListing.stock_qty
    // Mesma tolerância (0) do backend, ver
    // StockOverviewController::DIVERGENCE_TOLERANCE — só pra feedback
    // imediato; reabrir/recarregar a tela busca o valor autoritativo (e,
    // se esta linha for filha de um grupo, o total do pai só recalcula no
    // próximo load — ver comentário em StockBalanceTable.vue).
    if (props.row.has_origin) {
      props.row.difference = Number(updatedListing.stock_qty) - Number(props.row.origin_qty_available)
      props.row.divergent = props.row.difference !== 0
    }
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível atualizar o estoque no canal.')
  } finally {
    updating.value = false
    editValue.value = ''
  }
}
</script>

<template>
  <tr>
    <td class="px-4 py-2 text-slate-500" :class="indent ? 'pl-10' : ''">{{ row.sku }}</td>
    <td class="px-4 py-2 text-slate-800">{{ row.name }}</td>
    <td class="px-4 py-2 text-right tabular-nums">
      <span v-if="updating" class="inline-flex items-center gap-1 text-xs text-indigo-600">
        <svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Atualizando...
      </span>
      <span v-else-if="editing" class="inline-flex items-center gap-1">
        <input
          v-model="editValue"
          type="number"
          min="0"
          step="any"
          class="w-20 rounded border border-indigo-400 px-2 py-1 text-right tabular-nums text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          aria-label="Nova quantidade"
          @keydown.enter.prevent="confirmEdit"
          @keydown.esc.prevent="cancelEdit"
        />
        <button
          type="button"
          class="rounded p-1 text-emerald-600 hover:bg-emerald-50"
          title="Confirmar"
          aria-label="Confirmar nova quantidade"
          @click="confirmEdit"
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
        @click="startEdit"
      >
        {{ formatStockQty(row.channel_stock_qty) ?? '—' }}
      </button>
      <span v-else class="text-slate-700">{{ formatStockQty(row.channel_stock_qty) ?? '—' }}</span>
    </td>
    <td class="px-4 py-2 text-right tabular-nums text-slate-700">
      <span v-if="row.has_origin">{{ formatStockQty(row.origin_qty_available) ?? '—' }}</span>
      <span
        v-else
        class="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
        title="Produto sem vínculo com o idworks — sem estoque de origem confiável."
      >
        Sem ERP
      </span>
    </td>
    <td class="px-4 py-2 text-right tabular-nums font-medium" :class="stockDifferenceClass(row)">
      {{ formatStockDifference(row.difference) }}
    </td>
  </tr>
</template>
