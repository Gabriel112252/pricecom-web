<script setup>
import { computed } from 'vue'
import { formatCompactMoney, formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  regionalSales: { type: Object, default: () => ({}) },
})

const tiles = [
  { state: 'RR', x: 150, y: 20 },
  { state: 'AP', x: 300, y: 25 },
  { state: 'AM', x: 95, y: 100 },
  { state: 'PA', x: 245, y: 115 },
  { state: 'AC', x: 35, y: 230 },
  { state: 'RO', x: 110, y: 245 },
  { state: 'MT', x: 210, y: 285 },
  { state: 'TO', x: 305, y: 240 },
  { state: 'MA', x: 370, y: 150 },
  { state: 'PI', x: 400, y: 215 },
  { state: 'CE', x: 465, y: 205 },
  { state: 'RN', x: 520, y: 225 },
  { state: 'PB', x: 510, y: 275 },
  { state: 'PE', x: 475, y: 315 },
  { state: 'AL', x: 470, y: 365 },
  { state: 'SE', x: 440, y: 410 },
  { state: 'BA', x: 380, y: 360 },
  { state: 'GO', x: 295, y: 365 },
  { state: 'DF', x: 340, y: 385 },
  { state: 'MS', x: 230, y: 440 },
  { state: 'MG', x: 350, y: 470 },
  { state: 'ES', x: 450, y: 500 },
  { state: 'RJ', x: 410, y: 545 },
  { state: 'SP', x: 315, y: 540 },
  { state: 'PR', x: 305, y: 610 },
  { state: 'SC', x: 315, y: 665 },
  { state: 'RS', x: 280, y: 720 },
]

const byState = computed(() =>
  Object.fromEntries((props.regionalSales.states || []).map((state) => [state.state, state])),
)

const maxOrders = computed(() =>
  Math.max(...(props.regionalSales.states || []).map((state) => Number(state.orders_count || 0)), 0),
)

const topStates = computed(() => props.regionalSales.top_states || [])
const topState = computed(() => props.regionalSales.top_state)

function stateFor(uf) {
  return (
    byState.value[uf] || {
      state: uf,
      name: uf,
      orders_count: 0,
      net_revenue: 0,
      share_percentage: 0,
      tiktok_pending_orders_count: 0,
      financial_coverage_partial: false,
    }
  )
}

function fillFor(uf) {
  const orders = Number(stateFor(uf).orders_count || 0)
  if (!orders || !maxOrders.value) return '#e2e8f0'

  const ratio = orders / maxOrders.value
  if (ratio >= 0.75) return '#2563eb'
  if (ratio >= 0.45) return '#3b82f6'
  if (ratio >= 0.2) return '#60a5fa'
  return '#bfdbfe'
}
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Pedidos por região</h3>
        <p class="mt-0.5 text-xs text-slate-400">Distribuição por UF de entrega</p>
      </div>
      <div v-if="topState" class="text-right text-xs text-slate-500">
        <p class="font-semibold text-slate-900">{{ topState.state }} lidera</p>
        <p>{{ topState.orders_count }} pedidos · {{ formatCompactMoney(topState.net_revenue) }}</p>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
      <svg class="h-[360px] w-full" viewBox="0 0 600 780" role="img" aria-label="Mapa do Brasil por pedidos">
        <g v-for="tile in tiles" :key="tile.state">
          <rect
            :x="tile.x"
            :y="tile.y"
            width="54"
            height="42"
            rx="8"
            :fill="fillFor(tile.state)"
            stroke="#ffffff"
            stroke-width="3"
          >
            <title>
              {{ stateFor(tile.state).name }}: {{ stateFor(tile.state).orders_count }} pedidos · {{ formatMoney(stateFor(tile.state).net_revenue) }}
              <template v-if="stateFor(tile.state).financial_coverage_partial">
                ({{ stateFor(tile.state).tiktok_pending_orders_count }} pedido(s) TikTok ainda sem financeiro — fora do valor)
              </template>
            </title>
          </rect>
          <text
            :x="tile.x + 27"
            :y="tile.y + 26"
            text-anchor="middle"
            class="select-none text-[14px] font-bold"
            :fill="stateFor(tile.state).orders_count ? '#ffffff' : '#64748b'"
          >
            {{ tile.state }}
          </text>
        </g>
      </svg>

      <div class="space-y-3">
        <div v-if="topStates.length === 0" class="flex h-full items-center justify-center text-sm text-slate-400">
          Sem UF registrada no período.
        </div>
        <div v-for="state in topStates.slice(0, 6)" :key="state.state" class="border-b border-slate-100 pb-2 last:border-0">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold text-slate-900">{{ state.state }} · {{ state.name }}</p>
            <p class="text-sm text-slate-600">{{ state.orders_count }}</p>
          </div>
          <div class="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{{ formatMoney(state.net_revenue) }}</span>
            <span>{{ formatPct(state.share_percentage) }}</span>
          </div>
          <p v-if="state.financial_coverage_partial" class="mt-0.5 text-[11px] leading-snug text-amber-700">
            {{ state.tiktok_pending_orders_count }} pedido(s) TikTok pendente(s) de financeiro — fora do valor acima.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
