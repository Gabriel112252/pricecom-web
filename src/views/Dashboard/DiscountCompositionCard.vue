<script setup>
import { computed } from 'vue'
import { formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  coupons: { type: Object, default: () => ({}) },
  // Receita bruta do período (revenue_breakdown.gross_revenue) — denominador
  // do "% da receita bruta" no header.
  grossRevenue: { type: Number, default: 0 },
})

// Cor fixa por categoria (a cor segue a entidade, nunca a posição) —
// paleta categórica do chartTheme, validada para CVD.
const CATEGORIES = [
  { key: 'commercial_discount', label: 'Progressivo/comercial', color: '#3b82f6' },
  { key: 'coupon', label: 'Cupom', color: '#14b8a6' },
  { key: 'shipping_subsidy', label: 'Frete subsidiado', color: '#f59e0b' },
]

const totalDiscount = computed(() => Number(props.coupons.display_discount_total ?? props.coupons.total_discount ?? 0))
// Bancado PELA TikTok — nunca somado ao total de "Descontos" acima (esse é
// só valor bancado pelo vendedor). Mostrado como subtotal separado.
const platformIncentiveTotal = computed(() => Number(props.coupons.platform_incentive_total || 0))

const grossSharePct = computed(() => {
  const gross = Number(props.grossRevenue || 0)
  if (gross <= 0 || totalDiscount.value <= 0) return null
  return (totalDiscount.value / gross) * 100
})

const categoryEntries = computed(() => {
  const byKey = Object.fromEntries((props.coupons.breakdown || []).map((row) => [row.key, row]))
  const entries = CATEGORIES.map((cat) => ({
    ...cat,
    amount: Number(byKey[cat.key]?.amount || 0),
    ordersCount: Number(byKey[cat.key]?.orders_count || 0),
  }))
  const total = entries.reduce((sum, row) => sum + row.amount, 0)
  return entries.map((row) => ({ ...row, pct: total > 0 ? (row.amount / total) * 100 : 0 }))
})

const barSegments = computed(() => categoryEntries.value.filter((row) => row.amount > 0))
const hasDiscountData = computed(() => totalDiscount.value > 0 || barSegments.value.length > 0)

// Blocos por plataforma (discount_breakdown_yampi/tiktok). `available`
// segue o filtro de canal do dashboard: com filtro só-TikTok o painel Yampi
// sai do fluxo (v-if) em vez de sobrar coluna vazia — e vice-versa.
const yampiBlock = computed(() => props.coupons.discount_breakdown_yampi || {})
const tiktokBlock = computed(() => props.coupons.discount_breakdown_tiktok || {})
const showYampi = computed(() => yampiBlock.value.available === true)
const showTiktok = computed(() => tiktokBlock.value.available === true)

// Top cupons Yampi já vêm do backend ordenados por valor de desconto desc e
// limitados a 10 (build_coupons). O tipo do cupom (percentual vs fixo) não
// existe no payload de promocode mapeado da Yampi, por isso não há coluna.
const yampiTopCoupons = computed(() =>
  (yampiBlock.value.top_coupons || []).filter((row) => Number(row.discount_total || 0) > 0),
)
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Descontos e incentivos</h3>
        <p class="mt-0.5 text-xs text-slate-400">Progressivo/comercial, cupom, frete subsidiado e desconto TikTok</p>
      </div>
      <div class="flex gap-5 text-right">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Descontos</p>
          <p class="text-lg font-bold leading-tight tabular-nums text-slate-900">{{ formatMoney(totalDiscount) }}</p>
          <p v-if="grossSharePct !== null" class="text-xs text-slate-500">{{ formatPct(grossSharePct) }} da receita bruta</p>
        </div>
        <div v-if="platformIncentiveTotal > 0" title="Bancado pela TikTok — não é desconto perdido pelo vendedor.">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Incentivos da plataforma</p>
          <p class="text-lg font-bold leading-tight tabular-nums text-emerald-700">{{ formatMoney(platformIncentiveTotal) }}</p>
        </div>
      </div>
    </div>

    <div v-if="!hasDiscountData" class="mt-5 flex h-24 items-center justify-center text-sm text-slate-400">
      Nenhum desconto registrado no período.
    </div>
    <div v-else class="mt-5 space-y-4">
      <!-- Barra 100% empilhada por categoria -->
      <div class="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        <div
          v-for="segment in barSegments"
          :key="segment.key"
          class="h-full rounded-[3px] first:rounded-l-full last:rounded-r-full"
          :style="{ width: `${segment.pct}%`, backgroundColor: segment.color, minWidth: '4px' }"
          :title="`${segment.label} · ${formatMoney(segment.amount)} · ${formatPct(segment.pct)}`"
        />
      </div>

      <!-- Legenda com % de cada categoria -->
      <div class="flex flex-wrap gap-x-5 gap-y-1.5">
        <div v-for="row in categoryEntries" :key="row.key" class="flex items-center gap-1.5 text-xs">
          <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: row.color }" />
          <span class="text-slate-600">{{ row.label }}</span>
          <span class="font-semibold tabular-nums text-slate-900">{{ formatPct(row.pct) }}</span>
          <span class="tabular-nums text-slate-400">{{ formatMoney(row.amount) }}</span>
        </div>
      </div>

      <!-- Cards por canal: cupons identificados (Yampi) e desconto agregado
           (TikTok). Só os canais cobertos pelo filtro entram no fluxo. -->
      <div v-if="showYampi || showTiktok" class="border-t border-slate-100 pt-4">
        <div class="grid grid-cols-1 gap-4" :class="{ 'sm:grid-cols-2': showYampi && showTiktok }">
          <div v-if="showYampi" class="rounded-lg border border-slate-100 p-3">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Cupons Yampi</h4>
            <p class="mt-0.5 text-xs text-slate-400">Ordenados pelo valor total de desconto no período</p>
            <div v-if="yampiTopCoupons.length" class="mt-3 max-h-[280px] overflow-y-auto pr-1">
              <table class="w-full text-sm">
                <thead class="sticky top-0 bg-white">
                  <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th class="pb-2 pr-3 font-semibold">Cupom</th>
                    <th class="pb-2 pr-3 text-right font-semibold">Pedidos</th>
                    <th class="pb-2 text-right font-semibold">Desconto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in yampiTopCoupons" :key="row.code" class="border-t border-slate-100">
                    <td class="max-w-0 py-2 pr-3">
                      <p class="truncate font-medium text-slate-900" :title="row.code">{{ row.code }}</p>
                    </td>
                    <td class="py-2 pr-3 text-right align-top tabular-nums text-slate-600">{{ row.orders_count }}</td>
                    <td class="py-2 text-right align-top font-semibold tabular-nums text-slate-900">
                      {{ formatMoney(row.discount_total) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="mt-3 flex h-16 items-center justify-center text-sm text-slate-400">
              Nenhum cupom no período.
            </div>
          </div>

          <div v-if="showTiktok" class="rounded-lg border border-slate-100 p-3">
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">TikTok Shop</h4>
              <span
                v-if="Number(tiktokBlock.financial_coverage_percentage ?? 100) < 100"
                class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20"
              >
                Dados parciais
              </span>
            </div>
            <dl class="mt-2 space-y-1.5 text-sm">
              <div class="flex items-center justify-between gap-2">
                <dt class="text-slate-500">Desconto do vendedor</dt>
                <dd class="tabular-nums font-medium text-slate-900">{{ formatMoney(tiktokBlock.seller_discount_total) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-slate-500">Subsídio TikTok</dt>
                <dd class="tabular-nums font-medium text-emerald-700">{{ formatMoney(tiktokBlock.platform_subsidy_total) }}</dd>
              </div>
              <div v-if="Number(tiktokBlock.platform_shipping_subsidy_total || 0) > 0" class="flex items-center justify-between gap-2">
                <dt class="text-slate-500">Frete subsidiado pela TikTok</dt>
                <dd class="tabular-nums font-medium text-emerald-700">{{ formatMoney(tiktokBlock.platform_shipping_subsidy_total) }}</dd>
              </div>
              <div v-if="Number(tiktokBlock.seller_shipping_subsidy_total || 0) > 0" class="flex items-center justify-between gap-2">
                <dt class="text-slate-500">Frete subsidiado pelo vendedor</dt>
                <dd class="tabular-nums font-medium text-slate-900">{{ formatMoney(tiktokBlock.seller_shipping_subsidy_total) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5">
                <dt class="text-slate-500">Pago pelo cliente</dt>
                <dd class="tabular-nums font-medium text-slate-900">{{ formatMoney(tiktokBlock.buyer_paid_product_total) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-slate-500">Receita efetiva</dt>
                <dd class="tabular-nums font-medium text-slate-900">{{ formatMoney(tiktokBlock.effective_revenue_total) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-2">
                <dt class="text-slate-500">Cobertura financeira</dt>
                <dd class="tabular-nums font-medium text-slate-900">{{ formatPct(tiktokBlock.financial_coverage_percentage) }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
