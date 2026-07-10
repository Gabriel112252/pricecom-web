<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { formatMoney } from '@/lib/format'

const router = useRouter()
const products = ref([])
const loading = ref(true)
const search = ref('')

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/products', { params: { q: search.value || undefined, per_page: 100 } })
    products.value = data.products
  } finally {
    loading.value = false
  }
}

onMounted(load)

let debounceTimer = null
function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 300)
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Produtos</h1>
      <p class="mt-1 text-sm text-slate-500">Cadastro de produtos, kits e giro real por SKU.</p>
    </div>

    <input
      v-model="search"
      type="text"
      placeholder="Buscar por SKU ou nome..."
      class="w-72 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
      @input="onSearchInput"
    />

    <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-2 text-left font-medium text-slate-600">SKU</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Nome</th>
            <th class="px-4 py-2 text-right font-medium text-slate-600">Custo</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Kit?</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Status</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading">
            <td colspan="6" class="px-4 py-6 text-center text-slate-400">Carregando...</td>
          </tr>
          <tr v-else-if="products.length === 0">
            <td colspan="6" class="px-4 py-6 text-center text-slate-400">Nenhum produto encontrado.</td>
          </tr>
          <template v-else>
            <tr
              v-for="product in products"
              :key="product.id"
              class="cursor-pointer hover:bg-slate-50"
              @click="router.push({ name: 'product-edit', params: { id: product.id } })"
            >
              <td class="px-4 py-2 text-slate-500">{{ product.sku }}</td>
              <td class="px-4 py-2 text-slate-800">{{ product.name }}</td>
              <td class="px-4 py-2 text-right text-slate-700">{{ formatMoney(product.cost_price) }}</td>
              <td class="px-4 py-2">
                <span v-if="product.is_kit" class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  Kit
                </span>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-4 py-2">
                <span :class="product.active ? 'text-emerald-600' : 'text-slate-400'">
                  {{ product.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-4 py-2 text-right text-sm font-medium text-indigo-600">Editar →</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
