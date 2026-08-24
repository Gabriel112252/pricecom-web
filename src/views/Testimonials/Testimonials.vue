<script setup>
import { ref, onMounted } from 'vue'
import api, { assetUrl } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import StatusBadge from '@/components/StatusBadge.vue'
import PageHeader from '@/components/PageHeader.vue'
import TestimonialFormModal from './TestimonialFormModal.vue'
import TestimonialBulkImportModal from './TestimonialBulkImportModal.vue'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'draft', label: 'Rascunho' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'published', label: 'Publicado' },
  { value: 'rejected', label: 'Rejeitado' },
]

const SOURCE_TYPE_LABELS = {
  manual: 'Manual',
  tiktok: 'TikTok',
  shopee: 'Shopee',
  mercadolivre: 'Mercado Livre',
}

const SOURCE_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Todas as origens' },
  ...Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

const auth = useAuthStore()
const toast = useToast()

const testimonials = ref([])
const meta = ref({})
const loading = ref(true)
const errorMessage = ref('')
const statusFilter = ref('')
const sourceTypeFilter = ref('')
const integrationFilter = ref('')
const idworksIntegrations = ref([])
const page = ref(1)
const workingId = ref(null)
const editingTestimonial = ref(undefined)
const showBulkImport = ref(false)

function isVideoUrl(url) {
  return /\.(mp4|mov|webm)$/i.test(url || '')
}

function storeLabel(integration) {
  const name = (integration?.name || '').toLowerCase()
  if (name.includes('anasol')) return 'Anasol'
  if (name === 'idworks' || name.includes('hidrabene')) return 'Hidrabene'
  return integration?.name || `IDWorks #${integration?.id}`
}

async function loadStores() {
  try {
    const { data } = await api.get('/integrations', { params: { provider: 'idworks' } })
    idworksIntegrations.value = Array.isArray(data) ? data : []
  } catch {
    idworksIntegrations.value = []
  }
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await api.get('/testimonials', {
      params: {
        status: statusFilter.value || undefined,
        source_type: sourceTypeFilter.value || undefined,
        integration_id: integrationFilter.value || undefined,
        page: page.value,
        per_page: 25,
      },
    })
    testimonials.value = data.testimonials
    meta.value = data.meta || {}
  } catch (e) {
    errorMessage.value = e.response?.data?.error || 'Não foi possível carregar os depoimentos.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStores()
  load()
})

function onFilterChange() {
  page.value = 1
  load()
}

function goToPage(newPage) {
  if (newPage < 1 || newPage > (meta.value.total_pages || 1)) return
  page.value = newPage
  load()
}

function openCreate() {
  editingTestimonial.value = null
}

function openEdit(testimonial) {
  editingTestimonial.value = testimonial
}

function closeModal() {
  editingTestimonial.value = undefined
}

function onSaved() {
  closeModal()
  load()
}

function onBulkImported() {
  load()
}

async function runTransition(testimonial, action) {
  workingId.value = testimonial.id
  try {
    await api.post(`/testimonials/${testimonial.id}/${action}`)
    toast.success('Status atualizado.')
    await load()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível atualizar o status.')
  } finally {
    workingId.value = null
  }
}

async function destroyTestimonial(testimonial) {
  if (!window.confirm(`Remover o depoimento de ${testimonial.customer_name}?`)) return

  workingId.value = testimonial.id
  try {
    await api.delete(`/testimonials/${testimonial.id}`)
    toast.success('Depoimento removido.')
    await load()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível remover o depoimento.')
  } finally {
    workingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader title="Depoimentos" subtitle="Curadoria de depoimentos por loja, produto e origem.">
      <template v-if="auth.isAdmin" #actions>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="showBulkImport = true"
        >
          Importar em massa
        </button>
        <button
          type="button"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          @click="openCreate"
        >
          Novo depoimento
        </button>
      </template>
    </PageHeader>

    <div v-if="!auth.isAdmin" class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
      Criar, editar ou mudar o status de um depoimento exige acesso de administrador — você pode consultar a lista normalmente.
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <select
        v-model="integrationFilter"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        @change="onFilterChange"
      >
        <option value="">Todas as lojas</option>
        <option v-for="integration in idworksIntegrations" :key="integration.id" :value="integration.id">
          {{ storeLabel(integration) }}
        </option>
      </select>

      <select
        v-model="statusFilter"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        @change="onFilterChange"
      >
        <option v-for="opt in STATUS_FILTER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>

      <select
        v-model="sourceTypeFilter"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        @change="onFilterChange"
      >
        <option v-for="opt in SOURCE_TYPE_FILTER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ errorMessage }}
    </div>

    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Mídia</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Cliente</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Produto</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Depoimento</th>
            <th class="px-4 py-2 text-center font-medium text-slate-600">Nota</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Origem</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Status</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading">
            <td colspan="8" class="px-4 py-6 text-center text-slate-400">Carregando...</td>
          </tr>
          <tr v-else-if="testimonials.length === 0">
            <td colspan="8" class="px-4 py-6 text-center text-slate-400">Nenhum depoimento encontrado.</td>
          </tr>
          <template v-else>
            <tr v-for="testimonial in testimonials" :key="testimonial.id">
              <td class="px-4 py-2">
                <a
                  v-if="testimonial.source_type === 'tiktok' && testimonial.tiktok_metadata?.thumbnail_url"
                  :href="testimonial.external_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="relative block h-12 w-12 overflow-hidden rounded-lg bg-slate-100"
                  title="Abrir vídeo original no TikTok"
                >
                  <img :src="testimonial.tiktok_metadata.thumbnail_url" class="h-full w-full object-cover" alt="" />
                  <span class="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 py-0.5 text-[9px] font-semibold text-white">TikTok</span>
                </a>
                <div v-else-if="testimonial.media_url" class="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                  <video v-if="isVideoUrl(testimonial.media_url)" :src="assetUrl(testimonial.media_url)" class="h-full w-full object-cover"></video>
                  <img v-else :src="assetUrl(testimonial.media_url)" class="h-full w-full object-cover" alt="" />
                </div>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-4 py-2 text-slate-800">{{ testimonial.customer_name }}</td>
              <td class="px-4 py-2 text-slate-600">
                <div v-if="testimonial.products?.length" class="flex flex-wrap gap-1">
                  <span
                    v-for="product in testimonial.products"
                    :key="product.id"
                    class="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    :title="`${product.sku} — ${product.name}`"
                  >
                    {{ product.sku }}
                  </span>
                </div>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="max-w-xs truncate px-4 py-2 text-slate-600" :title="testimonial.quote_text">
                {{ testimonial.quote_text || '—' }}
              </td>
              <td class="px-4 py-2 text-center tabular-nums text-slate-700">{{ testimonial.rating ?? '—' }}</td>
              <td class="px-4 py-2 text-slate-600">
                <a
                  v-if="testimonial.external_url"
                  :href="testimonial.external_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-medium text-indigo-600 hover:underline"
                >
                  {{ SOURCE_TYPE_LABELS[testimonial.source_type] || testimonial.source_type }}
                </a>
                <span v-else>{{ SOURCE_TYPE_LABELS[testimonial.source_type] || testimonial.source_type }}</span>
              </td>
              <td class="px-4 py-2"><StatusBadge :status="testimonial.status" /></td>
              <td class="px-4 py-2 text-right">
                <div class="flex justify-end gap-2">
                  <button type="button" class="text-xs font-medium text-slate-500 hover:underline" @click="openEdit(testimonial)">
                    Editar
                  </button>
                  <button
                    v-if="auth.isAdmin && testimonial.status === 'draft'"
                    type="button"
                    :disabled="workingId === testimonial.id"
                    class="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50"
                    @click="runTransition(testimonial, 'approve')"
                  >
                    Aprovar
                  </button>
                  <button
                    v-if="auth.isAdmin && testimonial.status === 'approved'"
                    type="button"
                    :disabled="workingId === testimonial.id"
                    class="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50"
                    @click="runTransition(testimonial, 'publish')"
                  >
                    Publicar
                  </button>
                  <button
                    v-if="auth.isAdmin && ['draft', 'approved'].includes(testimonial.status)"
                    type="button"
                    :disabled="workingId === testimonial.id"
                    class="text-xs font-medium text-amber-600 hover:underline disabled:opacity-50"
                    @click="runTransition(testimonial, 'reject')"
                  >
                    Rejeitar
                  </button>
                  <button
                    v-if="auth.isAdmin"
                    type="button"
                    :disabled="workingId === testimonial.id"
                    class="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    @click="destroyTestimonial(testimonial)"
                  >
                    Remover
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="!errorMessage && testimonials.length" class="flex items-center justify-between text-xs text-slate-500">
      <p>Página {{ meta.current_page || 1 }} de {{ meta.total_pages || 1 }} · {{ meta.total_count || 0 }} depoimentos</p>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="(meta.current_page || 1) <= 1 || loading"
          @click="goToPage((meta.current_page || 1) - 1)"
        >
          Anterior
        </button>
        <button
          type="button"
          class="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="(meta.current_page || 1) >= (meta.total_pages || 1) || loading"
          @click="goToPage((meta.current_page || 1) + 1)"
        >
          Próxima
        </button>
      </div>
    </div>

    <TestimonialFormModal
      v-if="editingTestimonial !== undefined"
      :testimonial="editingTestimonial"
      @close="closeModal"
      @saved="onSaved"
    />

    <TestimonialBulkImportModal
      v-if="showBulkImport"
      @close="showBulkImport = false"
      @imported="onBulkImported"
    />
  </div>
</template>
