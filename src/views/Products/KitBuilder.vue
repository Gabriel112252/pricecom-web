<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  productId: { type: [Number, String], required: true },
  editable: { type: Boolean, default: true },
})

const emit = defineEmits(['saved'])

const toast = useToast()

const isKit = ref(false)
const components = ref([])
const availableProducts = ref([])
const selectedProductId = ref('')
const selectedQuantity = ref(1)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')

async function load() {
  loading.value = true
  try {
    const [{ data: kit }, { data: productsData }] = await Promise.all([
      api.get(`/products/${props.productId}/kit_components`),
      api.get('/products', { params: { per_page: 100 } }),
    ])
    isKit.value = kit.is_kit
    components.value = kit.components
    availableProducts.value = productsData.products.filter((p) => Number(p.id) !== Number(props.productId))
  } finally {
    loading.value = false
  }
}

onMounted(load)

const addableProducts = computed(() =>
  availableProducts.value.filter((p) => !components.value.some((c) => c.component_product_id === p.id)),
)

function addComponent() {
  if (!selectedProductId.value) return
  const product = availableProducts.value.find((p) => p.id === Number(selectedProductId.value))
  if (!product) return

  components.value.push({
    component_product_id: product.id,
    sku: product.sku,
    name: product.name,
    quantity: selectedQuantity.value || 1,
  })
  selectedProductId.value = ''
  selectedQuantity.value = 1
}

function removeComponent(componentProductId) {
  components.value = components.value.filter((c) => c.component_product_id !== componentProductId)
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.post(`/products/${props.productId}/kit_components`, {
      is_kit: isKit.value,
      components: isKit.value
        ? components.value.map((c) => ({ component_product_id: c.component_product_id, quantity: c.quantity }))
        : [],
    })
    isKit.value = data.is_kit
    components.value = data.components
    toast.success('Composição do kit salva.')
    emit('saved', data)
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível salvar a composição do kit.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Composição do kit</h3>
        <p class="mt-0.5 text-xs text-slate-400">
          {{ editable ? 'Defina os produtos reais que compõem este item quando vendido.' : 'Somente leitura — edição restrita a administradores.' }}
        </p>
      </div>
      <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input v-model="isKit" type="checkbox" :disabled="!editable" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
        Este produto é um kit?
      </label>
    </div>

    <div v-if="loading" class="mt-4 text-sm text-slate-400">Carregando...</div>

    <template v-else-if="isKit">
      <div v-if="errorMessage" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ errorMessage }}
      </div>

      <table class="mt-4 w-full text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th class="pb-2">SKU</th>
            <th class="pb-2">Produto</th>
            <th class="pb-2 text-right">Quantidade</th>
            <th class="pb-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="components.length === 0">
            <td colspan="4" class="py-4 text-center text-slate-400">Nenhum componente adicionado ainda.</td>
          </tr>
          <tr v-for="component in components" v-else :key="component.component_product_id">
            <td class="py-2 text-slate-500">{{ component.sku }}</td>
            <td class="py-2 text-slate-800">{{ component.name }}</td>
            <td class="py-2 text-right">
              <input
                v-model.number="component.quantity"
                type="number"
                min="0.001"
                step="0.001"
                :disabled="!editable"
                class="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-50 disabled:text-slate-400"
              />
            </td>
            <td class="py-2 text-right">
              <button
                v-if="editable"
                type="button"
                class="text-xs font-medium text-red-600 hover:underline"
                @click="removeComponent(component.component_product_id)"
              >
                Remover
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="editable" class="mt-4 flex items-end gap-2 border-t border-slate-100 pt-4">
        <div class="flex-1">
          <label class="text-xs font-medium text-slate-500">Adicionar componente</label>
          <select v-model="selectedProductId" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option value="">Selecione um produto...</option>
            <option v-for="product in addableProducts" :key="product.id" :value="product.id">
              {{ product.sku }} — {{ product.name }}
            </option>
          </select>
        </div>
        <div class="w-24">
          <label class="text-xs font-medium text-slate-500">Qtd.</label>
          <input
            v-model.number="selectedQuantity"
            type="number"
            min="0.001"
            step="0.001"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="addComponent"
        >
          Adicionar
        </button>
      </div>
    </template>

    <div v-if="editable" class="mt-5 flex justify-end">
      <button
        type="button"
        :disabled="saving || loading"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        @click="save"
      >
        {{ saving ? 'Salvando...' : 'Salvar composição' }}
      </button>
    </div>
  </div>
</template>
