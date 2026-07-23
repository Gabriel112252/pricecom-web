<script setup>
import { computed } from 'vue'
import { formatMoney, formatMoneyOrDash, formatPctOrDash } from '@/lib/format'
import ExecutiveKpiCard from './ExecutiveKpiCard.vue'
import TiktokCoverageBanner from './TiktokCoverageBanner.vue'

const props = defineProps({
  financial: { type: Object, default: () => ({}) },
})

const consolidated = computed(() => props.financial.consolidated || {})
const coverage = computed(() => props.financial.tiktok_coverage || {})
const yampi = computed(() => consolidated.value.yampi || {})
const tiktok = computed(() => consolidated.value.tiktok || {})
</script>

<template>
  <section class="space-y-5">
    <TiktokCoverageBanner :coverage="coverage" />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ExecutiveKpiCard
        label="Receita efetiva"
        :value="formatMoney(consolidated.effective_revenue)"
        tooltip="Yampi: receita líquida (bruta - descontos - reembolsos). TikTok: revenue_amount sincronizado. Somados, sem misturar as fórmulas."
      />
      <ExecutiveKpiCard
        label="Valor recebido/liquidado"
        :value="formatMoney(consolidated.received_amount)"
        tooltip="Yampi: recebíveis Pagar.me com status pago no período. TikTok: settlement_amount dos pedidos sincronizados (liquidação direta pelo marketplace)."
      />
      <ExecutiveKpiCard
        label="Valor previsto a receber"
        :value="formatMoney(consolidated.pending_amount)"
        tooltip="Recebíveis Pagar.me (Yampi) ainda não pagos no período. TikTok não entra aqui: a liquidação já é direta por pedido, sem projeção."
      />
      <ExecutiveKpiCard
        label="Taxas e comissões"
        :value="formatMoney(consolidated.fees_total)"
        tooltip="Yampi: taxa de gateway Pagar.me (MDR + antecipação). TikTok: fee_and_tax_amount sincronizado (comissões, taxas de item/serviço)."
      />
      <ExecutiveKpiCard
        label="Custo dos produtos"
        :value="formatMoney(consolidated.product_cost_total)"
        tooltip="Custo dos itens vendidos (IDWorks), somado para pedidos Yampi e TikTok do período."
      />
      <ExecutiveKpiCard
        label="Lucro real"
        :value="formatMoneyOrDash(consolidated.real_profit)"
        :status="!consolidated.real_profit_available ? 'warning' : 'default'"
        tooltip="Yampi: receita líquida - custo - frete - comissão - imposto - custo operacional - taxa de gateway. TikTok: valor liquidado - custo do produto. Indisponível quando o custo do pedido está incompleto."
      />
      <ExecutiveKpiCard
        label="Margem real"
        :value="formatPctOrDash(consolidated.real_margin_pct)"
        :status="!consolidated.real_profit_available ? 'warning' : 'default'"
        tooltip="Lucro real dividido pela receita efetiva consolidada."
      />
      <ExecutiveKpiCard label="Pedidos" :value="String(consolidated.orders_count ?? 0)" detail="Yampi + TikTok, período filtrado" />
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">Yampi · Pagar.me</h3>
        <dl class="mt-3 space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <dt class="text-slate-500">Receita efetiva</dt>
            <dd class="font-medium text-slate-900">{{ formatMoney(yampi.effective_revenue) }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-slate-500">Recebido</dt>
            <dd class="font-medium text-slate-900">{{ formatMoney(yampi.received_amount) }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-slate-500">Previsto</dt>
            <dd class="font-medium text-slate-900">{{ formatMoney(yampi.pending_amount) }}</dd>
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 pt-2">
            <dt class="text-slate-500">Lucro real</dt>
            <dd class="font-semibold text-slate-900">{{ formatMoneyOrDash(yampi.real_profit) }}</dd>
          </div>
        </dl>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="text-sm font-semibold text-slate-900">TikTok Shop</h3>
        <dl class="mt-3 space-y-2 text-sm">
          <div class="flex items-center justify-between">
            <dt class="text-slate-500">Receita efetiva</dt>
            <dd class="font-medium text-slate-900">{{ formatMoney(tiktok.effective_revenue) }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-slate-500">Liquidado</dt>
            <dd class="font-medium text-slate-900">{{ formatMoney(tiktok.received_amount) }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-slate-500">Cobertura</dt>
            <dd class="font-medium text-slate-900">{{ tiktok.synced_orders_count ?? 0 }} / {{ tiktok.orders_count ?? 0 }} pedidos</dd>
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 pt-2">
            <dt class="text-slate-500">Lucro real</dt>
            <dd class="font-semibold text-slate-900">{{ formatMoneyOrDash(tiktok.real_profit) }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </section>
</template>
