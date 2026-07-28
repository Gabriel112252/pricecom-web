<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS } from '@/lib/chartTheme'
import { formatDateShort, formatDateTime, formatMoney, formatPct } from '@/lib/format'

// Contagens simples (impressões, page views, pedidos, compradores) — sem
// helper compartilhado pra isso hoje; formatStockQty é especificamente pra
// quantidade de estoque (decimal, trunca casas) e não se aplica aqui.
function formatCount(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

const props = defineProps({
  // financial.tiktok_content_format_breakdown do payload
  // (Dashboard::BuildSummary#build_tiktok_content_format_breakdown).
  breakdown: { type: Object, default: () => ({}) },
})

const available = computed(() => props.breakdown.available === true)
const formats = computed(() => props.breakdown.formats || [])
const funnel = computed(() => props.breakdown.funnel || {})

// O snapshot é uma janela rolante própria (30 dias corridos até a última
// sincronização), não o período selecionado no topo do dashboard — o
// rótulo deixa isso explícito em vez de fingir que é o mesmo período.
const periodLabel = computed(() => {
  if (!props.breakdown.period_start || !props.breakdown.period_end) return ''
  return `${formatDateShort(props.breakdown.period_start)} – ${formatDateShort(props.breakdown.period_end)}`
})

function formatColor(index) {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
}

// Funil ordenado — cada etapa mostra a % de conversão em relação à
// anterior. "Cancelamentos" é o inverso (quanto saiu dos pedidos), por
// isso não entra como uma "conversão" igual às outras três.
const funnelStages = computed(() => {
  const impressions = Number(funnel.value.product_impressions || 0)
  const pageViews = Number(funnel.value.product_page_views || 0)
  const orders = Number(funnel.value.orders || 0)

  return [
    { key: 'impressions', label: 'Impressões de produto', value: impressions, pctOfPrevious: null },
    { key: 'page_views', label: 'Visualizações de página', value: pageViews, pctOfPrevious: impressions > 0 ? (pageViews / impressions) * 100 : null },
    { key: 'orders', label: 'Pedidos', value: orders, pctOfPrevious: pageViews > 0 ? (orders / pageViews) * 100 : null },
  ]
})

const cancellationsRate = computed(() => {
  const orders = Number(funnel.value.orders || 0)
  const cancellations = Number(funnel.value.cancellations_and_returns || 0)
  return orders > 0 ? (cancellations / orders) * 100 : null
})

function stageMaxValue() {
  return Math.max(...funnelStages.value.map((stage) => stage.value), 1)
}
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">TikTok Shop · formato de conteúdo</h3>
        <p class="mt-0.5 text-xs text-slate-400">GMV e funil por LIVE, vídeo e card de produto</p>
      </div>
      <div v-if="available" class="text-right text-xs text-slate-400">
        <p>Janela: {{ periodLabel }}</p>
        <p>Sincronizado em {{ formatDateTime(breakdown.synced_at) }}</p>
      </div>
    </div>

    <div v-if="!available" class="mt-5 flex h-32 items-center justify-center text-center text-sm text-slate-400">
      Nenhum dado de Analytics TikTok sincronizado ainda.
    </div>
    <template v-else>
      <div class="mt-5">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">GMV por formato</h4>
          <span class="text-sm font-semibold tabular-nums text-slate-900">{{ formatMoney(breakdown.gmv_total) }}</span>
        </div>
        <div class="mt-3 space-y-3">
          <div v-for="(row, index) in formats" :key="row.key" class="space-y-1.5">
            <div class="flex items-center justify-between gap-3 text-sm">
              <p class="font-medium text-slate-900">{{ row.label }}</p>
              <div class="text-right">
                <span class="font-semibold tabular-nums text-slate-900">{{ formatMoney(row.gmv) }}</span>
                <span class="ml-2 text-xs tabular-nums text-slate-400">{{ formatPct(row.pct) }}</span>
              </div>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full"
                :style="{ width: `${Math.max(row.pct, 2)}%`, backgroundColor: formatColor(index) }"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 border-t border-slate-100 pt-4">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Funil</h4>
        <p class="mt-0.5 text-xs text-slate-400">Impressões → visualizações de página → pedidos (agregado, sem quebra por formato)</p>
        <div class="mt-3 space-y-2">
          <div v-for="stage in funnelStages" :key="stage.key" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-600">{{ stage.label }}</span>
              <span class="tabular-nums font-medium text-slate-900">
                {{ formatCount(stage.value) }}
                <span v-if="stage.pctOfPrevious !== null" class="ml-1 text-xs text-slate-400">({{ formatPct(stage.pctOfPrevious) }})</span>
              </span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-indigo-500"
                :style="{ width: `${Math.max((stage.value / stageMaxValue()) * 100, 2)}%` }"
              />
            </div>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
          <span class="text-amber-700">Cancelamentos/devoluções</span>
          <span class="font-semibold tabular-nums text-amber-800">
            {{ formatCount(funnel.cancellations_and_returns) }}
            <span v-if="cancellationsRate !== null" class="ml-1 text-xs font-normal">({{ formatPct(cancellationsRate) }} dos pedidos)</span>
          </span>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">Compradores</p>
          <p class="mt-0.5 font-semibold text-slate-900">{{ formatCount(breakdown.buyers) }}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <p class="text-xs text-slate-500">Reembolsado</p>
          <p class="mt-0.5 font-semibold text-slate-900">{{ formatMoney(breakdown.refunds_amount) }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
