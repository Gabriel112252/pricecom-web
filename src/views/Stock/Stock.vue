<script setup>
import { ref } from 'vue'
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
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Estoque</h1>
      <p class="mt-1 text-sm text-slate-500">
        Saldo por produto e canal, e alertas de reposição. Regras de alerta ficam em Configurações.
      </p>
    </div>

    <div class="relative isolate overflow-hidden border-b border-slate-200">
      <nav class="flex gap-1">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          type="button"
          class="border-b-2 px-4 py-2.5 text-sm font-medium transition"
          :class="
            activeTab === tab.key
              ? 'border-indigo-500 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          "
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <StockBalanceTable v-show="activeTab === 'balance'" />
    <StockAlertsPanel v-show="activeTab === 'alerts'" />
  </div>
</template>
