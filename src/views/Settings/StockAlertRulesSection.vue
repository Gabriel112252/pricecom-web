<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatStockQty } from '@/lib/format'
import StockAlertRuleModal from './StockAlertRuleModal.vue'

const auth = useAuthStore()
const toast = useToast()

const rules = ref([])
const loading = ref(true)
const submitting = ref(false)
const editingRule = ref(null)
const showModal = ref(false)

const AUTOMATION_LABEL = {
  manual: 'Manual',
  semi_automatic: 'Semi-automático',
  automatic: 'Automático',
}

async function loadRules() {
  loading.value = true
  try {
    const { data } = await api.get('/stock_alert_rules')
    rules.value = data
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível carregar as regras de alerta.')
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
      await api.put(`/stock_alert_rules/${editingRule.value.id}`, payload)
      toast.success('Regra atualizada.')
    } else {
      await api.post('/stock_alert_rules', payload)
      toast.success('Regra cadastrada.')
    }
    closeModal()
    await loadRules()
  } catch (e) {
    const errors = e.response?.data?.errors
    toast.error(errors ? errors.join(', ') : 'Não foi possível salvar a regra.')
  } finally {
    submitting.value = false
  }
}

async function removeRule(rule) {
  if (!window.confirm(`Remover a regra de estoque de ${rule.product_sku}?`)) return

  try {
    await api.delete(`/stock_alert_rules/${rule.id}`)
    toast.success('Regra removida.')
    await loadRules()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível remover a regra.')
  }
}

onMounted(() => {
  if (auth.isAdmin) loadRules()
})
</script>

<template>
  <div class="border-t border-slate-100 pt-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Alertas de estoque</h3>
        <p class="mt-1 text-xs text-slate-400">
          Defina, por produto, quando disparar um alerta de estoque baixo e se a reposição deve ser manual,
          confirmada por um administrador ou automática. A reposição automática usa o canal de maior prioridade
          configurada. Consulte o saldo e os alertas em aberto na aba Estoque.
        </p>
      </div>
      <button
        v-if="auth.isAdmin"
        type="button"
        class="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        @click="openNewRule"
      >
        Nova regra
      </button>
    </div>

    <div v-if="!auth.isAdmin" class="mt-3 text-sm text-slate-400">Acesso restrito a administradores.</div>

    <template v-else>
      <div v-if="loading" class="mt-3 text-sm text-slate-400">Carregando...</div>
      <div v-else-if="!rules.length" class="mt-3 text-sm text-slate-400">Nenhuma regra cadastrada ainda.</div>
      <div v-else class="mt-3 max-h-[360px] overflow-y-auto pr-1">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-white">
            <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="pb-2 pr-3 font-semibold">Produto</th>
              <th class="pb-2 pr-3 text-right font-semibold">Mínimo</th>
              <th class="pb-2 pr-3 text-right font-semibold">Alvo</th>
              <th class="pb-2 pr-3 font-semibold">Automação</th>
              <th class="pb-2 pr-3 font-semibold">Ativa</th>
              <th class="pb-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in rules" :key="rule.id" class="border-t border-slate-100">
              <td class="py-2 pr-3 text-slate-700">{{ rule.product_sku }}</td>
              <td class="py-2 pr-3 text-right tabular-nums text-slate-600">{{ formatStockQty(rule.min_threshold) ?? '—' }}</td>
              <td class="py-2 pr-3 text-right tabular-nums text-slate-600">{{ formatStockQty(rule.target_level) ?? '—' }}</td>
              <td class="py-2 pr-3 text-slate-600">{{ AUTOMATION_LABEL[rule.automation_level] || rule.automation_level }}</td>
              <td class="py-2 pr-3">
                <span v-if="rule.active" class="text-emerald-600">Sim</span>
                <span v-else class="text-slate-400">Não</span>
              </td>
              <td class="py-2 text-right">
                <button type="button" class="text-xs font-medium text-indigo-600 hover:underline" @click="openEditRule(rule)">Editar</button>
                <button type="button" class="ml-3 text-xs font-medium text-red-600 hover:underline" @click="removeRule(rule)">Remover</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <StockAlertRuleModal
      v-if="showModal"
      :rule="editingRule"
      :submitting="submitting"
      @close="closeModal"
      @save="saveRule"
    />
  </div>
</template>
