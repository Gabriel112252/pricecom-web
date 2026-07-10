<script setup>
import { useRouter } from 'vue-router'

defineProps({
  oldestOpenDays: { type: Number, default: 0 },
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
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Conflito mais antigo</p>
    <p class="mt-2 text-3xl font-bold" :class="oldestOpenDays >= 7 ? 'text-amber-600' : 'text-slate-900'">
      {{ oldestOpenDays }} {{ oldestOpenDays === 1 ? 'dia' : 'dias' }}
    </p>
    <p class="mt-1 text-xs text-slate-400">Em aberto · clique para ver na Auditoria</p>
  </button>
</template>
