<script setup>
import { FINANCE_SUBTABS } from './lib/financeTabs'
import FinancialConsolidatedTab from './FinancialConsolidatedTab.vue'
import FinancialReceivablesTab from './FinancialReceivablesTab.vue'
import FinancialTiktokTab from './FinancialTiktokTab.vue'

defineProps({
  financial: { type: Object, default: () => ({}) },
  coupons: { type: Object, default: () => ({}) },
  granularity: { type: String, default: 'day' },
  from: { type: String, required: true },
  to: { type: String, required: true },
  channelIds: { type: Array, default: () => [] },
})

// v-model — Dashboard.vue precisa saber a subtab ativa pra decidir se
// mostra o filtro global de período (a subtab Yampi·Pagar.me tem filtro
// próprio de data de pagamento, com escopo diferente).
const activeSubtab = defineModel('activeSubtab', { default: FINANCE_SUBTABS[0].key })
</script>

<template>
  <section class="space-y-5">
    <div class="relative isolate overflow-hidden border-b border-slate-200">
      <nav class="flex gap-1">
        <button
          v-for="tab in FINANCE_SUBTABS"
          :key="tab.key"
          type="button"
          class="border-b-2 px-4 py-2 text-sm font-medium transition"
          :class="
            activeSubtab === tab.key
              ? 'border-indigo-500 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          "
          @click="activeSubtab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <FinancialConsolidatedTab v-show="activeSubtab === 'consolidated'" :financial="financial" />

    <FinancialReceivablesTab
      v-show="activeSubtab === 'yampi_pagarme'"
      :gateway-fee-avg-per-order="financial.gateway_fee_avg_per_order"
    />

    <FinancialTiktokTab
      v-show="activeSubtab === 'tiktok'"
      :breakdown="financial.tiktok_financial_breakdown"
      :coverage="financial.tiktok_coverage"
      :daily-series="financial.tiktok_daily_series"
      :discount-breakdown="coupons.discount_breakdown_tiktok"
      :granularity="granularity"
      :from="from"
      :to="to"
      :channel-ids="channelIds"
    />
  </section>
</template>
