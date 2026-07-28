<script setup>
import { computed } from 'vue'
import { CATEGORICAL_COLORS } from '@/lib/chartTheme'
import { formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  // yampi_utm_breakdown do payload (Dashboard::BuildSummary#build_yampi_utm_breakdown).
  breakdown: { type: Object, default: () => ({}) },
})

const available = computed(() => props.breakdown.available === true)
const hasOrders = computed(() => Number(props.breakdown.total_orders || 0) > 0)
const ads = computed(() => props.breakdown.ads || {})
const organic = computed(() => props.breakdown.organic || {})
const topSources = computed(() => props.breakdown.top_sources || [])
const topCampaigns = computed(() => props.breakdown.top_campaigns || [])

const ADS_COLOR = CATEGORICAL_COLORS[0]
const ORGANIC_COLOR = CATEGORICAL_COLORS[3]
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <h3 class="text-sm font-semibold text-slate-900">Yampi · origem do pedido (UTM)</h3>
      <p class="mt-0.5 text-xs text-slate-400">
        Classificação por utm_medium — "Anúncio" quando preenchido, "Orgânico" quando ausente
      </p>
    </div>

    <div v-if="!available" class="mt-5 flex h-24 items-center justify-center text-center text-sm text-slate-400">
      Filtro de canal atual não inclui Yampi.
    </div>
    <div v-else-if="!hasOrders" class="mt-5 flex h-24 items-center justify-center text-center text-sm text-slate-400">
      Nenhum pedido Yampi com UTM registrado no período.
    </div>
    <template v-else>
      <div class="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        <div
          v-if="ads.orders_pct > 0"
          class="h-full rounded-[3px] first:rounded-l-full last:rounded-r-full"
          :style="{ width: `${ads.orders_pct}%`, backgroundColor: ADS_COLOR, minWidth: '4px' }"
          :title="`Anúncio · ${formatPct(ads.orders_pct)}`"
        />
        <div
          v-if="organic.orders_pct > 0"
          class="h-full rounded-[3px] first:rounded-l-full last:rounded-r-full"
          :style="{ width: `${organic.orders_pct}%`, backgroundColor: ORGANIC_COLOR, minWidth: '4px' }"
          :title="`Orgânico · ${formatPct(organic.orders_pct)}`"
        />
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-lg bg-slate-50 p-3">
          <div class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: ADS_COLOR }" />
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Anúncio</p>
          </div>
          <p class="mt-1 text-lg font-bold leading-tight tabular-nums text-slate-900">{{ ads.orders_count ?? 0 }}</p>
          <p class="mt-0.5 text-xs tabular-nums text-slate-500">{{ formatMoney(ads.revenue) }} · {{ formatPct(ads.orders_pct) }} dos pedidos</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3">
          <div class="flex items-center gap-1.5">
            <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: ORGANIC_COLOR }" />
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Orgânico</p>
          </div>
          <p class="mt-1 text-lg font-bold leading-tight tabular-nums text-slate-900">{{ organic.orders_count ?? 0 }}</p>
          <p class="mt-0.5 text-xs tabular-nums text-slate-500">{{ formatMoney(organic.revenue) }} · {{ formatPct(organic.orders_pct) }} dos pedidos</p>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Top origens (utm_source)</h4>
          <div v-if="topSources.length" class="mt-2 max-h-[220px] overflow-y-auto pr-1">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-white">
                <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th class="pb-2 pr-3 font-semibold">Origem</th>
                  <th class="pb-2 pr-3 text-right font-semibold">Pedidos</th>
                  <th class="pb-2 text-right font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in topSources" :key="row.value" class="border-t border-slate-100">
                  <td class="max-w-0 truncate py-2 pr-3 font-medium text-slate-900" :title="row.value">{{ row.value }}</td>
                  <td class="py-2 pr-3 text-right tabular-nums text-slate-600">{{ row.orders_count }}</td>
                  <td class="py-2 text-right font-semibold tabular-nums text-slate-900">{{ formatMoney(row.revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-2 text-xs text-slate-400">Nenhum pedido com utm_source preenchido.</p>
        </div>

        <div>
          <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Top campanhas (utm_campaign)</h4>
          <div v-if="topCampaigns.length" class="mt-2 max-h-[220px] overflow-y-auto pr-1">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-white">
                <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th class="pb-2 pr-3 font-semibold">Campanha</th>
                  <th class="pb-2 pr-3 text-right font-semibold">Pedidos</th>
                  <th class="pb-2 text-right font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in topCampaigns" :key="row.value" class="border-t border-slate-100">
                  <td class="max-w-0 truncate py-2 pr-3 font-medium text-slate-900" :title="row.value">{{ row.value }}</td>
                  <td class="py-2 pr-3 text-right tabular-nums text-slate-600">{{ row.orders_count }}</td>
                  <td class="py-2 text-right font-semibold tabular-nums text-slate-900">{{ formatMoney(row.revenue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="mt-2 text-xs text-slate-400">Nenhum pedido com utm_campaign preenchido.</p>
        </div>
      </div>

      <p class="mt-3 text-[11px] leading-snug text-slate-400">
        Heurística simplificada: qualquer utm_medium preenchido conta como "Anúncio", mesmo quando a origem real é outra
        campanha rastreada (ex.: e-mail marketing também usa UTM) — não distingue 100% anúncio pago de outras campanhas.
      </p>
    </template>
  </div>
</template>
