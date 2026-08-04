<script setup>
import { ref, watch } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'

const emit = defineEmits(['close', 'created'])
const toast = useToast()

const name = ref('')
const statusFilter = ref('NORMAL')
const messageTemplate = ref('')
const step = ref('form') // form | confirm
const recipientsPreview = ref(null)
const previewLoading = ref(false)
const submitting = ref(false)

async function loadPreview() {
  previewLoading.value = true
  try {
    const { data } = await api.get('/affiliates/creators', {
      params: { collaboration_status: statusFilter.value || undefined, per_page: 1 },
    })
    recipientsPreview.value = data.meta?.total_count ?? 0
  } catch {
    recipientsPreview.value = null
  } finally {
    previewLoading.value = false
  }
}

watch(statusFilter, loadPreview, { immediate: true })

function goToConfirm() {
  if (!name.value.trim() || !messageTemplate.value.trim()) {
    toast.error('Preencha nome e mensagem antes de continuar.')
    return
  }
  step.value = 'confirm'
}

async function submit() {
  submitting.value = true
  try {
    await api.post('/affiliate_campaigns', {
      name: name.value,
      message_template: messageTemplate.value,
      segment_filter: statusFilter.value ? { collaboration_status: statusFilter.value } : {},
    })
    toast.success('Campanha criada — o disparo começou em segundo plano.')
    emit('created')
  } catch (e) {
    toast.error(e.response?.data?.errors?.[0] || 'Não foi possível criar a campanha.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">Nova campanha</h2>
        <button type="button" class="text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <template v-if="step === 'form'">
        <div class="mt-4 space-y-3">
          <div>
            <label class="text-xs font-medium text-slate-500">Nome da campanha</label>
            <input v-model="name" type="text" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </div>
          <div>
            <label class="text-xs font-medium text-slate-500">Segmento — status da colaboração</label>
            <select v-model="statusFilter" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm">
              <option value="">Todos</option>
              <option value="NORMAL">Ativo</option>
              <option value="PAUSED">Pausado</option>
            </select>
            <p class="mt-1 text-xs text-slate-400">
              <span v-if="previewLoading">calculando destinatários...</span>
              <span v-else-if="recipientsPreview !== null">{{ recipientsPreview }} criador(es) recebem esta campanha</span>
            </p>
          </div>
          <div>
            <label class="text-xs font-medium text-slate-500">Mensagem</label>
            <textarea v-model="messageTemplate" rows="4" class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" @click="emit('close')">
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            @click="goToConfirm"
          >
            Revisar
          </button>
        </div>
      </template>

      <template v-else>
        <div class="mt-4 space-y-2 text-sm">
          <p><span class="font-medium text-slate-900">{{ name }}</span></p>
          <p class="text-slate-600">{{ recipientsPreview ?? '?' }} criador(es) vão receber esta mensagem:</p>
          <p class="rounded-lg bg-slate-50 p-3 text-slate-700">{{ messageTemplate }}</p>
          <p class="text-xs text-amber-700">
            O disparo começa em segundo plano assim que você confirmar e envia mensagens reais para criadores.
          </p>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100" @click="step = 'form'">
            Voltar
          </button>
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="submitting"
            @click="submit"
          >
            {{ submitting ? 'Disparando...' : 'Confirmar disparo' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
