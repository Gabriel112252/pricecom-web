<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatDateTime } from '@/lib/format'
import PageHeader from '@/components/PageHeader.vue'
import TabNav from '@/components/TabNav.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import UserFormModal from './UserFormModal.vue'
import ActivityLogTab from './ActivityLogTab.vue'

const auth = useAuthStore()
const toast = useToast()

const TABS = [
  { key: 'users', label: 'Usuários' },
  { key: 'activity', label: 'Atividade' },
]
const activeTab = ref('users')

const ROLE_LABEL = { admin: 'Administrador', operador: 'Operador' }

const users = ref([])
const loading = ref(true)
const submitting = ref(false)
const showModal = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const { data } = await api.get('/users')
    users.value = data
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível carregar os usuários.')
  } finally {
    loading.value = false
  }
}

function openNewUser() {
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveUser(payload) {
  submitting.value = true
  try {
    await api.post('/users', payload)
    toast.success(payload.invite ? 'Convite enviado.' : 'Usuário cadastrado.')
    closeModal()
    await loadUsers()
  } catch (e) {
    const errors = e.response?.data?.errors
    toast.error(errors ? errors.join(', ') : 'Não foi possível criar o usuário.')
  } finally {
    submitting.value = false
  }
}

async function changeRole(user, role) {
  if (role === user.role) return
  try {
    await api.patch(`/users/${user.id}`, { role })
    toast.success(`Papel de ${user.name} alterado para ${ROLE_LABEL[role]}.`)
    await loadUsers()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível alterar o papel.')
    await loadUsers() // desfaz a seleção otimista do <select> em caso de erro
  }
}

async function toggleActive(user) {
  const activating = !user.active
  const verb = activating ? 'reativar' : 'desativar'
  if (!window.confirm(`Tem certeza que quer ${verb} ${user.name}?`)) return

  try {
    if (activating) {
      await api.patch(`/users/${user.id}`, { active: true })
    } else {
      await api.delete(`/users/${user.id}`)
    }
    toast.success(activating ? 'Usuário reativado.' : 'Usuário desativado.')
    await loadUsers()
  } catch (e) {
    toast.error(e.response?.data?.error || `Não foi possível ${verb} o usuário.`)
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader title="Usuários" subtitle="Gerencie quem tem acesso ao Pricecom e o que cada pessoa pode fazer.">
      <template v-if="activeTab === 'users'" #actions>
        <button
          type="button"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          @click="openNewUser"
        >
          Novo usuário
        </button>
      </template>
    </PageHeader>

    <TabNav :tabs="TABS" v-model="activeTab" />

    <section v-show="activeTab === 'users'" class="space-y-4">
      <div v-if="loading" class="text-sm text-slate-500">Carregando...</div>
      <div v-else-if="!users.length" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        Nenhum usuário cadastrado ainda.
      </div>
      <div v-else class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-2 text-left font-medium text-slate-600">Nome</th>
              <th class="px-4 py-2 text-left font-medium text-slate-600">E-mail</th>
              <th class="px-4 py-2 text-left font-medium text-slate-600">Papel</th>
              <th class="px-4 py-2 text-left font-medium text-slate-600">Status</th>
              <th class="px-4 py-2 text-left font-medium text-slate-600">Criado em</th>
              <th class="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="user in users" :key="user.id">
              <td class="px-4 py-2 font-medium text-slate-900">{{ user.name }}</td>
              <td class="px-4 py-2 text-slate-600">{{ user.email }}</td>
              <td class="px-4 py-2">
                <select
                  :value="user.role"
                  :disabled="user.id === auth.user?.id"
                  :title="user.id === auth.user?.id ? 'Você não pode alterar seu próprio papel por aqui' : ''"
                  class="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  @change="changeRole(user, $event.target.value)"
                >
                  <option v-for="(label, value) in ROLE_LABEL" :key="value" :value="value">{{ label }}</option>
                </select>
              </td>
              <td class="px-4 py-2">
                <StatusBadge v-if="user.invitation_pending" status="invitation_pending" />
                <StatusBadge v-else :status="user.active ? 'user_active' : 'user_inactive'" />
              </td>
              <td class="px-4 py-2 whitespace-nowrap text-slate-500">{{ formatDateTime(user.created_at) }}</td>
              <td class="px-4 py-2 text-right">
                <button
                  type="button"
                  :disabled="user.id === auth.user?.id && user.active"
                  :title="user.id === auth.user?.id && user.active ? 'Você não pode desativar sua própria conta' : ''"
                  class="text-xs font-medium hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                  :class="user.active ? 'text-red-600' : 'text-emerald-600'"
                  @click="toggleActive(user)"
                >
                  {{ user.active ? 'Desativar' : 'Reativar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- v-if, não v-show: as ações que geram log (criar/desativar/reativar
         usuário) acontecem enquanto esta seção está desmontada — v-show
         deixaria o log preso no snapshot de quando a página abriu, sem
         nunca recarregar ao voltar pra esta aba. -->
    <section v-if="activeTab === 'activity'">
      <ActivityLogTab :users="users" />
    </section>

    <UserFormModal v-if="showModal" :submitting="submitting" @close="closeModal" @save="saveUser" />
  </div>
</template>
