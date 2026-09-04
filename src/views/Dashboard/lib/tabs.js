// Shared between Dashboard.vue (click-to-switch) and TvDashboard.vue
// (auto-rotates through the same list) so both stay in sync.
export const DASHBOARD_TABS = [
  { key: 'overview', label: 'Visão Geral' },
  { key: 'sales', label: 'Vendas' },
  { key: 'discounts', label: 'Descontos & Cupons' },
  { key: 'products', label: 'Produtos' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'reconciliation', label: 'ERPs · IDWorks + Bling' },
  // Clientes virou módulo próprio na sidebar: a base filtrável, RFM e
  // recompra precisam de espaço e contexto próprios, em vez de mais uma
  // subaba analítica do Dashboard.
  // 'health' (Saúde Operacional) escondida por enquanto — não é definitivo,
  // só descomentar a linha abaixo pra trazer de volta. Componente, rota e
  // lógica de backend continuam intactos, só saiu da lista de tabs.
  // { key: 'health', label: 'Saúde Operacional' },
]
