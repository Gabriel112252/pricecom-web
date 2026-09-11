// Shared between Dashboard.vue (click-to-switch) and TvDashboard.vue
// (auto-rotates through the same list) so both stay in sync.
// Operação ERP vem primeiro: IDWorks/Bling são a fonte operacional principal;
// lojas/canais e análises financeiras continuam disponíveis como contexto.
export const DASHBOARD_TABS = [
  { key: 'reconciliation', label: 'Operação ERP' },
  { key: 'overview', label: 'Visão Geral' },
  { key: 'sales', label: 'Vendas' },
  { key: 'products', label: 'Produtos' },
  { key: 'discounts', label: 'Descontos & Cupons' },
  { key: 'finance', label: 'Financeiro' },
  // Clientes virou módulo próprio na sidebar: a base filtrável, RFM e
  // recompra precisam de espaço e contexto próprios, em vez de mais uma
  // subaba analítica do Dashboard.
  // 'health' (Saúde Operacional) escondida por enquanto — não é definitivo,
  // só descomentar a linha abaixo pra trazer de volta. Componente, rota e
  // lógica de backend continuam intactos, só saiu da lista de tabs.
  // { key: 'health', label: 'Saúde Operacional' },
]
