<script setup>
import { ref, watch, onMounted } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { formatStockQty, formatStockDifference, formatPctOrDash } from '@/lib/format'

const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
})

const toast = useToast()

const loading = ref(false)
const running = ref(false)
const errorMessage = ref('')
const items = ref([])
const thresholdPct = ref(5)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/reconciliation_overview', {
      params: { from: props.from, to: props.to, threshold_pct: thresholdPct.value },
    })
    items.value = data.items || []
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar a reconciliação.'
  } finally {
    loading.value = false
  }
}

// O botão dispara o mesmo período atualmente selecionado no filtro global
// — não existe um segundo seletor de período próprio desta aba, pra não
// haver ambiguidade entre "o que está na tela" e "o que vai ser recomputado".
async function runNow() {
  running.value = true
  try {
    const { data } = await api.post('/integrations/idworks/reconcile', {
      from: props.from,
      to: props.to,
      threshold_pct: thresholdPct.value,
    })

    if (data.success) {
      toast.success(`Reconciliação concluída: ${data.items_count} SKU(s), ${data.divergent_count} divergente(s).`)
    } else {
      toast.error(data.error_message || 'Não foi possível concluir a reconciliação.')
    }
  } catch (e) {
    toast.error(e.response?.data?.error || e.response?.data?.errors?.[0] || 'Não foi possível rodar a reconciliação agora.')
  } finally {
    running.value = false
    load()
  }
}

watch(() => [props.from, props.to], load)
watch(thresholdPct, load)

onMounted(load)
</script>

<template>
  <section class="space-y-4">
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-slate-900">Reconciliação idworks × Pricecom</h3>
          <p class="mt-0.5 text-xs text-slate-400">
            Quantidade vendida por SKU: nota fiscal do idworks (fonte de verdade) x order_items do Pricecom.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-1.5 text-xs text-slate-500">
            Threshold
            <input
              v-model.number="thresholdPct"
              type="number"
              min="0"
              step="0.5"
              class="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700"
            />
            %
          </label>
          <button
            type="button"
            :disabled="running"
            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            @click="runNow"
          >
            {{ running ? 'Rodando...' : 'Rodar agora' }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="mt-4 text-sm text-slate-500">Carregando reconciliação...</div>
      <div v-else-if="errorMessage" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {{ errorMessage }}
      </div>
      <div v-else-if="items.length === 0" class="empty-frame mt-4 flex items-center justify-center text-sm text-slate-400">
        Sem reconciliação rodada para este período ainda — clique em "Rodar agora".
      </div>

      <table v-else class="mt-4 w-full text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th class="pb-2 pr-2">SKU</th>
            <th class="pb-2 pr-2">Produto</th>
            <th class="pb-2 pr-2 text-right">Qtd idworks</th>
            <th class="pb-2 pr-2 text-right">Qtd Pricecom</th>
            <th class="pb-2 pr-2 text-right">Diferença</th>
            <th class="pb-2 text-right">Diferença %</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="item in items" :key="item.id" :class="item.divergent ? 'bg-amber-50' : ''">
            <td class="py-2 pr-2 text-slate-500">{{ item.sku }}</td>
            <td class="py-2 pr-2 text-slate-800">
              {{ item.product_name || '—' }}
              <span
                v-if="item.unmatched_in_idworks"
                class="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
              >
                Não faturado no idworks
              </span>
            </td>
            <td class="py-2 pr-2 text-right tabular-nums text-slate-700">{{ formatStockQty(item.idworks_qty) }}</td>
            <td class="py-2 pr-2 text-right tabular-nums text-slate-700">{{ formatStockQty(item.pricecom_qty) }}</td>
            <td class="py-2 pr-2 text-right tabular-nums" :class="item.divergent ? 'font-medium text-amber-700' : 'text-slate-700'">
              {{ formatStockDifference(item.diff_qty) }}
            </td>
            <td class="py-2 text-right tabular-nums" :class="item.divergent ? 'font-medium text-amber-700' : 'text-slate-700'">
              {{ item.diff_pct === null ? '—' : formatPctOrDash(item.diff_pct) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.empty-frame {
  height: 120px;
}
</style>
