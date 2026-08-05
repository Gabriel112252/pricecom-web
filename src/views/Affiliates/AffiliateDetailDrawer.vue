<script setup>
import { onMounted, ref, watch } from 'vue'
import api from '@/lib/api'
import { formatDateTime } from '@/lib/format'
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

const messages = ref([])
const messagesLoading = ref(false)
const messagesErrorMessage = ref('')
const messagesSyncFailed = ref(false)

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

// Sincroniza (Get Message in the Conversation, paginado) e recarrega o
// histórico. Pode demorar mais que o resto do drawer por causa da
// paginação — loading próprio, e uma falha aqui (ex. rate limit) não deve
// derrubar o restante do drawer, só avisar e deixar "Enviar mensagem"
// funcionando normalmente.
async function loadMessages() {
  messagesLoading.value = true
  messagesErrorMessage.value = ''
  try {
    const { data } = await api.get(`/affiliates/creators/${props.creatorId}/messages`)
    messages.value = data.rows || []
    messagesSyncFailed.value = !!data.sync_failed
  } catch (e) {
    messagesErrorMessage.value = e.response?.data?.errors?.[0] || 'Não foi possível carregar o histórico de mensagens.'
  } finally {
    messagesLoading.value = false
  }
}

onMounted(load)
watch(() => props.creatorId, loadMessages, { immediate: true })

async function sendMessage() {
  if (!messageContent.value.trim()) return
  sending.value = true
  try {
    await api.post(`/affiliates/creators/${props.creatorId}/messages`, { content: messageContent.value })
    toast.success('Mensagem enviada.')
    messageContent.value = ''
    emit('sent')
    await Promise.all([ load(), loadMessages() ])
  } catch (e) {
    toast.error(e.response?.data?.errors?.[0] || 'Não foi possível enviar a mensagem.')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex justify-end bg-slate-900/50" @click.self="emit('close')">
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

        <div class="mt-4 border-t border-slate-200 pt-4">
          <p class="text-xs font-medium text-slate-500">Histórico de mensagens</p>

          <div v-if="messagesLoading && messages.length === 0" class="mt-2 text-xs text-slate-400">
            Sincronizando histórico...
          </div>
          <p v-else-if="messagesErrorMessage" class="mt-2 text-xs text-red-600">{{ messagesErrorMessage }}</p>
          <template v-else>
            <p v-if="messagesSyncFailed" class="mt-2 text-xs text-amber-700">
              Não foi possível sincronizar as mensagens mais recentes agora — mostrando o histórico já salvo.
            </p>
            <p v-if="messages.length === 0" class="mt-2 text-xs text-slate-400">Nenhuma mensagem ainda.</p>
            <div v-else class="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
              <div
                v-for="message in messages"
                :key="message.id"
                class="flex"
                :class="message.direction === 'outbound' ? 'justify-end' : 'justify-start'"
              >
                <div class="max-w-[80%]">
                  <div
                    class="rounded-lg px-3 py-2 text-sm"
                    :class="message.direction === 'outbound' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'"
                  >
                    {{ message.content }}
                  </div>
                  <p
                    class="mt-0.5 text-[10px] text-slate-400"
                    :class="message.direction === 'outbound' ? 'text-right' : 'text-left'"
                  >
                    {{ formatDateTime(message.sent_at) }}
                  </p>
                </div>
              </div>
            </div>
          </template>
        </div>

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
