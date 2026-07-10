<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  from: { type: String, required: true },
  to: { type: String, required: true },
})

const emit = defineEmits(['change'])

function toISODate(date) {
  return date.toISOString().slice(0, 10)
}

function daysAgoRange(daysBack) {
  const to = new Date()
  to.setDate(to.getDate() - daysBack)
  const from = new Date(to)
  return { from: toISODate(from), to: toISODate(to) }
}

// "Hoje"/"Ontem" are single-day ranges — they're what trigger the backend's
// hour-granularity path, so they need to exist as presets distinct from the
// 7/30/90-day ranges (which all share the same day-count-based matching).
const PRESETS = [
  { key: 'today', label: 'Hoje', range: () => daysAgoRange(0) },
  { key: 'yesterday', label: 'Ontem', range: () => daysAgoRange(1) },
  { key: '7d', label: 'Últimos 7 dias', range: () => ({ from: daysAgoRange(6).from, to: daysAgoRange(0).to }) },
  { key: '30d', label: 'Últimos 30 dias', range: () => ({ from: daysAgoRange(29).from, to: daysAgoRange(0).to }) },
  { key: '90d', label: 'Últimos 90 dias', range: () => ({ from: daysAgoRange(89).from, to: daysAgoRange(0).to }) },
]

const showCustom = ref(false)
const customFrom = ref(props.from)
const customTo = ref(props.to)

function applyPreset(preset) {
  showCustom.value = false
  emit('change', preset.range())
}

function applyCustom() {
  if (!customFrom.value || !customTo.value) return
  emit('change', { from: customFrom.value, to: customTo.value })
}

const activePresetKey = computed(() => {
  const match = PRESETS.find((p) => {
    const r = p.range()
    return r.from === props.from && r.to === props.to
  })
  return match?.key ?? null
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      v-for="preset in PRESETS"
      :key="preset.key"
      type="button"
      class="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
      :class="
        activePresetKey === preset.key && !showCustom
          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
      "
      @click="applyPreset(preset)"
    >
      {{ preset.label }}
    </button>

    <button
      type="button"
      class="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
      :class="
        showCustom ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
      "
      @click="showCustom = !showCustom"
    >
      Personalizado
    </button>

    <div v-if="showCustom" class="flex items-center gap-2 border-l border-slate-200 pl-3">
      <input v-model="customFrom" type="date" class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700" />
      <span class="text-slate-400">até</span>
      <input v-model="customTo" type="date" class="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700" />
      <button
        type="button"
        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        @click="applyCustom"
      >
        Aplicar
      </button>
    </div>
  </div>
</template>
