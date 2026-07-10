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
