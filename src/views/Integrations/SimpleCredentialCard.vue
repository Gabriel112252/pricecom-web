<script setup>
import { ref } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useToast } from '@/composables/useToast'
import { formatDateTime } from '@/lib/format'

const props = defineProps({
  title: { type: String, required: true },
  status: { type: String, default: 'pending' }, // pending | active/connected | error
  lastSyncedAt: { type: String, default: null },
  fields: { type: Array, required: true }, // [{ key, label, secret }]
  onConnect: { type: Function, required: true },
  onSync: { type: Function, required: true },
  syncLabel: { type: String, default: 'Sincronizar agora' },
})

const toast = useToast()
const showForm = ref(false)
const connecting = ref(false)
const syncing = ref(false)
const connectError = ref('')
const form = ref(Object.fromEntries(props.fields.map((f) => [f.key, ''])))

const NOT_CONNECTED_STATUSES = ['pending', 'disconnected', 'inactive']
const isConnected = () => !NOT_CONNECTED_STATUSES.includes(props.status)

// Shown inline in the form (persistent, not just a toast that can be
// missed/dismissed) so a rejected credential is unambiguous — e.g. "E-mail
// ou senha inválidos" for idworks, not a generic "erro ao conectar".
async function handleSubmit() {
  connecting.value = true
  connectError.value = ''
  try {
    await props.onConnect({ ...form.value })
    toast.success(`${props.title} conectado com sucesso.`)
    showForm.value = false
  } catch (e) {
    connectError.value = e.response?.data?.errors?.[0] || `Não foi possível conectar ${props.title}.`
    toast.error(connectError.value)
  } finally {
    connecting.value = false
  }
}

async function handleSync() {
  syncing.value = true
  try {
    const result = await props.onSync()
    if (result.success) {
      toast.success(result.summary || 'Sincronização concluída.')
    } else {
      toast.error(result.error_message || 'Falha na sincronização.')
    }
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível sincronizar agora.')
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex items-start justify-between">
      <h3 class="text-sm font-semibold text-slate-900">{{ title }}</h3>
      <StatusBadge :status="status" />
    </div>

    <p class="mt-3 text-xs text-slate-400">
      Última sincronização: {{ lastSyncedAt ? formatDateTime(lastSyncedAt) : 'nunca' }}
    </p>

    <div class="mt-4 flex gap-2">
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        @click="showForm = !showForm; connectError = ''"
      >
        {{ isConnected() ? 'Editar credenciais' : 'Conectar' }}
      </button>
      <button
        type="button"
        :disabled="!isConnected() || syncing"
        title="Conecte antes de sincronizar"
        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        @click="handleSync"
      >
        {{ syncing ? 'Sincronizando...' : syncLabel }}
      </button>
    </div>

    <form v-if="showForm" class="mt-4 space-y-3 border-t border-slate-100 pt-4" @submit.prevent="handleSubmit">
      <p v-if="connectError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {{ connectError }}
      </p>
      <div v-for="field in fields" :key="field.key">
        <label class="text-xs font-medium text-slate-500">{{ field.label }}</label>
        <input
          v-model="form[field.key]"
          :type="field.secret ? 'password' : 'text'"
          required
          autocomplete="off"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          @click="showForm = false"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="connecting"
          class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {{ connecting ? 'Conectando...' : 'Conectar' }}
        </button>
      </div>
    </form>
  </div>
</template>
