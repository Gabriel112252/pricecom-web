import { ref } from 'vue'
import api from '@/lib/api'

export function useAuditConflicts() {
  const conflicts = ref([])
  const statusCounts = ref({ open: 0, resolved: 0, ignored: 0 })
  const loading = ref(false)
  const errorMessage = ref('')

  async function fetchConflicts(filters) {
    loading.value = true
    errorMessage.value = ''
    try {
      const { data } = await api.get('/audit_conflicts', { params: filters })
      conflicts.value = data.audit_conflicts
      statusCounts.value = data.status_counts
    } catch {
      errorMessage.value = 'Não foi possível carregar os conflitos.'
    } finally {
      loading.value = false
    }
  }

  async function patchConflict(id, payload) {
    const { data } = await api.patch(`/audit_conflicts/${id}`, payload)
    return data
  }

  return { conflicts, statusCounts, loading, errorMessage, fetchConflicts, patchConflict }
}
