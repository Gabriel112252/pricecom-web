<script setup>
import { useSidebar } from '@/composables/useSidebar'

defineProps({
  to: { type: Object, required: true },
  label: { type: String, required: true },
  icon: { type: [Object, Function], required: true },
})

const emit = defineEmits(['navigate'])

const { collapsed } = useSidebar()
</script>

<template>
  <RouterLink
    :to="to"
    class="group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
    active-class="bg-indigo-500/15 text-indigo-300"
    @click="emit('navigate')"
  >
    <component :is="icon" class="h-5 w-5 shrink-0" />
    <span v-if="!collapsed" class="truncate">{{ label }}</span>

    <span
      v-if="collapsed"
      class="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
    >
      {{ label }}
    </span>
  </RouterLink>
</template>
