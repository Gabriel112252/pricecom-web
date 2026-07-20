<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import ExecutiveKpiCard from './ExecutiveKpiCard.vue'

const router = useRouter()
const count = ref(null)
const loading = ref(true)

// Conta pending + awaiting_confirmation + insufficient_reserve — os 3
// status que ainda precisam de atenção. "failed" fica de fora de propósito:
// já foi tentado e já tem mensagem de erro visível na tela de Estoque, não
// é a mesma urgência de "ainda não decidimos o que fazer".
async function load() {
  loading.value = true
  try {
    const { data } = await api.get('/stock_alerts', {
      params: { status: [ 'pending', 'awaiting_confirmation', 'insufficient_reserve' ], per_page: 1 },
    })
    count.value = data.meta?.total_count ?? 0
  } catch {
    count.value = null // "—" no lugar de um zero que pode estar errado
  } finally {
    loading.value = false
  }
}

onMounted(load)

function goToStock() {
  router.push({ name: 'inventory' })
}
</script>

<template>
  <ExecutiveKpiCard
    label="Alertas de estoque"
    :value="loading ? '…' : String(count ?? '—')"
    :status="count > 0 ? 'warning' : 'default'"
    detail="em aberto"
    note="Pendentes, aguardando confirmação ou com reserva insuficiente."
    note-action-label="Ver estoque →"
    @note-action="goToStock"
  />
</template>
