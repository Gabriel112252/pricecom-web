import { ref } from 'vue'

const toasts = ref([])
let nextId = 1

function dismiss(id) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function push(message, { type = 'success', timeout = 4000, action = null } = {}) {
  const id = nextId++
  toasts.value.push({ id, message, type, action })
  if (timeout) setTimeout(() => dismiss(id), timeout)
  return id
}

export function useToast() {
  return {
    toasts,
    success: (message, opts) => push(message, { ...opts, type: 'success' }),
    info: (message, opts) => push(message, { ...opts, type: 'info' }),
    error: (message, opts) => push(message, { ...opts, type: 'error', timeout: opts?.timeout ?? 0 }),
    dismiss,
  }
}
