<script setup>
import { computed, ref } from 'vue'
import { Star } from '@lucide/vue'
import api, { assetUrl } from '@/lib/api'
import { useToast } from '@/composables/useToast'
import ProductComboBox from '@/components/ProductComboBox.vue'

// testimonial === null -> modo criação; caso contrário edição (reaproveita
// o mesmo form/modal pros dois casos, como pedido).
const props = defineProps({
  testimonial: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])

const toast = useToast()
const isEdit = computed(() => !!props.testimonial)

// Modo só existe na criação — editar um depoimento (manual ou TikTok) usa
// sempre os mesmos campos de curadoria (cliente/produto/nota/texto), sem
// re-buscar o oEmbed nem trocar o tipo de mídia.
const creationMode = ref('manual') // 'manual' | 'tiktok'

const form = ref({
  customer_name: props.testimonial?.customer_name || '',
  rating: props.testimonial?.rating || null,
  quote_text: props.testimonial?.quote_text || '',
})

// Um testimonial pode estar vinculado a vários produtos (ex: mesmo
// depoimento aparecendo nas 3 variações de quantidade de um produto) —
// ProductComboBox continua sendo seleção única (também usado por
// StockAlertRuleModal.vue), então aqui ele só serve pra ADICIONAR um
// produto de cada vez à lista; a seleção múltipla em si é essa lista +
// chips removíveis abaixo.
const selectedProducts = ref([ ...(props.testimonial?.products || []) ])
// Remonta o ProductComboBox a cada adição, limpando o texto buscado — sem
// isso o campo continuaria mostrando o último produto escolhido.
const productPickerKey = ref(0)

function addProduct(product) {
  if (!selectedProducts.value.some((p) => p.id === product.id)) {
    selectedProducts.value.push(product)
  }
  productPickerKey.value++
}

function removeProduct(productId) {
  selectedProducts.value = selectedProducts.value.filter((p) => p.id !== productId)
}

const mediaFile = ref(null)
const mediaPreview = ref(null)
const existingMediaUrl = assetUrl(props.testimonial?.media_url)
const saving = ref(false)
const errorMessage = ref('')

const isVideoFile = (file) => file?.type?.startsWith('video/')
const existingMediaIsVideo = /\.(mp4|mov|webm)$/i.test(props.testimonial?.media_url || '')

function onFileChange(event) {
  const file = event.target.files[0]
  mediaFile.value = file || null
  mediaPreview.value = file ? URL.createObjectURL(file) : null
}

function setRating(value) {
  form.value.rating = form.value.rating === value ? null : value
}

// --- Modo "Colar link do TikTok" ---
const tiktokUrl = ref('')
const tiktokPreview = ref(null)
const tiktokPreviewError = ref('')
const tiktokPreviewLoading = ref(false)

// Trocar a URL invalida o preview anterior — só o preview do link atual
// pode confirmar a criação (ver :disabled do botão Salvar mais abaixo).
function onTiktokUrlInput() {
  tiktokPreview.value = null
  tiktokPreviewError.value = ''
}

async function fetchTiktokPreview() {
  if (!tiktokUrl.value.trim()) return

  tiktokPreviewLoading.value = true
  tiktokPreviewError.value = ''
  tiktokPreview.value = null
  try {
    const { data } = await api.post('/testimonials/tiktok_preview', { url: tiktokUrl.value.trim() })
    tiktokPreview.value = data
  } catch (e) {
    tiktokPreviewError.value = e.response?.data?.error || 'Não foi possível buscar o vídeo.'
  } finally {
    tiktokPreviewLoading.value = false
  }
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = new FormData()
    payload.append('customer_name', form.value.customer_name)
    payload.append('quote_text', form.value.quote_text)
    if (form.value.rating) payload.append('rating', form.value.rating)

    // Sempre manda product_ids[], mesmo vazio (um placeholder em branco) —
    // o backend só sincroniza a lista de produtos quando a chave está
    // presente na request (params.key?), pra não apagar os produtos já
    // vinculados num PUT que só mexe em outro campo. Aqui o form sempre
    // representa o estado completo pretendido, então sempre manda.
    if (selectedProducts.value.length) {
      selectedProducts.value.forEach((p) => payload.append('product_ids[]', p.id))
    } else {
      payload.append('product_ids[]', '')
    }

    if (!isEdit.value && creationMode.value === 'tiktok') {
      payload.append('source_type', 'tiktok')
      payload.append('external_url', tiktokUrl.value.trim())
    } else if (mediaFile.value) {
      payload.append('media', mediaFile.value)
    }

    if (isEdit.value) {
      await api.put(`/testimonials/${props.testimonial.id}`, payload)
      toast.success('Depoimento atualizado.')
    } else {
      await api.post('/testimonials', payload)
      toast.success('Depoimento criado como rascunho.')
    }
    emit('saved')
  } catch (e) {
    errorMessage.value = e.response?.data?.errors?.join(', ') || 'Não foi possível salvar o depoimento.'
  } finally {
    saving.value = false
  }
}

// Na criação via TikTok, só libera Salvar depois do preview confirmar que
// o link é válido — evita criar um depoimento "tiktok" sem metadata (o
// backend também revalida o link na hora de criar, isso é só UX).
const canSave = computed(() => {
  if (isEdit.value || creationMode.value !== 'tiktok') return true
  return !!tiktokPreview.value
})
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-900">{{ isEdit ? 'Editar depoimento' : 'Novo depoimento' }}</h2>
        <button type="button" class="shrink-0 text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <div v-if="!isEdit" class="mt-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-1.5 font-medium transition"
          :class="creationMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="creationMode = 'manual'"
        >
          Upload manual
        </button>
        <button
          type="button"
          class="flex-1 rounded-md px-3 py-1.5 font-medium transition"
          :class="creationMode === 'tiktok' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="creationMode = 'tiktok'"
        >
          Colar link do TikTok
        </button>
      </div>

      <form class="mt-4 space-y-4" @submit.prevent="save">
        <div>
          <label class="block text-sm font-medium text-slate-700">Cliente</label>
          <input
            v-model="form.customer_name"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Nome do cliente"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">Produtos (opcional)</label>
          <div v-if="selectedProducts.length" class="mt-1 flex flex-wrap gap-1.5">
            <span
              v-for="product in selectedProducts"
              :key="product.id"
              class="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-indigo-700"
            >
              {{ product.sku }} — {{ product.name }}
              <button
                type="button"
                class="rounded-full p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600"
                :aria-label="`Remover ${product.name}`"
                @click="removeProduct(product.id)"
              >
                ✕
              </button>
            </span>
          </div>
          <ProductComboBox
            :key="productPickerKey"
            placeholder="Buscar por SKU ou nome pra adicionar..."
            class="mt-1"
            @select="addProduct"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">Nota</label>
          <div class="mt-1 flex items-center gap-1">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="text-amber-400"
              :title="`${n} estrela(s)`"
              @click="setRating(n)"
            >
              <Star class="h-5 w-5" :fill="form.rating >= n ? 'currentColor' : 'none'" />
            </button>
            <button
              v-if="form.rating"
              type="button"
              class="ml-2 text-xs text-slate-400 hover:underline"
              @click="form.rating = null"
            >
              Limpar
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700">Depoimento (opcional)</label>
          <textarea
            v-model="form.quote_text"
            rows="4"
            class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="O que o cliente disse..."
          ></textarea>
        </div>

        <div v-if="isEdit || creationMode === 'manual'">
          <label class="block text-sm font-medium text-slate-700">Foto ou vídeo (opcional)</label>
          <input
            type="file"
            accept="image/*,video/*"
            class="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            @change="onFileChange"
          />

          <div v-if="mediaPreview" class="mt-2">
            <video v-if="isVideoFile(mediaFile)" :src="mediaPreview" controls class="max-h-40 rounded-lg"></video>
            <img v-else :src="mediaPreview" class="max-h-40 rounded-lg object-cover" alt="Pré-visualização" />
          </div>
          <div v-else-if="existingMediaUrl" class="mt-2">
            <video v-if="existingMediaIsVideo" :src="existingMediaUrl" controls class="max-h-40 rounded-lg"></video>
            <img v-else :src="existingMediaUrl" class="max-h-40 rounded-lg object-cover" alt="Mídia atual" />
          </div>
        </div>

        <div v-else>
          <label class="block text-sm font-medium text-slate-700">Link do vídeo no TikTok</label>
          <div class="mt-1 flex gap-2">
            <input
              v-model="tiktokUrl"
              type="url"
              required
              placeholder="https://www.tiktok.com/@usuario/video/..."
              class="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
              @input="onTiktokUrlInput"
            />
            <button
              type="button"
              :disabled="!tiktokUrl.trim() || tiktokPreviewLoading"
              class="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              @click="fetchTiktokPreview"
            >
              {{ tiktokPreviewLoading ? 'Buscando...' : 'Buscar' }}
            </button>
          </div>

          <div v-if="tiktokPreviewError" class="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {{ tiktokPreviewError }}
          </div>

          <div v-else-if="tiktokPreview" class="mt-3 flex gap-3 rounded-lg border border-slate-200 p-3">
            <img
              v-if="tiktokPreview.thumbnail_url"
              :src="tiktokPreview.thumbnail_url"
              class="h-20 w-20 shrink-0 rounded-lg object-cover"
              alt=""
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-800">{{ tiktokPreview.title || 'Vídeo do TikTok' }}</p>
              <p class="text-xs text-slate-500">@{{ tiktokPreview.author_name }}</p>
            </div>
          </div>
        </div>

        <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ errorMessage }}
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="saving || !canSave"
            :title="canSave ? '' : 'Busque o vídeo antes de confirmar'"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
