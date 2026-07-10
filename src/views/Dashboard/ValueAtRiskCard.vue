<script setup>
import { useRouter } from 'vue-router'
import { formatMoney } from '@/lib/format'

defineProps({
  valueAtRisk: { type: Number, default: 0 },
})

const router = useRouter()

function goToAudit() {
  router.push({ name: 'audit' })
}
</script>

<template>
  <button
    type="button"
    class="w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    @click="goToAudit"
  >
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor em risco</p>
    <p class="mt-2 text-3xl font-bold" :class="valueAtRisk > 0 ? 'text-red-600' : 'text-slate-900'">
      {{ formatMoney(valueAtRisk) }}
    </p>
    <p class="mt-1 text-xs text-slate-400">Em divergência financeira não resolvida · clique para ver na Auditoria</p>
  </button>
</template>
