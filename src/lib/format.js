export function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))
}

export function formatPct(value, digits = 1) {
  return `${Number(value ?? 0).toFixed(digits)}%`
}

export function formatCompactMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0))
}

export function formatDateShort(isoDate) {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}

// `bucket` is either a plain date ("2026-07-09") when granularity is "day",
// or a full ISO timestamp ("2026-07-09T14:00:00Z") when granularity is "hour"
// — the backend switches shape based on the selected period span.
export function formatBucketLabel(bucket, granularity) {
  if (granularity === 'hour') {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(bucket))
  }
  return formatDateShort(bucket)
}

export function formatDateTime(isoDateTime) {
  if (!isoDateTime) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(isoDateTime))
}

// Backend stock quantities (qty_available, stock_qty, min_threshold, etc.)
// are decimal(12,3) columns, and Rails always serializes BigDecimal with at
// least one decimal place (3000 -> "3000.0"). Trims that to whole numbers
// while still showing up to 3 real decimal places when the value isn't
// integral, without introducing thousands separators.
export function formatStockQty(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  if (Number.isNaN(num)) return null
  return num.toFixed(3).replace(/\.?0+$/, '')
}

// Shared by StockBalanceTable.vue (produto-pai / grupo) and
// StockChannelSkuRow.vue (linha de SKU solo ou filha) — mesmo par
// {difference, divergent} nos dois formatos de linha que a Visão por canal
// devolve (ver StockOverviewController#channel_row_json/#channel_group_row_json).
export function stockDifferenceClass(entry) {
  if (entry?.difference == null) return 'text-slate-300'
  return entry.divergent ? 'text-amber-700' : 'text-slate-700'
}

export function formatStockDifference(value) {
  if (value == null) return '—'
  const formatted = formatStockQty(value)
  if (formatted == null) return '—'
  return Number(value) > 0 ? `+${formatted}` : formatted
}
