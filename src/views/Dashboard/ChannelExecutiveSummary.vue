<script setup>
import { computed } from 'vue'
import { formatMoney, formatMoneyOrDash, formatPct } from '@/lib/format'

const props = defineProps({
  channels: { type: Array, default: () => [] },
})

const entries = computed(() =>
  [...props.channels].sort((a, b) => Number(b.net_revenue || 0) - Number(a.net_revenue || 0)),
)

function formatOrders(value) {
  return Number(value || 0).toLocaleString('pt-BR')
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div class="border-b border-slate-100 px-5 py-4">
      <h3 class="text-sm font-semibold text-slate-900">Desempenho por canal</h3>
      <p class="mt-0.5 text-xs text-slate-400">Receita, volume, ticket médio e participação no período</p>
    </div>

    <div v-if="entries.length === 0" class="px-5 py-10 text-center text-sm text-slate-400">
      Sem dados no período.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-100 text-sm">
        <thead class="bg-slate-50/70 text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-5 py-3 text-left">Canal</th>
            <th class="px-5 py-3 text-right">Receita</th>
            <th class="px-5 py-3 text-right">Pedidos</th>
            <th class="px-5 py-3 text-right">Ticket médio</th>
            <th class="px-5 py-3 text-right">Participação</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in entries" :key="row.channel" class="hover:bg-slate-50/60">
            <td class="px-5 py-4 font-medium text-slate-900">{{ row.channel }}</td>
            <td class="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-900">
              {{ formatMoney(row.net_revenue) }}
            </td>
            <td class="whitespace-nowrap px-5 py-4 text-right text-slate-600">
              {{ formatOrders(row.orders_count) }}
            </td>
            <td class="whitespace-nowrap px-5 py-4 text-right text-slate-600">
              {{ formatMoneyOrDash(row.average_ticket) }}
            </td>
            <td class="whitespace-nowrap px-5 py-4 text-right text-slate-600">
              {{ formatPct(row.share_percentage) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
