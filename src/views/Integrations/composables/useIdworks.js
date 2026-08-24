import { ref } from 'vue'
import api from '@/lib/api'

export function useIdworks() {
  const integrations = ref([])

  async function fetchStatus() {
    try {
      const { data } = await api.get('/integrations', { params: { provider: 'idworks' } })
      integrations.value = Array.isArray(data) ? data : []
    } catch {
      integrations.value = []
    }
  }

  async function connect(name, credentials) {
    const { data } = await api.post('/integrations/idworks/connect', { name, credentials })
    await fetchStatus()
    return data
  }

  async function sync(integrationId) {
    const { data } = await api.post('/integrations/idworks/sync', { integration_id: integrationId })
    // Always refresh — a failed sync (e.g. credentials expired mid-flight)
    // flips the selected integration to status "error" server-side, and the
    // corresponding card needs to show that state immediately.
    await fetchStatus()
    return {
      success: data.success,
      error_message: data.error_message,
      summary: `${data.products_received_count ?? 0} produto(s) recebidos, ${data.products_updated_count ?? 0} atualizado(s), ${data.products_ignored_count ?? 0} ignorado(s); ${data.order_freights_updated_count ?? data.orders_synced_count ?? 0} frete(s) atualizado(s).`,
    }
  }

  return { integrations, fetchStatus, connect, sync }
}
