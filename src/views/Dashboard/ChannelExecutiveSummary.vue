<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS } from '@/lib/chartTheme'
import { formatMoney, formatMoneyOrDash, formatPct } from '@/lib/format'

const props = defineProps({
  channels: { type: Array, default: () => [] },
})

const entries = computed(() =>
  [...props.channels].sort((a, b) => Number(b.net_revenue || 0) - Number(a.net_revenue || 0)),
)

const visibleEntries = computed(() => entries.value.slice(0, 4))
const leader = computed(() => entries.value[0] || null)
const bestTicket = computed(() =>
  [...entries.value]
    .filter((row) => row.average_ticket !== null && row.average_ticket !== undefined)
    .sort((a, b) => Number(b.average_ticket || 0) - Number(a.average_ticket || 0))[0] || null,
)
const bestVolume = computed(() =>
  [...entries.value].sort((a, b) => Number(b.orders_count || 0) - Number(a.orders_count || 0))[0] || null,
)

function formatOrders(value) {
  return Number(value || 0).toLocaleString('pt-BR')
}

function channelColor(index) {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length]
}

function hasAdjustments(row) {
  return Number(row.discounts || 0) > 0 || Number(row.refunds || 0) > 0
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Desempenho por canal</h3>
        <p class="mt-0.5 text-xs text-slate-400">Leitura rápida de participação, volume e qualidade da receita</p>
      </div>
      <span v-if="entries.length" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
        {{ entries.length }} {{ entries.length === 1 ? 'canal ativo' : 'canais ativos' }}
      </span>
    </div>

    <div v-if="entries.length === 0" class="rounded-lg border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400 shadow-sm">
      Sem dados no período.
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Canal líder</p>
          <div class="mt-2 flex items-end justify-between gap-3">
            <p class="truncate text-base font-semibold text-slate-900">{{ leader.channel }}</p>
            <p class="shrink-0 text-lg font-bold text-slate-900">{{ formatPct(leader.share_percentage) }}</p>
          </div>
          <p class="mt-1 text-xs text-slate-500">{{ formatMoney(leader.net_revenue) }} de receita efetiva</p>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Maior ticket médio</p>
          <div class="mt-2 flex items-end justify-between gap-3">
            <p class="truncate text-base font-semibold text-slate-900">{{ bestTicket?.channel || '—' }}</p>
            <p class="shrink-0 text-lg font-bold text-slate-900">{{ formatMoneyOrDash(bestTicket?.average_ticket) }}</p>
          </div>
          <p class="mt-1 text-xs text-slate-500">Canal com maior valor médio por pedido</p>
        </div>

        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Maior volume</p>
          <div class="mt-2 flex items-end justify-between gap-3">
            <p class="truncate text-base font-semibold text-slate-900">{{ bestVolume?.channel || '—' }}</p>
            <p class="shrink-0 text-lg font-bold text-slate-900">{{ formatOrders(bestVolume?.orders_count) }}</p>
          </div>
          <p class="mt-1 text-xs text-slate-500">pedidos no período selecionado</p>
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs font-semibold text-slate-700">Participação na receita</p>
            <p class="mt-0.5 text-[11px] text-slate-400">Distribuição da receita efetiva entre os canais</p>
          </div>
        </div>

        <div class="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            v-for="(row, index) in entries"
            :key="`share-${row.channel}`"
            class="h-full transition-all"
            :style="{ width: `${Math.max(Number(row.share_percentage || 0), 0)}%`, backgroundColor: channelColor(index) }"
          />
        </div>

        <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          <div v-for="(row, index) in entries" :key="`legend-${row.channel}`" class="flex items-center gap-2 text-xs text-slate-600">
            <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: channelColor(index) }" />
            <span class="font-medium text-slate-700">{{ row.channel }}</span>
            <span>{{ formatPct(row.share_percentage) }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="(row, index) in visibleEntries"
          :key="row.channel"
          class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div class="h-1" :style="{ backgroundColor: channelColor(index) }" />
          <div class="p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-slate-900">{{ row.channel }}</p>
                <p class="mt-0.5 text-[11px] text-slate-400">Receita efetiva</p>
              </div>
              <span class="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                {{ formatPct(row.share_percentage) }}
              </span>
            </div>

            <p class="mt-3 text-xl font-bold tracking-tight text-slate-900">{{ formatMoney(row.net_revenue) }}</p>

            <div class="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pedidos</p>
                <p class="mt-1 text-sm font-semibold text-slate-700">{{ formatOrders(row.orders_count) }}</p>
              </div>
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ticket médio</p>
                <p class="mt-1 text-sm font-semibold text-slate-700">{{ formatMoneyOrDash(row.average_ticket) }}</p>
              </div>
            </div>

            <div v-if="hasAdjustments(row)" class="mt-3 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-500">
              <span v-if="Number(row.discounts || 0) > 0">Descontos {{ formatMoney(row.discounts) }}</span>
              <span v-if="Number(row.discounts || 0) > 0 && Number(row.refunds || 0) > 0"> · </span>
              <span v-if="Number(row.refunds || 0) > 0">Estornos {{ formatMoney(row.refunds) }}</span>
            </div>

            <p
              v-if="row.tiktok_coverage_percentage !== null && row.tiktok_coverage_percentage !== undefined && Number(row.tiktok_coverage_percentage) < 100"
              class="mt-3 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-700"
            >
              Financeiro TikTok processado: {{ formatPct(row.tiktok_coverage_percentage) }}
            </p>
          </div>
        </article>
      </div>

      <p v-if="entries.length > visibleEntries.length" class="text-right text-xs text-slate-400">
        Mostrando os 4 maiores canais. O detalhamento completo continua na aba Vendas.
      </p>
    </template>
  </section>
</template>
