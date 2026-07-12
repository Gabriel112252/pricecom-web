import { ref } from 'vue'
import api from '@/lib/api'

export function useIdworks() {
  const integration = ref({ status: 'disconnected', last_synced_at: null })

  // Reuses the generic /integrations index (provider filter) instead of a
  // dedicated status endpoint — idworks is just an Integration record.
  async function fetchStatus() {
    try {
      const { data } = await api.get('/integrations', { params: { provider: 'idworks' } })
      if (data[0]) integration.value = data[0]
    } catch {
      // fica com o status padrão (desconectado) — não bloqueia o resto da tela
    }
  }

  async function connect(credentials) {
    const { data } = await api.post('/integrations/idworks/connect', { credentials })
    integration.value = { ...integration.value, ...data }
    return data
  }

  async function sync() {
    const { data } = await api.post('/integrations/idworks/sync')
    // Always refresh — a failed sync (e.g. credentials expired mid-flight)
    // flips the integration to status "error" server-side, and the card
    // needs to show that regardless of whether this particular sync call
    // itself succeeded or failed.
    await fetchStatus()
    return {
      success: data.success,
      error_message: data.error_message,
      summary: `${data.products_synced_count} produto(s) e ${data.orders_synced_count} pedido(s) sincronizados.`,
    }
  }

  return { integration, fetchStatus, connect, sync }
}
