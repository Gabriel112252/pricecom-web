<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import api from '@/lib/api'

const emit = defineEmits(['close', 'imported'])
const POLL_INTERVAL_MS = 2000

const zipFile = ref(null)
const uploading = ref(false)
const uploadError = ref('')
const bulkImport = ref(null)
let pollTimer = null

function onFileChange(event) {
  zipFile.value = event.target.files[0] || null
  uploadError.value = ''
}

async function startImport() {
  if (!zipFile.value) return

  uploading.value = true
  uploadError.value = ''
  try {
    const payload = new FormData()
    payload.append('file', zipFile.value)
    const { data } = await api.post('/testimonials/bulk_import', payload)
    bulkImport.value = data
    pollStatus()
  } catch (e) {
    uploadError.value = e.response?.data?.error || 'Não foi possível iniciar o import.'
  } finally {
    uploading.value = false
  }
}

function pollStatus() {
  clearTimeout(pollTimer)
  pollTimer = setTimeout(async () => {
    try {
      const { data } = await api.get(`/testimonials/bulk_import/${bulkImport.value.id}`)
      bulkImport.value = data
    } catch {
      // erro pontual de rede: tenta novamente no próximo tick
    }
    if (['done', 'failed'].includes(bulkImport.value?.status)) {
      emit('imported')
    } else {
      pollStatus()
    }
  }, POLL_INTERVAL_MS)
}

onBeforeUnmount(() => clearTimeout(pollTimer))

const isProcessing = computed(() => bulkImport.value && ['pending', 'processing'].includes(bulkImport.value.status))
const isDone = computed(() => bulkImport.value?.status === 'done')
const isFailed = computed(() => bulkImport.value?.status === 'failed')
const wholeImportError = computed(() => isFailed.value && bulkImport.value.errors?.[0]?.error)
const successCount = computed(() => (bulkImport.value?.processed_rows || 0))
const rowErrors = computed(() => (isDone.value ? bulkImport.value.errors || [] : []))
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-900">Importar depoimentos em massa</h2>
        <button type="button" class="shrink-0 text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <div v-if="!bulkImport" class="mt-4 space-y-4">
        <p class="text-sm text-slate-600">
          Envie um <strong>.zip</strong> com um CSV na raiz. Colunas obrigatórias:
          <code>sku, customer_name, rating, quote_text, image_filename</code>.
          <code>image_filename</code> pode ficar vazio quando a avaliação não tiver foto.
        </p>

        <p class="text-xs text-slate-500">
          Colunas opcionais: <code>source_type</code> (ex.: <code>mercadolivre</code>) e
          <code>external_url</code> para manter o link da avaliação original. As imagens presentes devem ficar soltas
          na raiz do ZIP com o nome exato usado em <code>image_filename</code>.
        </p>

        <div>
          <input
            type="file"
            accept=".zip,application/zip"
            class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            @change="onFileChange"
          />
        </div>

        <p class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Todos os depoimentos entram como rascunho. Nada é publicado automaticamente.
        </p>

        <div v-if="uploadError" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {{ uploadError }}
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
            type="button"
            :disabled="!zipFile || uploading"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            @click="startImport"
          >
            {{ uploading ? 'Enviando...' : 'Importar' }}
          </button>
        </div>
      </div>

      <div v-else class="mt-4 space-y-4">
        <div v-if="isProcessing" class="space-y-2">
          <p class="text-sm text-slate-600">Processando...</p>
          <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full bg-indigo-500 transition-all"
              :style="{
                width: bulkImport.total_rows
                  ? `${Math.min(100, (100 * (bulkImport.processed_rows + bulkImport.error_rows)) / bulkImport.total_rows)}%`
                  : '15%',
              }"
            ></div>
          </div>
          <p class="text-xs text-slate-400">
            {{ bulkImport.total_rows ? `${bulkImport.processed_rows + bulkImport.error_rows} de ${bulkImport.total_rows} linhas` : 'Lendo o arquivo...' }}
          </p>
        </div>

        <div v-else-if="isFailed" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Não foi possível processar o arquivo: {{ wholeImportError || 'erro desconhecido.' }}
        </div>

        <div v-else-if="isDone" class="space-y-3">
          <p class="text-sm text-slate-700">
            <span class="font-semibold text-emerald-600">{{ successCount }} importado(s)</span>
            <template v-if="bulkImport.error_rows">
              · <span class="font-semibold text-red-600">{{ bulkImport.error_rows }} com erro</span>
            </template>
            de {{ bulkImport.total_rows }} linha(s).
          </p>

          <div v-if="rowErrors.length" class="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
            <table class="min-w-full text-xs">
              <thead class="bg-slate-50 text-slate-500">
                <tr>
                  <th class="px-2 py-1.5 text-left font-medium">Linha</th>
                  <th class="px-2 py-1.5 text-left font-medium">SKU</th>
                  <th class="px-2 py-1.5 text-left font-medium">Erro</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="err in rowErrors" :key="err.row">
                  <td class="px-2 py-1.5 text-slate-600">{{ err.row }}</td>
                  <td class="px-2 py-1.5 text-slate-600">{{ err.sku || '—' }}</td>
                  <td class="px-2 py-1.5 text-slate-600">{{ err.error }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            @click="emit('close')"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
