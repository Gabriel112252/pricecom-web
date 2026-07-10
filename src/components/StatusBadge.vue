<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: '',
  },
})

const STATUS_MAP = {
  healthy: { label: 'Saudável', dot: 'bg-emerald-500', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  idle: { label: 'Ocioso', dot: 'bg-slate-400', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  error: { label: 'Erro', dot: 'bg-red-500', classes: 'bg-red-50 text-red-700 ring-red-600/20' },
  matched: { label: 'Conciliado', dot: 'bg-emerald-500', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  disputed: { label: 'Divergente', dot: 'bg-amber-500', classes: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  unmatched: { label: 'Não encontrado', dot: 'bg-red-500', classes: 'bg-red-50 text-red-700 ring-red-600/20' },
  // Audit conflict severity
  critical: { label: 'Crítico', dot: 'bg-red-500', classes: 'bg-red-50 text-red-700 ring-red-600/20' },
  high: { label: 'Alto', dot: 'bg-orange-500', classes: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
  medium: { label: 'Médio', dot: 'bg-amber-500', classes: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  low: { label: 'Baixo', dot: 'bg-slate-400', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  // Audit conflict status
  open: { label: 'Aberto', dot: 'bg-blue-500', classes: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  resolved: { label: 'Resolvido', dot: 'bg-emerald-500', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  ignored: { label: 'Ignorado', dot: 'bg-slate-400', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  // Channel credential status
  pending: { label: 'Pendente', dot: 'bg-slate-400', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  active: { label: 'Conectado', dot: 'bg-emerald-500', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  // Integration (idworks) / FinancialSource (Pagar.me) status
  connected: { label: 'Conectado', dot: 'bg-emerald-500', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  disconnected: { label: 'Pendente', dot: 'bg-slate-400', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  inactive: { label: 'Pendente', dot: 'bg-slate-400', classes: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
}

const config = computed(() => STATUS_MAP[props.status] ?? STATUS_MAP.idle)
const text = computed(() => props.label || config.value.label)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset"
    :class="config.classes"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="config.dot"></span>
    {{ text }}
  </span>
</template>
