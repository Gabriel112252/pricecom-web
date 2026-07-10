<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatMoney } from '@/lib/format'

const props = defineProps({
  conflicts: { type: Object, default: () => ({}) },
})

const router = useRouter()

// Only surfaces when there's something actually worth acting on — this is
// meant to be skimmed in a couple seconds, not a restatement of every metric
// already visible in the Saúde Operacional tab.
const items = computed(() => {
  const list = []
  const valueAtRisk = props.conflicts?.value_at_risk ?? 0
  const oldestDays = props.conflicts?.oldest_open_days ?? 0

  if (valueAtRisk > 0) {
    list.push({
      key: 'value_at_risk',
      text: `${formatMoney(valueAtRisk)} em divergência financeira não resolvida.`,
      severity: 'critical',
    })
  }

  if (oldestDays >= 7) {
    list.push({
      key: 'oldest_conflict',
      text: `Existe um conflito em aberto há ${oldestDays} dias.`,
      severity: oldestDays >= 30 ? 'critical' : 'high',
    })
  }

  return list
})

function goToAudit() {
  router.push({ name: 'audit' })
}
</script>

<template>
  <div
    v-if="items.length > 0"
    class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4"
  >
    <div class="flex flex-1 flex-wrap items-center gap-x-6 gap-y-2">
      <div v-for="item in items" :key="item.key" class="flex items-center gap-2 text-sm">
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :class="item.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'"
        ></span>
        <span class="font-medium text-amber-900">{{ item.text }}</span>
      </div>
    </div>
    <button
      type="button"
      class="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
      @click="goToAudit"
    >
      Ver auditoria
    </button>
  </div>
</template>
