<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatMoney, formatPct, formatDateTime } from '@/lib/format'
import PaymentFeeRuleModal from './PaymentFeeRuleModal.vue'

const auth = useAuthStore()
const toast = useToast()

const rules = ref([])
const loading = ref(true)
const submitting = ref(false)
const editingRule = ref(null)
const showModal = ref(false)

const PAYMENT_METHOD_LABEL = {
  credit_card: 'Cartão de crédito',
  pix: 'Pix',
  boleto: 'Boleto',
}

const CARD_BRAND_LABEL = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  hipercard: 'Hipercard',
  amex: 'Amex',
}

async function loadRules() {
  loading.value = true
  try {
    const { data } = await api.get('/payment_fee_rules')
    rules.value = data
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível carregar as taxas cadastradas.')
  } finally {
    loading.value = false
  }
}

function openNewRule() {
  editingRule.value = null
  showModal.value = true
}

function openEditRule(rule) {
  editingRule.value = rule
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingRule.value = null
}

async function saveRule(payload) {
  submitting.value = true
  try {
    if (editingRule.value?.id) {
      await api.put(`/payment_fee_rules/${editingRule.value.id}`, payload)
      toast.success('Taxa atualizada.')
    } else {
      await api.post('/payment_fee_rules', payload)
      toast.success('Taxa cadastrada.')
    }
    closeModal()
    await loadRules()
  } catch (e) {
    const errors = e.response?.data?.errors
    toast.error(errors ? errors.join(', ') : 'Não foi possível salvar a taxa.')
  } finally {
    submitting.value = false
  }
}

async function removeRule(rule) {
  if (!window.confirm(`Remover a regra de ${PAYMENT_METHOD_LABEL[rule.payment_method]}${rule.card_brand ? ` (${CARD_BRAND_LABEL[rule.card_brand]})` : ''}?`)) return

  try {
    await api.delete(`/payment_fee_rules/${rule.id}`)
    toast.success('Taxa removida.')
    await loadRules()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível remover a taxa.')
  }
}

function rateLabel(rule) {
  return rule.rate_type === 'percentage' ? formatPct(rule.rate_value) : formatMoney(rule.rate_value)
}

function validityLabel(rule) {
  const from = formatDateTime(rule.valid_from)?.split(',')[0] ?? rule.valid_from
  if (!rule.valid_until) return `desde ${from}`
  const until = formatDateTime(rule.valid_until)?.split(',')[0] ?? rule.valid_until
  return `${from} — ${until}`
}

onMounted(() => {
  if (auth.isAdmin) loadRules()
})
</script>

<template>
  <div class="border-t border-slate-100 pt-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Taxas negociadas (Pagar.me)</h3>
        <p class="mt-1 text-xs text-slate-400">
          Cadastre aqui as taxas negociadas com sua adquirente — não há como buscar isso automaticamente da API da
          Pagar.me, só na dashboard deles para consulta humana. O Pricecom usa esse cadastro para comparar contra a
          taxa realmente cobrada em cada transação e apontar divergências em Auditoria.
        </p>
      </div>
      <button
        v-if="auth.isAdmin"
        type="button"
        class="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        @click="openNewRule"
      >
        Nova taxa
      </button>
    </div>

    <div v-if="!auth.isAdmin" class="mt-3 text-sm text-slate-400">Acesso restrito a administradores.</div>

    <template v-else>
      <div v-if="loading" class="mt-3 text-sm text-slate-400">Carregando...</div>
      <div v-else-if="!rules.length" class="mt-3 text-sm text-slate-400">Nenhuma taxa cadastrada ainda.</div>
      <div v-else class="mt-3 max-h-[360px] overflow-y-auto pr-1">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-white">
            <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="pb-2 pr-3 font-semibold">Forma</th>
              <th class="pb-2 pr-3 font-semibold">Bandeira</th>
              <th class="pb-2 pr-3 font-semibold">Parcelas</th>
              <th class="pb-2 pr-3 text-right font-semibold">Taxa</th>
              <th class="pb-2 pr-3 font-semibold">Vigência</th>
              <th class="pb-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in rules" :key="rule.id" class="border-t border-slate-100">
              <td class="py-2 pr-3 text-slate-700">{{ PAYMENT_METHOD_LABEL[rule.payment_method] ?? rule.payment_method }}</td>
              <td class="py-2 pr-3 text-slate-600">{{ rule.card_brand ? (CARD_BRAND_LABEL[rule.card_brand] ?? rule.card_brand) : '—' }}</td>
              <td class="py-2 pr-3 tabular-nums text-slate-600">{{ rule.installments_from }}–{{ rule.installments_to }}x</td>
              <td class="py-2 pr-3 text-right font-semibold tabular-nums text-slate-900">{{ rateLabel(rule) }}</td>
              <td class="py-2 pr-3 text-xs text-slate-500">{{ validityLabel(rule) }}</td>
              <td class="py-2 text-right">
                <button type="button" class="text-xs font-medium text-indigo-600 hover:underline" @click="openEditRule(rule)">Editar</button>
                <button type="button" class="ml-3 text-xs font-medium text-red-600 hover:underline" @click="removeRule(rule)">Remover</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <PaymentFeeRuleModal
      v-if="showModal"
      :rule="editingRule"
      :submitting="submitting"
      @close="closeModal"
      @save="saveRule"
    />
  </div>
</template>
