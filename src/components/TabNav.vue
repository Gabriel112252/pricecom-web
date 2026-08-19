<script setup>
defineProps({
  // tabs: [{ key, label }]
  tabs: { type: Array, required: true },
  modelValue: { type: String, required: true },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="relative isolate overflow-x-auto border-b border-slate-200">
    <nav class="flex min-w-max gap-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition"
        :class="
          modelValue === tab.key
            ? 'border-indigo-500 text-indigo-700'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        "
        @click="$emit('update:modelValue', tab.key)"
      >
        {{ tab.label }}
      </button>
    </nav>
  </div>
</template>
