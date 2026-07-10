<script setup>
import { STATUS_LABEL } from './lib/auditLabels'

defineProps({
  activeStatus: { type: String, required: true },
  counts: { type: Object, default: () => ({ open: 0, resolved: 0, ignored: 0 }) },
})

const emit = defineEmits(['change'])

const TABS = ['open', 'resolved', 'ignored']
</script>

<template>
  <div class="flex gap-1 border-b border-slate-200">
    <button
      v-for="tab in TABS"
      :key="tab"
      type="button"
      class="flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition"
      :class="
        activeStatus === tab
          ? 'border-indigo-500 text-indigo-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      "
      @click="emit('change', tab)"
    >
      {{ STATUS_LABEL[tab] }}
      <span
        class="rounded-full px-1.5 py-0.5 text-xs font-semibold"
        :class="activeStatus === tab ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'"
      >
        {{ counts[tab] ?? 0 }}
      </span>
    </button>
  </div>
</template>
