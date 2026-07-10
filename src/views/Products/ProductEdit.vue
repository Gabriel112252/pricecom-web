<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import KitBuilder from './KitBuilder.vue'
import ProductTurnover from './ProductTurnover.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()

const productId = route.params.id
const product = ref(null)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const turnoverRef = ref(null)

const form = ref({ sku: '', name: '', cost_price: 0, active: true })

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get(`/products/${productId}`)
    product.value = data
    form.value = { sku: data.sku, name: data.name, cost_price: Number(data.cost_price), active: data.active }
  } catch {
    errorMessage.value = 'Não foi possível carregar o produto.'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function saveBasicInfo() {
  saving.value = true
  try {
    const { data } = await api.patch(`/products/${productId}`, form.value)
    product.value = data
    toast.success('Produto atualizado.')
  } catch {
    toast.error('Não foi possível salvar o produto.')
  } finally {
    saving.value = false
  }
}

function handleKitSaved() {
  turnoverRef.value?.reload()
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <div>
      <button type="button" class="text-sm text-slate-500 hover:text-slate-700" @click="router.push({ name: 'products' })">
        ← Produtos
      </button>
      <h1 class="mt-1 text-2xl font-semibold text-slate-900">{{ product?.name ?? 'Produto' }}</h1>
    </div>

    <div v-if="loading" class="text-sm text-slate-500">Carregando...</div>
    <div v-else-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <template v-else>
      <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-900">Dados básicos</h3>
          <p v-if="!auth.isAdmin" class="text-xs text-slate-400">Somente leitura — edição restrita a administradores</p>
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-medium text-slate-500">SKU</label>
            <input
              v-model="form.sku"
              type="text"
              :disabled="!auth.isAdmin"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-slate-500">Nome</label>
            <input
              v-model="form.name"
              type="text"
              :disabled="!auth.isAdmin"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-slate-500">Custo</label>
            <input
              v-model.number="form.cost_price"
              type="number"
              step="0.01"
              :disabled="!auth.isAdmin"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm text-slate-700">
              <input v-model="form.active" type="checkbox" :disabled="!auth.isAdmin" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
              Ativo
            </label>
          </div>
        </div>
        <div v-if="auth.isAdmin" class="mt-4 flex justify-end">
          <button
            type="button"
            :disabled="saving"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            @click="saveBasicInfo"
          >
            Salvar
          </button>
        </div>
      </div>

      <KitBuilder :product-id="productId" :editable="auth.isAdmin" @saved="handleKitSaved" />
      <ProductTurnover ref="turnoverRef" :product-id="productId" />
    </template>
  </div>
</template>
