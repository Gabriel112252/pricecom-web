<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg"
      :class="
        toast.type === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : toast.type === 'info'
            ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      "
    >
      <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
      <button
        v-if="toast.action"
        type="button"
        class="shrink-0 text-sm font-semibold underline underline-offset-2"
        @click="
          () => {
            toast.action.onClick()
            dismiss(toast.id)
          }
        "
      >
        {{ toast.action.label }}
      </button>
      <button type="button" class="shrink-0 text-sm text-current opacity-60 hover:opacity-100" @click="dismiss(toast.id)">
        ✕
      </button>
    </div>
  </div>
</template>
