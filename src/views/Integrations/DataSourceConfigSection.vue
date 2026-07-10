<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'

const DATA_TYPE_LABELS = {
  cost: 'Custo',
  freight: 'Frete',
  tax: 'Imposto',
  payment_reconciliation: 'Reconciliação',
}

const SOURCE_LABELS = {
  idworks: 'idworks',
  pagarme: 'Pagar.me',
}

const toast = useToast()
const configs = ref([])
const loading = ref(true)
const savingType = ref(null)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/data_source_configs')
    configs.value = data
  } catch {
    toast.error('Não foi possível carregar as fontes de dado.')
  } finally {
    loading.value = false
  }
}

async function changeSource(config, source) {
  if (source === config.source) return

  savingType.value = config.data_type
  const previous = config.source
  config.source = source
  try {
    await api.patch(`/data_source_configs/${config.data_type}`, { source })
    toast.success(`${DATA_TYPE_LABELS[config.data_type]} agora vem de ${SOURCE_LABELS[source]}.`)
  } catch (e) {
    config.source = previous
    toast.error(e.response?.data?.errors?.[0] || 'Não foi possível trocar a fonte.')
  } finally {
    savingType.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Fontes de dado</h3>
    <p class="mt-1 text-xs text-slate-500">
      Escolha de onde vem cada tipo de dado. Hoje só idworks e Pagar.me estão disponíveis como fonte.
    </p>

    <div v-if="loading" class="mt-4 text-sm text-slate-400">Carregando...</div>
    <table v-else class="mt-4 w-full text-sm">
      <thead>
        <tr class="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
          <th class="py-2">Tipo de dado</th>
          <th class="py-2">Fonte</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="config in configs" :key="config.data_type">
          <td class="py-2 text-slate-700">{{ DATA_TYPE_LABELS[config.data_type] || config.data_type }}</td>
          <td class="py-2">
            <select
              :value="config.source || ''"
              :disabled="savingType === config.data_type"
              class="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              @change="changeSource(config, $event.target.value)"
            >
              <option value="" disabled>Não configurado</option>
              <option value="idworks">idworks</option>
              <option value="pagarme">Pagar.me</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
