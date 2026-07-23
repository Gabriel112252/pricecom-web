// Subtabs internas da aba Financeiro do Dashboard. FinancialTab.vue troca
// entre elas do mesmo jeito que Dashboard.vue troca as tabs principais
// (lib/tabs.js) — v-show, sem recarregar dados ao trocar.
export const FINANCE_SUBTABS = [
  { key: 'consolidated', label: 'Consolidado' },
  { key: 'yampi_pagarme', label: 'Yampi · Pagar.me' },
  { key: 'tiktok', label: 'TikTok Shop' },
]
