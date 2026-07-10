// Fixed hue order preserves CVD-safety — never reorder or cycle per-chart.
export const CATEGORICAL_COLORS = [
  '#3b82f6', // blue
  '#14b8a6', // teal (aqua)
  '#f59e0b', // amber (yellow)
  '#16a34a', // green
  '#8b5cf6', // violet
  '#ef4444', // red
  '#ec4899', // pink (magenta)
  '#f97316', // orange
]

export const SEQUENTIAL_BLUE = '#3b82f6'

// Status colors are reserved — never reused for a categorical series.
export const SEVERITY_COLOR = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#dc2626',
}

export const SEVERITY_LABEL = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
}

export const CHART_INK = {
  primary: '#0f172a',
  secondary: '#475569',
  muted: '#94a3b8',
  grid: '#e2e8f0',
}

export const CHART_TEXT_STYLE = {
  color: CHART_INK.secondary,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  fontSize: 12,
}

// outerBoundsMode/outerBoundsContain replace the deprecated containLabel
// (echarts 6 warns if containLabel is used without the legacy shim installed).
export const CHART_GRID = {
  left: 8,
  right: 16,
  top: 36,
  bottom: 8,
  outerBoundsMode: 'same',
  outerBoundsContain: 'axisLabel',
}
