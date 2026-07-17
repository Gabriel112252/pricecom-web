export const CONFLICT_TYPE_LABEL = {
  missing_cost: 'Produto sem custo',
  gift_costing_error: 'Brinde com custo errado',
  nf_discount_mismatch: 'Desconto da NF divergente',
  nf_freight_mismatch: 'Frete da NF divergente',
  refund_without_cancellation: 'Reembolso sem cancelamento',
  settlement_amount_mismatch: 'Divergência no repasse',
  missing_settlement: 'Repasse não encontrado',
  fee_rate_mismatch: 'Taxa cobrada divergente',
}

// Plain-language explanation of what triggered each conflict type — shown
// in ResolveConflictModal so "valor esperado R$X / valor real R$Y" isn't
// the only context a non-technical user sees.
export const CONFLICT_TYPE_DESCRIPTION = {
  missing_cost:
    'Este produto foi vendido sem um custo cadastrado, então a margem do pedido não pôde ser calculada corretamente.',
  gift_costing_error:
    'Um item marcado como brinde está sendo contabilizado com custo, o que reduz a margem do pedido indevidamente.',
  nf_discount_mismatch:
    'O valor de desconto informado na Nota Fiscal é diferente do desconto registrado no pedido.',
  nf_freight_mismatch:
    'O valor de frete informado na Nota Fiscal é diferente do frete registrado no pedido.',
  refund_without_cancellation:
    'Existe um reembolso lançado para este pedido, mas o pedido não foi marcado como cancelado.',
  settlement_amount_mismatch:
    'O valor que o canal de vendas repassou para este pedido é diferente do valor líquido esperado (receita bruta menos reembolsos). Pode indicar taxa cobrada a mais, repasse parcial ou erro no relatório importado.',
  missing_settlement:
    'Este pedido já deveria ter sido repassado pelo canal de vendas, mas nenhum lançamento de repasse foi encontrado até agora.',
  fee_rate_mismatch:
    'A taxa que a Pagar.me cobrou nesta transação é diferente da taxa negociada cadastrada em Configurações. Pode indicar renegociação não atualizada no cadastro ou cobrança incorreta da adquirente.',
}

// Least-severe first: matches the order severity chips/bars should render in.
export const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical']

export const SEVERITY_LABEL = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
}

export const STATUS_LABEL = {
  open: 'Aberto',
  resolved: 'Resolvido',
  ignored: 'Ignorado',
}

export const SOURCE_LABEL = {
  auto: 'Automático',
  manual: 'Manual',
}

export const TAB_EMPTY_MESSAGE = {
  open: 'Nenhum conflito aberto 🎉',
  resolved: 'Nenhum conflito resolvido ainda.',
  ignored: 'Nenhum conflito ignorado.',
}
