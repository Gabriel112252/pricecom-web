<script setup>
defineProps({
  products: { type: Array, default: () => [] },
})

function formatQty(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 class="text-sm font-semibold text-slate-900">Giro real de produtos</h3>
    <p class="mt-0.5 text-xs text-slate-400">
      Quantidade real vendida no período, incluindo componentes consumidos dentro de kits
    </p>

    <div v-if="products.length === 0" class="empty-frame flex items-center justify-center text-sm text-slate-400">
      Sem dados no período.
    </div>
    <table v-else class="mt-3 w-full text-sm">
      <thead>
        <tr class="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <th class="pb-2 pr-2">SKU</th>
          <th class="pb-2 pr-2">Produto</th>
          <th class="pb-2 pr-2 text-right">Venda direta</th>
          <th class="pb-2 pr-2 text-right">Via kit</th>
          <th class="pb-2 text-right">Total real</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="product in products" :key="product.sku">
          <td class="py-2 pr-2 text-slate-500">{{ product.sku }}</td>
          <td class="py-2 pr-2 text-slate-800">
            {{ product.name }}
            <span
              v-if="product.kit_only"
              class="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700"
            >
              Só via kit
            </span>
          </td>
          <td class="py-2 pr-2 text-right tabular-nums text-slate-600">{{ formatQty(product.direct_qty) }}</td>
          <td class="py-2 pr-2 text-right tabular-nums text-slate-600">{{ formatQty(product.kit_qty) }}</td>
          <td class="py-2 text-right font-medium tabular-nums text-slate-900">{{ formatQty(product.total_qty) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.empty-frame {
  height: 160px;
}
</style>
