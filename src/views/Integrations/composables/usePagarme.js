import { ref } from 'vue'
import api from '@/lib/api'

export function usePagarme() {
  const source = ref({ status: 'inactive', last_synced_at: null })

  // Reuses the generic /financial_sources index (provider filter) instead
  // of a dedicated status endpoint — Pagar.me is just a FinancialSource.
  async function fetchStatus() {
    try {
      const { data } = await api.get('/financial_sources', { params: { provider: 'pagarme' } })
      if (data[0]) source.value = data[0]
    } catch {
      // fica com o status padrão (inativo) — não bloqueia o resto da tela
    }
  }

  async function connect(credentials) {
    const { data } = await api.post('/integrations/pagarme/connect', { credentials })
    source.value = { ...source.value, ...data }
    return data
  }

  async function sync() {
    const { data } = await api.post('/integrations/pagarme/sync')
    await fetchStatus()
    return {
      success: data.success,
      error_message: data.error_message,
      summary: `${data.created_count} transação(ões) importada(s), ${data.updated_count} atualizada(s), ${data.skipped_count} ignorada(s).`,
    }
  }

  return { source, fetchStatus, connect, sync }
}
