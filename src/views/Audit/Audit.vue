<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useAuditConflicts } from './composables/useAuditConflicts'
import ConflictTabs from './ConflictTabs.vue'
import ConflictFilters from './ConflictFilters.vue'
import ConflictTable from './ConflictTable.vue'
import ResolveConflictModal from './ResolveConflictModal.vue'

const route = useRoute()
const toast = useToast()
const { conflicts, statusCounts, loading, errorMessage, fetchConflicts, patchConflict } = useAuditConflicts()

const activeStatus = ref('open')
const filters = ref({
  conflict_type: '',
  severity: typeof route.query.severity === 'string' ? route.query.severity : '',
  channel: '',
  q: '',
})

const channels = ref([])
const selectedConflict = ref(null)
const submitting = ref(false)

function buildParams() {
  return {
    status: activeStatus.value,
    conflict_type: filters.value.conflict_type || undefined,
    severity: filters.value.severity || undefined,
    channel: filters.value.channel || undefined,
    q: filters.value.q || undefined,
  }
}

function load() {
  fetchConflicts(buildParams()).then(() => {
    if (errorMessage.value) {
      toast.error(errorMessage.value, { action: { label: 'Tentar novamente', onClick: load } })
    }
  })
}

watch([activeStatus, filters], load, { deep: true, immediate: true })

onMounted(async () => {
  try {
    const { data } = await api.get('/channels')
    channels.value = data
  } catch {
    // filtro de canal só não é populado — não bloqueia o resto da tela
  }
})

function openConflict(conflict) {
  selectedConflict.value = conflict
}

function closeModal() {
  selectedConflict.value = null
}

function applyLocalUpdate(updated) {
  const index = conflicts.value.findIndex((c) => c.id === updated.id)
  const previousStatus = index !== -1 ? conflicts.value[index].status : null

  if (previousStatus && previousStatus !== updated.status) {
    statusCounts.value = {
      ...statusCounts.value,
      [previousStatus]: Math.max(0, (statusCounts.value[previousStatus] ?? 0) - 1),
      [updated.status]: (statusCounts.value[updated.status] ?? 0) + 1,
    }
  }

  if (updated.status === activeStatus.value) {
    if (index !== -1) conflicts.value[index] = updated
  } else if (index !== -1) {
    conflicts.value.splice(index, 1)
  }
}

async function handleAction(status, note) {
  if (!selectedConflict.value) return
  submitting.value = true
  try {
    const updated = await patchConflict(selectedConflict.value.id, { status, notes: note })
    applyLocalUpdate(updated)
    toast.success(status === 'resolved' ? 'Conflito marcado como resolvido.' : 'Conflito ignorado.')
    selectedConflict.value = null
  } catch {
    toast.error('Não foi possível atualizar o conflito.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Auditoria</h1>
      <p class="mt-1 text-sm text-slate-500">Conflitos de custo, NF e repasse detectados automaticamente.</p>
    </div>

    <ConflictTabs :active-status="activeStatus" :counts="statusCounts" @change="activeStatus = $event" />

    <ConflictFilters v-model="filters" :channels="channels" />

    <ConflictTable
      :conflicts="conflicts"
      :loading="loading"
      :active-status="activeStatus"
      @view="openConflict"
    />

    <ResolveConflictModal
      v-if="selectedConflict"
      :conflict="selectedConflict"
      :submitting="submitting"
      @close="closeModal"
      @resolve="(note) => handleAction('resolved', note)"
      @ignore="(note) => handleAction('ignored', note)"
    />
  </div>
</template>
