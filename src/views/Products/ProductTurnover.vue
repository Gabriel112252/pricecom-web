<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api'

const props = defineProps({
  productId: { type: [Number, String], required: true },
})

const loading = ref(true)
const errorMessage = ref('')
const turnover = ref(null)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get(`/products/${props.productId}/turnover`)
    turnover.value = data
  } catch {
    errorMessage.value = 'Não foi possível carregar o giro do produto.'
  } finally {
    loading.value = false
  }
}

defineExpose({ reload: load })

onMounted(load)
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Giro real (últimos 30 dias)</h3>
    <p class="mt-0.5 text-xs text-slate-400">
      Considera unidades vendidas diretamente e unidades consumidas dentro de kits.
    </p>

    <div v-if="loading" class="mt-4 text-sm text-slate-400">Carregando...</div>
    <div v-else-if="errorMessage" class="mt-4 text-sm text-red-600">{{ errorMessage }}</div>

    <template v-else>
      <div class="mt-4 grid grid-cols-3 gap-4">
        <div class="rounded-lg bg-slate-50 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Giro direto</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ turnover.direct_sales_qty }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Giro via kit</p>
          <p class="mt-1 text-2xl font-bold text-slate-900">{{ turnover.kit_sales_qty }}</p>
        </div>
        <div class="rounded-lg bg-indigo-50 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Giro total real</p>
          <p class="mt-1 text-2xl font-bold text-indigo-700">{{ turnover.total_real_qty }}</p>
        </div>
      </div>

      <p
        v-if="Number(turnover.direct_sales_qty) === 0 && Number(turnover.kit_sales_qty) > 0"
        class="mt-3 text-xs font-medium text-amber-600"
      >
        Este produto nunca foi vendido diretamente — só aparece dentro de kits.
      </p>
    </template>
  </div>
</template>
