<script setup>
import StatusBadge from '@/components/StatusBadge.vue'
import { CONFLICT_TYPE_LABEL } from './lib/auditLabels'
import { formatMoney, formatDateTime } from '@/lib/format'

defineProps({
  conflict: { type: Object, required: true },
})

defineEmits(['view'])
</script>

<template>
  <tr class="hover:bg-slate-50">
    <td class="px-4 py-3">
      <StatusBadge :status="conflict.severity" />
    </td>
    <td class="px-4 py-3">
      <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        {{ CONFLICT_TYPE_LABEL[conflict.conflict_type] ?? conflict.conflict_type }}
      </span>
    </td>
    <td class="px-4 py-3">
      <StatusBadge :status="conflict.status" />
    </td>
    <td class="px-4 py-3 text-slate-700">
      <span v-if="conflict.order_number">Pedido {{ conflict.order_number }}</span>
      <span v-else-if="conflict.product_sku">SKU {{ conflict.product_sku }}</span>
      <span v-else class="text-slate-400">—</span>
    </td>
    <td class="px-4 py-3 text-right font-medium whitespace-nowrap" :class="Number(conflict.difference) < 0 ? 'text-red-600' : 'text-slate-700'">
      {{ formatMoney(conflict.difference) }}
    </td>
    <td class="px-4 py-3 whitespace-nowrap text-slate-500">{{ formatDateTime(conflict.created_at) }}</td>
    <td class="px-4 py-3 text-right">
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        @click="$emit('view', conflict)"
      >
        Ver
      </button>
    </td>
  </tr>
</template>
