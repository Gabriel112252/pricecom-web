<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import StatusBadge from '@/components/StatusBadge.vue'

const STATUS_OPTIONS = ['pending', 'partial', 'paid', 'overdue', 'disputed', 'canceled']

const loading = ref(true)
const errorMessage = ref('')
const dashboard = ref(null)
const sources = ref([])

const importForm = ref({
  financial_source_id: '',
  period_start: '',
  period_end: '',
  expected_payout_date: '',
  status: 'pending',
})
const importFile = ref(null)
const fileInputRef = ref(null)
const importing = ref(false)
const importMessage = ref('')
const importError = ref('')
const downloadingTemplate = ref(false)

async function loadDashboard() {
  const { data } = await api.get('/dashboard/financial')
  dashboard.value = data
}

async function loadSources() {
  const { data } = await api.get('/financial_sources')
  sources.value = data
}

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([loadDashboard(), loadSources()])
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar os dados financeiros.'
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

function handleFileChange(event) {
  importFile.value = event.target.files?.[0] || null
}

async function handleDownloadTemplate() {
  downloadingTemplate.value = true
  importError.value = ''
  try {
    const response = await api.get('/financial_settlements/template', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = 'modelo_repasse_pricecom.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch {
    importError.value = 'Não foi possível baixar o modelo CSV.'
  } finally {
    downloadingTemplate.value = false
  }
}

async function handleImport() {
  importMessage.value = ''
  importError.value = ''

  if (!importForm.value.financial_source_id) {
    importError.value = 'Selecione a fonte financeira.'
    return
  }
  if (!importFile.value) {
    importError.value = 'Selecione um arquivo CSV.'
    return
  }

  const formData = new FormData()
  formData.append('financial_source_id', importForm.value.financial_source_id)
  if (importForm.value.period_start) formData.append('period_start', importForm.value.period_start)
  if (importForm.value.period_end) formData.append('period_end', importForm.value.period_end)
  if (importForm.value.expected_payout_date) {
    formData.append('expected_payout_date', importForm.value.expected_payout_date)
  }
  if (importForm.value.status) formData.append('status', importForm.value.status)
  formData.append('file', importFile.value)

  importing.value = true
  try {
    await api.post('/financial_settlements/import', formData)
    importMessage.value = 'Repasse importado com sucesso!'
    importFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''
    await loadDashboard()
  } catch (e) {
    const errors = e.response?.data?.errors
    importError.value = Array.isArray(errors)
      ? errors.join(', ')
      : e.response?.data?.error || 'Falha ao importar o CSV.'
  } finally {
    importing.value = false
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="space-y-10 p-6 lg:p-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Financeiro</h1>
        <p class="mt-1 text-sm text-slate-500">Conciliação de repasses e recebíveis por fonte financeira.</p>
      </div>
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        :disabled="loading"
        @click="loadAll"
      >
        Atualizar
      </button>
    </div>

    <p v-if="errorMessage" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">{{ errorMessage }}</p>

    <div v-if="loading && !dashboard" class="text-sm text-slate-500">Carregando dados financeiros...</div>

    <template v-else-if="dashboard">
      <!-- Visão geral -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-slate-900">Visão geral</h2>
        <div class="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Repasses</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">{{ dashboard.totals.settlements_count }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Itens</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">{{ dashboard.totals.items_count }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor bruto</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">{{ formatMoney(dashboard.totals.gross_amount) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor líquido</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">{{ formatMoney(dashboard.totals.net_amount) }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor esperado</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">{{ formatMoney(dashboard.totals.expected_amount) }}</p>
          </div>
        </div>
      </section>

      <!-- Conciliação (destaque) -->
      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-slate-900">Conciliação</h2>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <StatusBadge status="matched" />
            <p class="mt-3 text-3xl font-bold text-emerald-700">{{ dashboard.totals.matched_count }}</p>
            <p class="text-xs font-medium uppercase tracking-wide text-emerald-700/70">Conciliados</p>
          </div>
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <StatusBadge status="disputed" />
            <p class="mt-3 text-3xl font-bold text-amber-700">{{ dashboard.totals.disputed_count }}</p>
            <p class="text-xs font-medium uppercase tracking-wide text-amber-700/70">Divergentes</p>
          </div>
          <div class="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <StatusBadge status="unmatched" />
            <p class="mt-3 text-3xl font-bold text-red-700">{{ dashboard.totals.unmatched_count }}</p>
            <p class="text-xs font-medium uppercase tracking-wide text-red-700/70">Não encontrados</p>
          </div>
          <div
            class="rounded-xl border p-5 shadow-sm"
            :class="
              Number(dashboard.totals.difference_amount) === 0
                ? 'border-slate-200 bg-white'
                : 'border-red-200 bg-red-50'
            "
          >
            <p class="text-xs font-semibold uppercase tracking-wide"
               :class="Number(dashboard.totals.difference_amount) === 0 ? 'text-slate-500' : 'text-red-700/70'"
            >
              Diferença
            </p>
            <p
              class="mt-3 text-3xl font-bold"
              :class="Number(dashboard.totals.difference_amount) === 0 ? 'text-slate-900' : 'text-red-700'"
            >
              {{ formatMoney(dashboard.totals.difference_amount) }}
            </p>
          </div>
        </div>
      </section>

      <!-- Por fonte financeira -->
      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Por fonte financeira</h2>
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Fonte</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Provider</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Tipo</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Repasses</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Itens</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Valor líquido</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Esperado</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Diferença</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Conciliados</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Divergentes</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Não encontrados</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!dashboard.by_source.length">
                <td colspan="11" class="px-4 py-6 text-center text-slate-400">
                  Nenhum dado por fonte financeira.
                </td>
              </tr>
              <tr v-for="row in dashboard.by_source" :key="row.financial_source_id">
                <td class="px-4 py-2 text-slate-900">{{ row.financial_source_name }}</td>
                <td class="px-4 py-2 text-slate-600">{{ row.provider }}</td>
                <td class="px-4 py-2 text-slate-600">{{ row.source_type }}</td>
                <td class="px-4 py-2 text-right whitespace-nowrap">{{ row.settlements_count }}</td>
                <td class="px-4 py-2 text-right whitespace-nowrap">{{ row.items_count }}</td>
                <td class="px-4 py-2 text-right whitespace-nowrap">{{ formatMoney(row.net_amount) }}</td>
                <td class="px-4 py-2 text-right whitespace-nowrap">{{ formatMoney(row.expected_amount) }}</td>
                <td
                  class="px-4 py-2 text-right whitespace-nowrap"
                  :class="Number(row.difference_amount) === 0 ? '' : 'text-red-600'"
                >
                  {{ formatMoney(row.difference_amount) }}
                </td>
                <td class="px-4 py-2 text-right text-emerald-600 whitespace-nowrap">{{ row.matched_count }}</td>
                <td class="px-4 py-2 text-right text-amber-600 whitespace-nowrap">{{ row.disputed_count }}</td>
                <td class="px-4 py-2 text-right text-red-600 whitespace-nowrap">{{ row.unmatched_count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Itens divergentes -->
      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Itens divergentes</h2>
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Fonte</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Pedido externo</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Pedido interno</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Valor recebido</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Valor esperado</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Diferença</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Data transação</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Data repasse</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!dashboard.disputed_items.length">
                <td colspan="9" class="px-4 py-6 text-center text-slate-400">Nenhum item divergente.</td>
              </tr>
              <tr v-for="item in dashboard.disputed_items" :key="item.id">
                <td class="px-4 py-2"><StatusBadge status="disputed" /></td>
                <td class="px-4 py-2 text-slate-900">{{ item.financial_source_name }}</td>
                <td class="px-4 py-2 text-slate-600">{{ item.external_order_id }}</td>
                <td class="px-4 py-2 text-slate-600">{{ item.order_number || '—' }}</td>
                <td class="px-4 py-2 text-right whitespace-nowrap">{{ formatMoney(item.net_amount) }}</td>
                <td class="px-4 py-2 text-right whitespace-nowrap">{{ formatMoney(item.expected_amount) }}</td>
                <td class="px-4 py-2 text-right text-red-600 whitespace-nowrap">{{ formatMoney(item.difference_amount) }}</td>
                <td class="px-4 py-2 text-slate-600">{{ formatDate(item.transaction_date) }}</td>
                <td class="px-4 py-2 text-slate-600">{{ formatDate(item.payout_date) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Itens não encontrados -->
      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Itens não encontrados</h2>
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Fonte</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Pedido externo</th>
                <th class="px-4 py-2 text-right font-medium text-slate-600 whitespace-nowrap">Valor recebido</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Data transação</th>
                <th class="px-4 py-2 text-left font-medium text-slate-600">Data repasse</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!dashboard.unmatched_items.length">
                <td colspan="6" class="px-4 py-6 text-center text-slate-400">Nenhum item não encontrado.</td>
              </tr>
              <tr v-for="item in dashboard.unmatched_items" :key="item.id">
                <td class="px-4 py-2"><StatusBadge status="unmatched" /></td>
                <td class="px-4 py-2 text-slate-900">{{ item.financial_source_name }}</td>
                <td class="px-4 py-2 text-slate-600">{{ item.external_order_id }}</td>
                <td class="px-4 py-2 text-right whitespace-nowrap">{{ formatMoney(item.net_amount) }}</td>
                <td class="px-4 py-2 text-slate-600">{{ formatDate(item.transaction_date) }}</td>
                <td class="px-4 py-2 text-slate-600">{{ formatDate(item.payout_date) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Importação CSV -->
      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Importar repasse (CSV)</h2>
        <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            :disabled="downloadingTemplate"
            @click="handleDownloadTemplate"
          >
            {{ downloadingTemplate ? 'Baixando...' : 'Baixar modelo CSV' }}
          </button>

          <form class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" @submit.prevent="handleImport">
            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Fonte financeira</label>
              <select
                v-model="importForm.financial_source_id"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="" disabled>Selecione...</option>
                <option v-for="source in sources" :key="source.id" :value="source.id">
                  {{ source.name }} ({{ source.provider }})
                </option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Início do período</label>
              <input
                v-model="importForm.period_start"
                type="date"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Fim do período</label>
              <input
                v-model="importForm.period_end"
                type="date"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Data prevista de repasse</label>
              <input
                v-model="importForm.expected_payout_date"
                type="date"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                v-model="importForm.status"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option v-for="status in STATUS_OPTIONS" :key="status" :value="status">{{ status }}</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Arquivo CSV</label>
              <input
                ref="fileInputRef"
                type="file"
                accept=".csv"
                class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                @change="handleFileChange"
              />
            </div>

            <div class="flex items-end sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                :disabled="importing"
              >
                {{ importing ? 'Importando...' : 'Importar CSV' }}
              </button>
            </div>
          </form>

          <p v-if="importMessage" class="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {{ importMessage }}
          </p>
          <p v-if="importError" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ importError }}</p>
        </div>
      </section>
    </template>
  </div>
</template>
