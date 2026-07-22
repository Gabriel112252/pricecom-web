<script setup>
import { ref, computed, watch } from 'vue'
import api from '@/lib/api'
import ProductComboBox from '@/components/ProductComboBox.vue'

const props = defineProps({
  rule: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const AUTOMATION_LEVELS = [
  { value: 'manual', label: 'Manual — só notifica' },
  { value: 'semi_automatic', label: 'Semi-automático — aguarda confirmação' },
  { value: 'automatic', label: 'Automático — repõe direto' },
]

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

function blankForm() {
  return {
    min_threshold: 0,
    target_level: '',
    automation_level: 'manual',
    active: true,
  }
}

// min_threshold/target_level come from the API as decimal(12,3) strings
// (ex: "3000.0") — cast to Number so the number input displays a plain
// value instead of that trailing-decimal string.
function withNumericThresholds(rule) {
  return { ...blankForm(), ...rule, min_threshold: Number(rule.min_threshold), target_level: Number(rule.target_level) }
}

const form = ref(props.rule ? withNumericThresholds(props.rule) : blankForm())
const selectedProductId = ref(props.rule?.product_id || '')
const initialProduct = props.rule ? { sku: props.rule.product_sku, name: props.rule.product_name || props.rule.product_sku } : null
const channelListings = ref([])
const loadingChannels = ref(false)
const channelsError = ref('')

watch(
  () => props.rule,
  (rule) => {
    form.value = rule ? withNumericThresholds(rule) : blankForm()
    selectedProductId.value = rule?.product_id || ''
  },
)

const isEditing = computed(() => !!props.rule?.id)

// Produto identifica a regra (índice único no backend, uma regra por
// produto — Fase 2) — trocar o produto na edição criaria uma regra
// "diferente" sem querer, então fica travado depois de criada, mesmo
// padrão de "SKU" travado em outras telas deste projeto quando o campo é
// parte da identidade do registro.
const identityLocked = computed(() => isEditing.value)

const canSubmit = computed(() => !!selectedProductId.value)

function channelLabel(channel) {
  return CHANNEL_LABELS[channel] || channel
}

async function loadChannelsForProduct(productId) {
  channelListings.value = []
  channelsError.value = ''
  if (!productId) return

  loadingChannels.value = true
  try {
    const { data } = await api.get(`/stock_overview/${productId}`)
    channelListings.value = (data.channels || []).map((c) => ({
      listing_id: c.listing_id,
      channel: c.channel,
      channel_priority: c.channel_priority,
    }))
    // Produto num canal só: prioridade 1 preenchida sozinha, sem forçar o
    // usuário a configurar manualmente algo que só tem uma resposta óbvia.
    if (channelListings.value.length === 1 && channelListings.value[0].channel_priority == null) {
      channelListings.value[0].channel_priority = 1
    }
  } catch {
    channelsError.value = 'Não foi possível carregar os canais deste produto.'
  } finally {
    loadingChannels.value = false
  }
}

function onProductSelect(product) {
  loadChannelsForProduct(product.id)
}

if (selectedProductId.value) {
  loadChannelsForProduct(selectedProductId.value)
}

function submit() {
  if (!canSubmit.value) return

  emit('save', {
    rule: { ...form.value, product_id: selectedProductId.value },
    channel_priorities: channelListings.value.map((c) => ({ listing_id: c.listing_id, channel_priority: c.channel_priority })),
  })
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-900">{{ isEditing ? 'Editar regra de alerta' : 'Nova regra de alerta' }}</h2>
        <button type="button" class="shrink-0 text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <form class="mt-5 space-y-4" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-3">
          <label class="col-span-2 text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Produto</span>
            <ProductComboBox
              v-model="selectedProductId"
              :initial-product="initialProduct"
              :disabled="identityLocked"
              placeholder="Buscar por SKU ou nome..."
              class="mt-1"
              @select="onProductSelect"
            />
          </label>

          <div v-if="loadingChannels" class="col-span-2 text-xs text-slate-400">Carregando canais do produto...</div>
          <div v-else-if="channelsError" class="col-span-2 text-xs text-red-600">{{ channelsError }}</div>
          <div v-else-if="selectedProductId && channelListings.length === 0" class="col-span-2 text-xs text-slate-400">
            Este produto ainda não está listado em nenhum canal — a reposição automática não terá pra onde escrever até um sync criar um canal para ele.
          </div>
          <div v-else-if="channelListings.length" class="col-span-2 rounded-lg border border-slate-200 p-3">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Prioridade de abastecimento por canal</span>
            <p class="mt-0.5 text-xs text-slate-400">Menor número = maior prioridade. Vazio = nunca escolhido pela reposição automática.</p>
            <div class="mt-2 space-y-2">
              <div v-for="entry in channelListings" :key="entry.listing_id" class="flex items-center justify-between gap-2 text-sm">
                <span class="text-slate-700">{{ channelLabel(entry.channel) }}</span>
                <input
                  v-model.number="entry.channel_priority"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="—"
                  class="w-20 rounded-lg border border-slate-300 p-1.5 text-right text-sm"
                />
              </div>
            </div>
          </div>

          <label class="col-span-2 text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Automação</span>
            <select v-model="form.automation_level" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm">
              <option v-for="a in AUTOMATION_LEVELS" :key="a.value" :value="a.value">{{ a.label }}</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Limite mínimo</span>
            <input v-model.number="form.min_threshold" type="number" min="0" step="0.001" required class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </label>
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Nível alvo de reposição</span>
            <input v-model.number="form.target_level" type="number" min="0" step="0.001" required class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </label>
        </div>
        <p class="text-xs text-slate-400">
          Alerta dispara quando o estoque livre do produto (idworks menos o que já está alocado em cada canal) ficar
          igual ou abaixo do limite mínimo; a reposição automática, quando habilitada, escreve no canal de maior
          prioridade configurada acima, até o nível alvo, limitada ao estoque livre.
        </p>

        <label class="flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-700">
          <input v-model="form.active" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
          Regra ativa
        </label>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            :disabled="submitting"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="submitting || !canSubmit"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {{ isEditing ? 'Salvar alterações' : 'Cadastrar regra' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
