<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  rule: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'pix', label: 'Pix' },
  { value: 'boleto', label: 'Boleto' },
]

const CARD_BRANDS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'hipercard', label: 'Hipercard' },
  { value: 'amex', label: 'Amex' },
]

function blankForm() {
  return {
    payment_method: 'credit_card',
    card_brand: 'visa',
    installments_from: 1,
    installments_to: 1,
    rate_type: 'percentage',
    rate_value: '',
    fixed_fee_boleto: 0,
    fixed_fee_gateway: 0,
    fixed_fee_antifraud: 0,
    withdrawal_fee: 0,
    anticipation_rate: 0,
    valid_from: new Date().toISOString().slice(0, 10),
    valid_until: '',
  }
}

const form = ref(props.rule ? { ...blankForm(), ...props.rule } : blankForm())

watch(
  () => props.rule,
  (rule) => {
    form.value = rule ? { ...blankForm(), ...rule } : blankForm()
  },
)

const isEditing = computed(() => !!props.rule?.id)
const isCard = computed(() => form.value.payment_method === 'credit_card')
const isBoleto = computed(() => form.value.payment_method === 'boleto')

watch(isCard, (card) => {
  if (!card) form.value.card_brand = null
  else if (!form.value.card_brand) form.value.card_brand = 'visa'
})

function submit() {
  const payload = { ...form.value }
  if (!isCard.value) payload.card_brand = null
  if (payload.valid_until === '') payload.valid_until = null
  emit('save', payload)
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-900">{{ isEditing ? 'Editar taxa negociada' : 'Nova taxa negociada' }}</h2>
        <button type="button" class="shrink-0 text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <form class="mt-5 space-y-4" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Forma de pagamento</span>
            <select v-model="form.payment_method" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm">
              <option v-for="pm in PAYMENT_METHODS" :key="pm.value" :value="pm.value">{{ pm.label }}</option>
            </select>
          </label>
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Bandeira</span>
            <select
              v-model="form.card_brand"
              :disabled="!isCard"
              class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option v-for="cb in CARD_BRANDS" :key="cb.value" :value="cb.value">{{ cb.label }}</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Parcelas de</span>
            <input v-model.number="form.installments_from" type="number" min="1" required class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </label>
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Parcelas até</span>
            <input v-model.number="form.installments_to" type="number" min="1" required class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo de taxa</span>
            <select v-model="form.rate_type" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm">
              <option value="percentage">Percentual</option>
              <option value="fixed_amount">Valor fixo</option>
            </select>
          </label>
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Taxa ({{ form.rate_type === 'percentage' ? '%' : 'R$' }})
            </span>
            <input v-model.number="form.rate_value" type="number" min="0" step="0.01" required class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </label>
        </div>

        <div class="border-t border-slate-100 pt-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Taxas fixas adicionais (opcional)</p>
          <div class="mt-2 grid grid-cols-2 gap-3">
            <label v-if="isBoleto" class="text-sm">
              <span class="text-xs text-slate-500">Emissão de boleto (R$)</span>
              <input v-model.number="form.fixed_fee_boleto" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </label>
            <label class="text-sm">
              <span class="text-xs text-slate-500">Gateway (R$)</span>
              <input v-model.number="form.fixed_fee_gateway" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </label>
            <label class="text-sm">
              <span class="text-xs text-slate-500">Antifraude (R$)</span>
              <input v-model.number="form.fixed_fee_antifraud" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </label>
            <label class="text-sm">
              <span class="text-xs text-slate-500">Saque (R$)</span>
              <input v-model.number="form.withdrawal_fee" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </label>
            <label class="text-sm">
              <span class="text-xs text-slate-500">Antecipação (% a.m.)</span>
              <input v-model.number="form.anticipation_rate" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
            </label>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Válida a partir de</span>
            <input v-model="form.valid_from" type="date" required class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </label>
          <label class="text-sm">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Válida até (opcional)</span>
            <input v-model="form.valid_until" type="date" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </label>
        </div>

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
            :disabled="submitting"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {{ isEditing ? 'Salvar alterações' : 'Cadastrar taxa' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
