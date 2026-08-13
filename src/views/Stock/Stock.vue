<script setup>
import { ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import TabNav from '@/components/TabNav.vue'
import StockBalanceTable from './StockBalanceTable.vue'
import StockAlertsPanel from './StockAlertsPanel.vue'

const TABS = [
  { key: 'balance', label: 'Saldo por canal' },
  { key: 'alerts', label: 'Alertas' },
]

const activeTab = ref(TABS[0].key)
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <PageHeader
      title="Estoque"
      subtitle="Saldo por produto e canal, e alertas de reposição. Regras de alerta ficam em Configurações."
    />

    <TabNav :tabs="TABS" v-model="activeTab" />

    <StockBalanceTable v-show="activeTab === 'balance'" />
    <StockAlertsPanel v-show="activeTab === 'alerts'" />
  </div>
</template>
