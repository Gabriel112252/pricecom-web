<script setup>
import { ref, watch } from 'vue'
import { CONFLICT_TYPE_LABEL, SEVERITY_LABEL, SEVERITY_ORDER } from './lib/auditLabels'

defineProps({
  channels: { type: Array, default: () => [] },
})

const filters = defineModel({ default: () => ({ conflict_type: '', severity: '', channel: '', q: '' }) })

const CONFLICT_TYPES = Object.keys(CONFLICT_TYPE_LABEL)
const SEVERITIES_DESC = [...SEVERITY_ORDER].reverse()

const searchInput = ref(filters.value.q)
let debounceTimer = null

watch(searchInput, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    filters.value.q = value
  }, 300)
})

const SELECT_CLASS =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <select v-model="filters.conflict_type" :class="SELECT_CLASS">
      <option value="">Todos os tipos</option>
      <option v-for="type in CONFLICT_TYPES" :key="type" :value="type">{{ CONFLICT_TYPE_LABEL[type] }}</option>
    </select>

    <select v-model="filters.severity" :class="SELECT_CLASS">
      <option value="">Todas as severidades</option>
      <option v-for="severity in SEVERITIES_DESC" :key="severity" :value="severity">
        {{ SEVERITY_LABEL[severity] }}
      </option>
    </select>

    <select v-model="filters.channel" :class="SELECT_CLASS">
      <option value="">Todos os canais</option>
      <option v-for="channel in channels" :key="channel.id" :value="channel.id">{{ channel.name }}</option>
    </select>

    <input
      v-model="searchInput"
      type="text"
      placeholder="Buscar por pedido, produto ou nota..."
      class="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
    />
  </div>
</template>
