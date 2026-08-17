<script setup>
// Corte por loja (Hidrabene x Anasol) exclusivo desta aba — não existe um
// campo "loja" em pedido/produto, é derivado de qual Integration idworks
// sincronizou o catálogo (ver Idworks::DashboardStatsService no backend).
const LOJAS = [
  { key: '', label: 'Todas' },
  { key: 'hidrabene', label: 'Hidrabene' },
  { key: 'anasol', label: 'Anasol' },
]

const props = defineProps({
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      v-for="loja in LOJAS"
      :key="loja.key"
      type="button"
      class="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
      :class="
        modelValue === loja.key
          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
      "
      @click="emit('update:modelValue', loja.key)"
    >
      {{ loja.label }}
    </button>
  </div>
</template>
