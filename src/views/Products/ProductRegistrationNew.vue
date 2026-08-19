<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { assetUrl } from '@/lib/api'
import PageHeader from '@/components/PageHeader.vue'

const CHANNEL_LABELS = {
  shopify: 'Shopify',
  yampi: 'Yampi',
  tiktok: 'TikTok Shop',
  nuvemshop: 'Nuvemshop',
  idworks: 'IDWorks',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

const router = useRouter()
const parentQuery = ref('')
const parentResults = ref([])
const parentLoading = ref(false)
const selectedParent = ref(null)
const selectedChannels = ref([])
const sku = ref('')
const name = ref('')
const price = ref('')
const pendingImages = ref([])
const pendingImagePreviews = ref([])
const registration = ref(null)
const saving = ref(false)
const publishing = ref(false)
const error = ref('')
const success = ref('')

const canSave = computed(() => !!selectedParent.value && !!sku.value.trim() && !!name.value.trim())
const canPublish = computed(() => canSave.value && !publishing.value && !saving.value)

const storedImages = computed(() => registration.value?.images || [])
const publications = computed(() => registration.value?.publications || [])

onMounted(searchParents)
onBeforeUnmount(clearPendingPreviews)

async function searchParents() {
  parentLoading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/products', {
      params: { q: parentQuery.value || undefined, per_page: 30 },
    })
    parentResults.value = data.products || []
  } catch (e) {
    error.value = apiError(e, 'Não foi possível buscar os produtos.')
  } finally {
    parentLoading.value = false
  }
}

function selectParent(product) {
  selectedParent.value = product
  selectedChannels.value = [...new Set(product.channels || [])]
  error.value = ''
  success.value = ''
}

function toggleChannel(channel) {
  if (selectedChannels.value.includes(channel)) {
    selectedChannels.value = selectedChannels.value.filter((item) => item !== channel)
  } else {
    selectedChannels.value = [...selectedChannels.value, channel]
  }
}

function onImagesSelected(event) {
  clearPendingPreviews()
  pendingImages.value = Array.from(event.target.files || [])
  pendingImagePreviews.value = pendingImages.value.map((file) => ({
    file,
    url: URL.createObjectURL(file),
  }))
}

function clearPendingPreviews() {
  pendingImagePreviews.value.forEach((preview) => URL.revokeObjectURL(preview.url))
  pendingImagePreviews.value = []
}

function toCents(value) {
  let normalized = String(value || '').trim().replace(/^R\$\s*/i, '').replace(/\s/g, '')
  if (!normalized) return null

  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  }

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) return undefined
  return Math.round(amount * 100)
}

function registrationPayload() {
  const priceCents = toCents(price.value)
  if (priceCents === undefined) throw new Error('Preço inválido.')

  return {
    parent_product_id: selectedParent.value?.id,
    sku: sku.value.trim(),
    name: name.value.trim(),
    price_cents: priceCents,
    channels: selectedChannels.value,
  }
}

async function saveDraft({ silent = false } = {}) {
  error.value = ''
  success.value = ''

  if (!selectedParent.value) {
    error.value = 'Selecione o produto/variação que será usado como base.'
    return null
  }
  if (!sku.value.trim() || !name.value.trim()) {
    error.value = 'Informe SKU e nome da nova variação.'
    return null
  }

  saving.value = true
  try {
    const payload = registrationPayload()
    const response = registration.value?.id
      ? await api.patch(`/product_registrations/${registration.value.id}`, payload)
      : await api.post('/product_registrations', payload)

    registration.value = response.data
    await uploadPendingImages()

    if (!silent) success.value = 'Rascunho salvo.'
    return registration.value
  } catch (e) {
    error.value = e instanceof Error && !e.response ? e.message : apiError(e, 'Não foi possível salvar o rascunho.')
    return null
  } finally {
    saving.value = false
  }
}

async function uploadPendingImages() {
  if (!registration.value?.id || pendingImages.value.length === 0) return

  const formData = new FormData()
  pendingImages.value.forEach((file) => formData.append('images[]', file))
  const { data } = await api.post(`/product_registrations/${registration.value.id}/images`, formData)
  registration.value = data
  pendingImages.value = []
  clearPendingPreviews()
}

async function removeStoredImage(imageId) {
  if (!registration.value?.id) return

  error.value = ''
  try {
    const { data } = await api.delete(`/product_registrations/${registration.value.id}/images/${imageId}`)
    registration.value = data
  } catch (e) {
    error.value = apiError(e, 'Não foi possível remover a imagem.')
  }
}

async function publish() {
  error.value = ''
  success.value = ''
  publishing.value = true

  try {
    const draft = await saveDraft({ silent: true })
    if (!draft) return

    const { data } = await api.post(`/product_registrations/${draft.id}/publish`)
    registration.value = data
    success.value = 'Produto criado no Pricecom. Os canais selecionados ficaram preparados para publicação.'
  } catch (e) {
    error.value = apiError(e, 'Não foi possível cadastrar o produto.')
  } finally {
    publishing.value = false
  }
}

function apiError(e, fallback) {
  const errors = e?.response?.data?.errors
  if (Array.isArray(errors) && errors.length) return errors.join(' ')
  return e?.response?.data?.error || fallback
}

function channelLabel(channel) {
  return CHANNEL_LABELS[channel] || channel
}

function publicationStatus(publication) {
  if (publication.status === 'published') return 'Publicado'
  if (publication.status === 'waiting_connector') return 'Aguardando conector'
  if (publication.status === 'failed') return 'Falhou'
  if (publication.status === 'publishing') return 'Publicando'
  return 'Preparado'
}

function publicationClass(publication) {
  if (publication.status === 'published') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (publication.status === 'failed') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (publication.status === 'waiting_connector') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader
      title="Cadastrar produto / variação"
      subtitle="Crie uma nova variação a partir de um produto já conhecido pelo Pricecom."
    >
      <template #actions>
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          @click="router.push({ name: 'products' })"
        >
          ← Voltar
        </button>
      </template>
    </PageHeader>

    <div v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ error }}
    </div>
    <div v-if="success" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
      {{ success }}
    </div>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4">
        <div class="text-xs font-semibold uppercase tracking-wide text-indigo-600">1. Produto base</div>
        <h2 class="mt-1 text-lg font-semibold text-slate-900">Qual produto esta variação acompanha?</h2>
        <p class="mt-1 text-sm text-slate-500">Os canais disponíveis e parâmetros internos serão herdados desta referência.</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <input
          v-model="parentQuery"
          type="search"
          class="min-w-72 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          placeholder="Buscar por SKU ou nome..."
          @keyup.enter="searchParents"
        />
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          @click="searchParents"
        >
          Buscar
        </button>
      </div>

      <div class="mt-4 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
        <div v-if="parentLoading" class="p-4 text-sm text-slate-400">Buscando...</div>
        <div v-else-if="parentResults.length === 0" class="p-4 text-sm text-slate-400">Nenhum produto encontrado.</div>
        <button
          v-for="product in parentResults"
          v-else
          :key="product.id"
          type="button"
          class="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
          :class="selectedParent?.id === product.id ? 'bg-indigo-50' : ''"
          @click="selectParent(product)"
        >
          <div class="min-w-0">
            <div class="text-xs font-medium text-slate-500">{{ product.sku }}</div>
            <div class="truncate text-sm font-medium text-slate-800">{{ product.name }}</div>
          </div>
          <div class="flex shrink-0 flex-wrap justify-end gap-1">
            <span
              v-for="item in product.channels"
              :key="item"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {{ channelLabel(item) }}
            </span>
            <span v-if="!product.channels?.length" class="text-xs text-slate-400">Sem canal</span>
          </div>
        </button>
      </div>

      <div v-if="selectedParent" class="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
        <div class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Selecionado</div>
        <div class="mt-1 text-sm font-semibold text-slate-900">{{ selectedParent.sku }} · {{ selectedParent.name }}</div>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4">
        <div class="text-xs font-semibold uppercase tracking-wide text-indigo-600">2. Nova variação</div>
        <h2 class="mt-1 text-lg font-semibold text-slate-900">Dados do novo SKU</h2>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">SKU *</span>
          <input
            v-model="sku"
            type="text"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Ex.: 2030_3und"
          />
        </label>
        <label class="block lg:col-span-2">
          <span class="mb-1 block text-sm font-medium text-slate-700">Nome *</span>
          <input
            v-model="name"
            type="text"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Nome comercial da nova variação"
          />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Preço de venda</span>
          <input
            v-model="price"
            inputmode="decimal"
            type="text"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Ex.: 129,90"
          />
        </label>
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4">
        <div class="text-xs font-semibold uppercase tracking-wide text-indigo-600">3. Destinos</div>
        <h2 class="mt-1 text-lg font-semibold text-slate-900">Onde essa variação deve existir?</h2>
        <p class="mt-1 text-sm text-slate-500">Só aparecem canais em que o produto base já está cadastrado.</p>
      </div>

      <div v-if="selectedParent?.channels?.length" class="flex flex-wrap gap-2">
        <button
          v-for="item in selectedParent.channels"
          :key="item"
          type="button"
          class="rounded-lg border px-3 py-2 text-sm font-medium transition"
          :class="selectedChannels.includes(item)
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'"
          @click="toggleChannel(item)"
        >
          <span class="mr-1">{{ selectedChannels.includes(item) ? '✓' : '+' }}</span>
          {{ channelLabel(item) }}
        </button>
      </div>
      <div v-else class="text-sm text-slate-400">Selecione um produto base com canal cadastrado.</div>
    </section>

    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="mb-4">
        <div class="text-xs font-semibold uppercase tracking-wide text-indigo-600">4. Imagens</div>
        <h2 class="mt-1 text-lg font-semibold text-slate-900">Fotos da nova variação</h2>
        <p class="mt-1 text-sm text-slate-500">Você pode selecionar várias imagens de uma vez.</p>
      </div>

      <label class="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30">
        <input class="hidden" type="file" accept="image/*" multiple @change="onImagesSelected" />
        <div>
          <div class="text-sm font-medium text-slate-700">Selecionar imagens</div>
          <div class="mt-1 text-xs text-slate-400">PNG, JPG, WEBP e demais formatos de imagem aceitos pelo navegador</div>
        </div>
      </label>

      <div v-if="pendingImagePreviews.length || storedImages.length" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div v-for="preview in pendingImagePreviews" :key="preview.url" class="relative overflow-hidden rounded-lg border border-indigo-200 bg-indigo-50">
          <img :src="preview.url" :alt="preview.file.name" class="aspect-square w-full object-cover" />
          <div class="truncate px-2 py-1 text-xs text-slate-600">{{ preview.file.name }}</div>
        </div>

        <div v-for="image in storedImages" :key="image.id" class="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
          <img :src="assetUrl(image.url)" :alt="image.filename" class="aspect-square w-full object-cover" />
          <button
            type="button"
            class="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-rose-600 shadow"
            title="Remover imagem"
            @click="removeStoredImage(image.id)"
          >
            ×
          </button>
          <div class="truncate px-2 py-1 text-xs text-slate-600">{{ image.filename }}</div>
        </div>
      </div>
    </section>

    <section v-if="registration" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Status do cadastro</div>
          <h2 class="mt-1 text-lg font-semibold text-slate-900">Rascunho #{{ registration.id }}</h2>
        </div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{{ registration.status }}</span>
      </div>

      <div v-if="registration.validation_errors?.length" class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div class="text-sm font-semibold text-amber-800">Antes de cadastrar:</div>
        <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-700">
          <li v-for="item in registration.validation_errors" :key="item">{{ item }}</li>
        </ul>
      </div>

      <div v-if="registration.product" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Criado no Pricecom: <strong>{{ registration.product.sku }}</strong> · {{ registration.product.name }}
      </div>

      <div v-if="publications.length" class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="publication in publications"
          :key="publication.id"
          class="rounded-lg border p-3"
          :class="publicationClass(publication)"
        >
          <div class="flex items-center justify-between gap-2">
            <strong class="text-sm">{{ channelLabel(publication.channel) }}</strong>
            <span class="text-xs font-medium">{{ publicationStatus(publication) }}</span>
          </div>
          <p v-if="publication.error_message" class="mt-2 text-xs opacity-80">{{ publication.error_message }}</p>
        </div>
      </div>
    </section>

    <div class="sticky bottom-4 flex flex-wrap justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!canSave || saving || publishing"
        @click="saveDraft()"
      >
        {{ saving ? 'Salvando...' : 'Salvar rascunho' }}
      </button>
      <button
        type="button"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!canPublish"
        @click="publish"
      >
        {{ publishing ? 'Cadastrando...' : 'Cadastrar no Pricecom' }}
      </button>
    </div>
  </div>
</template>
