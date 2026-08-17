<script setup>
import { computed } from 'vue'
import { formatStockQty, formatMoneyOrDash } from '@/lib/format'

// [{ sku, name, total_qty, direct_qty, kit_qty,
//    channel_breakdown: [{ channel, direct_qty, kit_qty, quantity, revenue }] }]
// — mesmo dado de Idworks::DashboardStatsService#real_skus_sold, já
// ordenado (produto por total_qty desc, canal por quantity desc dentro de
// cada produto) — este componente só achata em linhas, não reordena nada.
const props = defineProps({
  products: { type: Array, default: () => [] },
})

// Uma linha por (produto, canal), já com avulso x em kit x receita
// aproximada na mesma linha — pedido explícito do Gabriel pra ter as duas
// dimensões (canal e avulso/kit) visíveis ao mesmo tempo, sem tooltip.
// Produto sem canal identificado (idworks_sales_channel nulo em todos os
// pedidos que o venderam) ainda aparece como 1 linha "Não identificado"
// em vez de sumir — usa o total do produto já que não há breakdown.
const rows = computed(() =>
  props.products.flatMap((product) => {
    const breakdown = product.channel_breakdown?.length
      ? product.channel_breakdown
      : [{ channel: 'Não identificado', direct_qty: product.direct_qty, kit_qty: product.kit_qty, quantity: product.total_qty, revenue: null }]

    return breakdown.map((entry, index) => ({
      sku: product.sku,
      name: product.name,
      channel: entry.channel,
      directQty: entry.direct_qty,
      kitQty: entry.kit_qty,
      quantity: entry.quantity,
      revenue: entry.revenue,
      firstOfGroup: index === 0,
    }))
  }),
)
</script>

<template>
  <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">SKUs reais vendidos por canal</h3>
    <p class="mt-0.5 text-xs text-slate-400">
      Kit explodido nos componentes reais — quantidade avulsa x em kit e receita aproximada por canal de venda
    </p>

    <div v-if="rows.length === 0" class="empty-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <div v-else class="mt-3 overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th class="pb-2 pr-2">SKU</th>
            <th class="pb-2 pr-2">Produto</th>
            <th class="pb-2 pr-2">Canal</th>
            <th class="pb-2 pr-2 text-right">Avulso</th>
            <th class="pb-2 pr-2 text-right">Em kit</th>
            <th class="pb-2 pr-2 text-right">Total</th>
            <th class="pb-2 text-right">Receita aproximada</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr
            v-for="(row, index) in rows"
            :key="`${row.sku}-${row.channel}-${index}`"
            :class="row.firstOfGroup ? 'border-t-2 border-slate-200' : ''"
          >
            <td class="py-2 pr-2 text-slate-500">{{ row.sku }}</td>
            <td class="py-2 pr-2 text-slate-800">{{ row.name }}</td>
            <td class="py-2 pr-2 text-slate-600">{{ row.channel }}</td>
            <td class="py-2 pr-2 text-right tabular-nums text-slate-500">{{ formatStockQty(row.directQty) }}</td>
            <td class="py-2 pr-2 text-right tabular-nums text-slate-500">{{ formatStockQty(row.kitQty) }}</td>
            <td class="py-2 pr-2 text-right font-medium tabular-nums text-slate-900">{{ formatStockQty(row.quantity) }}</td>
            <td class="py-2 text-right tabular-nums text-slate-900">{{ formatMoneyOrDash(row.revenue) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.empty-frame {
  height: 160px;
}
</style>
