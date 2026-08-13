<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { formatDateTime } from '@/lib/format'

const props = defineProps({
  // Lista de usuários do tenant, pro filtro "Usuário" — evita uma segunda
  // chamada pra /users só pra popular um <select>.
  users: { type: Array, default: () => [] },
})

const toast = useToast()

const logs = ref([])
const meta = ref({})
const loading = ref(true)
const page = ref(1)
const userIdFilter = ref('')
const actionFilter = ref('')

const ACTION_LABELS = {
  'login.success': 'Login bem-sucedido',
  'login.failed': 'Tentativa de login falhou',
  'user.created': 'Usuário criado',
  'user.updated': 'Usuário atualizado',
  'user.role_changed': 'Papel alterado',
  'user.deactivated': 'Usuário desativado',
  'user.reactivated': 'Usuário reativado',
  'channel_credential.updated': 'Credencial de canal atualizada',
}

function actionLabel(action) {
  return ACTION_LABELS[action] || action
}

async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/user_activity_logs', {
      params: {
        page: page.value,
        user_id: userIdFilter.value || undefined,
        action_type: actionFilter.value || undefined,
      },
    })
    logs.value = data.logs
    meta.value = data.meta
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível carregar o log de atividade.')
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  page.value = 1
  load()
}

function goToPage(newPage) {
  if (newPage < 1 || newPage > (meta.value.total_pages || 1)) return
  page.value = newPage
  load()
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <select
        v-model="userIdFilter"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        @change="onFilterChange"
      >
        <option value="">Todos os usuários</option>
        <option v-for="u in props.users" :key="u.id" :value="u.id">{{ u.name }}</option>
      </select>

      <select
        v-model="actionFilter"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
        @change="onFilterChange"
      >
        <option value="">Todas as ações</option>
        <option v-for="(label, key) in ACTION_LABELS" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <div v-if="loading" class="text-sm text-slate-500">Carregando...</div>
    <div v-else-if="!logs.length" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
      Nenhum registro encontrado.
    </div>
    <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Quando</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Ação</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Quem</th>
            <th class="px-4 py-2 text-left font-medium text-slate-600">Detalhes</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="log in logs" :key="log.id">
            <td class="px-4 py-2 whitespace-nowrap text-slate-500">{{ formatDateTime(log.created_at) }}</td>
            <td class="px-4 py-2 text-slate-700">{{ actionLabel(log.action) }}</td>
            <td class="px-4 py-2 text-slate-600">{{ log.user?.name || 'Sistema' }}</td>
            <td class="px-4 py-2 text-xs text-slate-400">
              <span v-if="Object.keys(log.metadata || {}).length">{{ JSON.stringify(log.metadata) }}</span>
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="meta.total_pages > 1" class="flex items-center justify-between text-sm text-slate-500">
      <span>Página {{ meta.current_page }} de {{ meta.total_pages }} · {{ meta.total_count }} registros</span>
      <div class="flex gap-2">
        <button
          type="button"
          :disabled="meta.current_page <= 1"
          class="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          @click="goToPage(meta.current_page - 1)"
        >
          Anterior
        </button>
        <button
          type="button"
          :disabled="meta.current_page >= meta.total_pages"
          class="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          @click="goToPage(meta.current_page + 1)"
        >
          Próxima
        </button>
      </div>
    </div>
  </div>
</template>
