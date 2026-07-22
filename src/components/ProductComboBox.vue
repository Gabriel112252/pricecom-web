<script setup>
import { ref, watch } from 'vue'
import api from '@/lib/api'

// Mesmo padrão de busca do campo "Buscar por SKU ou nome..." da tela de
// Estoque (StockBalanceTable.vue): input com debounce de 300ms, filtra via
// `q` (ILIKE sku/name) no backend — aqui contra /products em vez de
// /stock_overview, já que o combobox precisa de produtos em geral, não só
// os com saldo de estoque.
const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  // Produto já conhecido (edição) — evita uma busca só pra mostrar o texto
  // inicial do campo.
  initialProduct: { type: Object, default: null },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Buscar por SKU ou nome...' },
})
const emit = defineEmits(['update:modelValue', 'select'])

const query = ref(props.initialProduct ? labelFor(props.initialProduct) : '')
const results = ref([])
const isOpen = ref(false)
const loading = ref(false)

function labelFor(product) {
  return `${product.sku} — ${product.name}`
}

watch(
  () => props.initialProduct,
  (product) => {
    query.value = product ? labelFor(product) : ''
  },
)

let debounceTimer = null
function onInput() {
  // Digitar de novo invalida a seleção anterior — só uma busca nova conta
  // como escolha válida a partir daqui.
  emit('update:modelValue', '')

  clearTimeout(debounceTimer)
  const term = query.value.trim()
  if (term.length < 2) {
    results.value = []
    isOpen.value = false
    return
  }
  debounceTimer = setTimeout(search, 300)
}

async function search() {
  loading.value = true
  try {
    const { data } = await api.get('/products', { params: { q: query.value.trim(), per_page: 20 } })
    results.value = data.products
    isOpen.value = true
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

function selectProduct(product) {
  query.value = labelFor(product)
  results.value = []
  isOpen.value = false
  emit('update:modelValue', product.id)
  emit('select', product)
}

function onFocus() {
  if (results.value.length) isOpen.value = true
}

function onBlur() {
  // Atraso pra deixar o @mousedown.prevent do item de resultado (abaixo)
  // rodar antes do dropdown fechar — sem isso o blur fecha a lista antes
  // do clique no item ser registrado.
  setTimeout(() => {
    isOpen.value = false
  }, 150)
}
</script>

<template>
  <div class="relative">
    <input
      v-model="query"
      type="text"
      :disabled="disabled"
      :placeholder="placeholder"
      class="w-full rounded-lg border border-slate-300 p-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <div
      v-if="isOpen && (results.length || loading)"
      class="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
    >
      <div v-if="loading" class="px-3 py-2 text-sm text-slate-400">Buscando...</div>
      <template v-else>
        <button
          v-for="product in results"
          :key="product.id"
          type="button"
          class="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50"
          @mousedown.prevent="selectProduct(product)"
        >
          <span class="text-slate-500">{{ product.sku }}</span>
          <span class="text-slate-800"> — {{ product.name }}</span>
        </button>
      </template>
    </div>
  </div>
</template>
