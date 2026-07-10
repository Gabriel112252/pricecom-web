<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import api from '@/lib/api'

const props = defineProps({
  modelValue: { type: Array, required: true }, // array of channel ids (strings), empty = all channels
})

const emit = defineEmits(['update:modelValue'])

const channels = ref([])
const open = ref(false)
const root = ref(null)

onMounted(async () => {
  try {
    const { data } = await api.get('/channels')
    channels.value = data
  } catch {
    // filtro fica vazio — não bloqueia o resto do dashboard
  }
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

function handleClickOutside(event) {
  if (root.value && !root.value.contains(event.target)) open.value = false
}

function toggle(id) {
  const idStr = String(id)
  const next = props.modelValue.includes(idStr)
    ? props.modelValue.filter((v) => v !== idStr)
    : [...props.modelValue, idStr]
  emit('update:modelValue', next)
}

function clear() {
  emit('update:modelValue', [])
}

const label = computed(() => {
  if (props.modelValue.length === 0) return 'Todos os canais'
  if (props.modelValue.length === 1) {
    return channels.value.find((c) => String(c.id) === props.modelValue[0])?.name || '1 canal'
  }
  return `${props.modelValue.length} canais`
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition"
      :class="
        modelValue.length > 0
          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
      "
      @click="open = !open"
    >
      {{ label }}
      <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute left-0 z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
    >
      <label
        v-for="channel in channels"
        :key="channel.id"
        class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
      >
        <input
          type="checkbox"
          class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          :checked="modelValue.includes(String(channel.id))"
          @change="toggle(channel.id)"
        />
        {{ channel.name }}
      </label>

      <p v-if="channels.length === 0" class="px-2 py-1.5 text-xs text-slate-400">Nenhum canal conectado.</p>

      <button
        v-if="modelValue.length > 0"
        type="button"
        class="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-indigo-600 hover:bg-indigo-50"
        @click="clear"
      >
        Limpar filtro
      </button>
    </div>
  </div>
</template>
