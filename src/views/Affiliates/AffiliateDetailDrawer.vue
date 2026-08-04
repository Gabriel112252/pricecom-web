<script setup>
import { onMounted, ref } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'

const props = defineProps({
  creatorId: { type: [Number, String], required: true },
})
const emit = defineEmits(['close', 'sent'])

const toast = useToast()
const loading = ref(false)
const creator = ref(null)
const messageContent = ref('')
const sending = ref(false)

async function load() {
  loading.value = true
  try {
    const { data } = await api.get(`/affiliates/creators/${props.creatorId}`)
    creator.value = data
  } catch (e) {
    toast.error(e.response?.data?.errors?.[0] || 'Não foi possível carregar o criador.')
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function sendMessage() {
  if (!messageContent.value.trim()) return
  sending.value = true
  try {
    await api.post(`/affiliates/creators/${props.creatorId}/messages`, { content: messageContent.value })
    toast.success('Mensagem enviada.')
    messageContent.value = ''
    emit('sent')
    await load()
  } catch (e) {
    toast.error(e.response?.data?.errors?.[0] || 'Não foi possível enviar a mensagem.')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex justify-end bg-slate-900/50" @click.self="emit('close')">
    <div class="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-xl">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900">Detalhe do criador</h2>
        <button type="button" class="text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <div v-if="loading && !creator" class="mt-6 text-sm text-slate-500">Carregando...</div>

      <template v-else-if="creator">
        <div class="mt-4 flex items-center gap-3">
          <img v-if="creator.avatar_url" :src="creator.avatar_url" class="h-12 w-12 rounded-full object-cover" alt="" />
          <div>
            <p class="font-medium text-slate-900">{{ creator.nickname || creator.username }}</p>
            <p class="text-xs text-slate-500">@{{ creator.username }}</p>
          </div>
        </div>

        <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-xs text-slate-500">Status</dt>
            <dd class="font-medium text-slate-900">{{ creator.collaboration_status || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">Produtos na vitrine</dt>
            <dd class="font-medium text-slate-900">{{ creator.showcase_product_count }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">Conteúdo postado</dt>
            <dd class="font-medium text-slate-900">{{ creator.content_product_count }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">Conversa</dt>
            <dd class="font-medium text-slate-900">{{ creator.conversation_id ? 'Iniciada' : 'Nenhuma ainda' }}</dd>
          </div>
        </dl>

        <p class="mt-4 text-xs text-slate-400">
          Histórico de mensagens da conversa ainda não está disponível nesta versão — o endpoint de leitura de
          thread completa não foi confirmado na API de Afiliados.
        </p>

        <div class="mt-6 border-t border-slate-200 pt-4">
          <label class="text-xs font-medium text-slate-500">Enviar mensagem</label>
          <textarea
            v-model="messageContent"
            rows="3"
            class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
            placeholder="Escreva uma mensagem para este criador..."
          />
          <button
            type="button"
            class="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            :disabled="sending || !messageContent.trim()"
            @click="sendMessage"
          >
            {{ sending ? 'Enviando...' : 'Enviar mensagem' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
