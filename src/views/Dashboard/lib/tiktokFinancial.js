// Rótulos e cores de status financeiro por pedido TikTok — espelha
// Api::V1::DashboardController#tiktok_order_financial_status (backend é a
// única fonte da classificação; aqui só existe o mapeamento pra rótulo/cor).
export const FINANCIAL_STATUS_LABELS = {
  synced: 'Sincronizado',
  pending: 'Pendente',
  refunded: 'Estornado',
  partial: 'Parcial',
  error: 'Com erro',
}

export const FINANCIAL_STATUS_BADGE = {
  synced: { dot: 'bg-emerald-500', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  pending: { dot: 'bg-slate-400', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  refunded: { dot: 'bg-amber-500', classes: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  partial: { dot: 'bg-blue-500', classes: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  error: { dot: 'bg-red-500', classes: 'bg-red-50 text-red-700 ring-red-600/20' },
}

export function financialStatusLabel(status) {
  return FINANCIAL_STATUS_LABELS[status] || status
}

export function financialStatusBadge(status) {
  return FINANCIAL_STATUS_BADGE[status] || FINANCIAL_STATUS_BADGE.pending
}

// Prefixo contábil de uma linha da reconciliação (seção 6 do raio-x):
// "Receita efetiva" abre sem prefixo, subtotais usam "(=)", o resto usa
// "(-)"/"(+)" conforme o sinal do valor agregado que o backend já manda.
export function reconciliationPrefix(row) {
  if (row.key === 'effective_revenue') return ''
  if (row.subtotal) return '(=)'
  return row.amount < 0 ? '(-)' : '(+)'
}
