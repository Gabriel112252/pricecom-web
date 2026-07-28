<script setup>
import { computed } from 'vue'
import { formatMoney, formatPct } from '@/lib/format'

const props = defineProps({
  // financial.returns_and_refunds do payload (Dashboard::BuildSummary):
  // { summary: { total_refunded, refunded_pct_of_gross }, top_returned_products: [], top_return_reasons: [] }
  returnsAndRefunds: { type: Object, default: () => ({}) },
})

const summary = computed(() => props.returnsAndRefunds.summary || {})
const totalRefunded = computed(() => Number(summary.value.total_refunded || 0))
const products = computed(() => props.returnsAndRefunds.top_returned_products || [])
const reasons = computed(() => props.returnsAndRefunds.top_return_reasons || [])

// O cron do ReturnRefundSyncService está desativado por ora (ver
// config/schedule.yml) — volume baixo/zero é esperado, não indica card
// quebrado. O estado vazio é tratado explicitamente por isso.
const hasData = computed(() => totalRefunded.value > 0 || products.value.length > 0 || reasons.value.length > 0)
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">Devoluções e reembolsos</h3>
        <p class="mt-0.5 text-xs text-slate-400">Produtos e motivos mais devolvidos no período</p>
      </div>
      <div class="text-right">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total reembolsado</p>
        <p class="text-lg font-bold leading-tight tabular-nums text-slate-900">{{ formatMoney(totalRefunded) }}</p>
        <p v-if="totalRefunded > 0" class="text-xs text-slate-500">
          {{ formatPct(summary.refunded_pct_of_gross) }} da receita bruta
        </p>
      </div>
    </div>

    <div v-if="!hasData" class="mt-5 flex h-24 items-center justify-center text-sm text-slate-400">
      Nenhuma devolução registrada ainda.
    </div>
    <div v-else class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="rounded-lg border border-slate-100 p-3">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Produtos mais devolvidos</h4>
        <p class="mt-0.5 text-xs text-slate-400">Valor rateado igualmente entre os itens do pedido devolvido</p>
        <div v-if="products.length" class="mt-3 max-h-[280px] overflow-y-auto pr-1">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th class="pb-2 pr-3 font-semibold">Produto</th>
                <th class="pb-2 pr-3 text-right font-semibold">Devoluções</th>
                <th class="pb-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in products" :key="row.sku || row.name" class="border-t border-slate-100">
                <td class="max-w-0 py-2 pr-3">
                  <p class="truncate font-medium text-slate-900" :title="row.name">{{ row.name }}</p>
                  <p v-if="row.sku" class="mt-0.5 truncate text-xs text-slate-400">{{ row.sku }}</p>
                </td>
                <td class="py-2 pr-3 text-right align-top tabular-nums text-slate-600">{{ row.refunds_count }}</td>
                <td class="py-2 text-right align-top font-semibold tabular-nums text-slate-900">
                  {{ formatMoney(row.refund_amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="mt-3 flex h-16 items-center justify-center text-sm text-slate-400">
          Nenhum produto devolvido no período.
        </div>
      </div>

      <div class="rounded-lg border border-slate-100 p-3">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Motivos mais comuns</h4>
        <p class="mt-0.5 text-xs text-slate-400">Motivo informado pelo comprador na devolução</p>
        <div v-if="reasons.length" class="mt-3 max-h-[280px] overflow-y-auto pr-1">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th class="pb-2 pr-3 font-semibold">Motivo</th>
                <th class="pb-2 pr-3 text-right font-semibold">Devoluções</th>
                <th class="pb-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in reasons" :key="row.reason" class="border-t border-slate-100">
                <td class="max-w-0 py-2 pr-3">
                  <p class="truncate font-medium text-slate-900" :title="row.reason">{{ row.reason }}</p>
                </td>
                <td class="py-2 pr-3 text-right align-top tabular-nums text-slate-600">{{ row.refunds_count }}</td>
                <td class="py-2 text-right align-top font-semibold tabular-nums text-slate-900">
                  {{ formatMoney(row.refund_amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="mt-3 flex h-16 items-center justify-center text-sm text-slate-400">
          Nenhum motivo registrado no período.
        </div>
      </div>
    </div>
  </div>
</template>
