import { ref } from 'vue'
import api from '@/lib/api'

export function useChannelCredentials() {
  const channels = ref([])
  const loading = ref(false)
  const errorMessage = ref('')

  async function fetchChannels() {
    loading.value = true
    errorMessage.value = ''
    try {
      channels.value = await fetchChannelsSilently()
    } catch {
      errorMessage.value = 'Não foi possível carregar os canais.'
    } finally {
      loading.value = false
    }
  }

  // No `loading` toggle — used to quietly resync one card's state without
  // flashing the whole grid to a loading state.
  async function fetchChannelsSilently() {
    const { data } = await api.get('/integrations/channels')
    return data
  }

  async function connect(channel, credentials) {
    try {
      const { data } = await api.post(`/integrations/${channel}/connect`, { credentials })
      applyChannelUpdate(data)
      return data
    } catch (e) {
      // The connect endpoint only returns an error list on failure, not the
      // credential's new status — but the backend does flip it to "error",
      // so resync from the index or the card would be stuck showing "pending".
      channels.value = await fetchChannelsSilently().catch(() => channels.value)
      throw e
    }
  }

  async function syncNow(channel) {
    const { data } = await api.post(`/integrations/${channel}/sync`)
    applyChannelUpdate(data.channel)
    return data
  }

  async function updateRole(channel, role, stockSourceChannel) {
    const { data } = await api.patch(`/integrations/${channel}/role`, {
      role,
      stock_source_channel: stockSourceChannel || undefined,
    })
    applyChannelUpdate(data)
    return data
  }

  // One-off backfill (not a recurring sync) — the response has no `channel`
  // sub-object to apply directly, but a failed auth attempt can still flip
  // the credential's status server-side, so resync quietly afterwards same
  // as #connect does.
  async function backfillOrders(days) {
    try {
      const { data } = await api.post('/integrations/yampi/backfill_orders', { days })
      return data
    } finally {
      channels.value = await fetchChannelsSilently().catch(() => channels.value)
    }
  }

  function applyChannelUpdate(updated) {
    const index = channels.value.findIndex((c) => c.channel === updated.channel)
    if (index !== -1) channels.value[index] = updated
  }

  return { channels, loading, errorMessage, fetchChannels, connect, syncNow, updateRole, backfillOrders }
}
