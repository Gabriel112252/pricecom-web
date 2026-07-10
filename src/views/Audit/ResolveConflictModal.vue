<script setup>
import { ref, computed, watch } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { CONFLICT_TYPE_LABEL, CONFLICT_TYPE_DESCRIPTION } from './lib/auditLabels'
import { formatMoney, formatDateTime } from '@/lib/format'

const props = defineProps({
  conflict: { type: Object, required: true },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'resolve', 'ignore'])

const note = ref(props.conflict.notes ?? '')
watch(
  () => props.conflict.id,
  () => {
    note.value = props.conflict.notes ?? ''
  },
)

const isOpen = computed(() => props.conflict.status === 'open')
const differenceIsNegative = computed(() => Number(props.conflict.difference) < 0)
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">
            {{ CONFLICT_TYPE_LABEL[conflict.conflict_type] ?? conflict.conflict_type }}
          </h2>
          <div class="mt-2 flex gap-2">
            <StatusBadge :status="conflict.severity" />
            <StatusBadge :status="conflict.status" />
          </div>
        </div>
        <button type="button" class="shrink-0 text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <p v-if="CONFLICT_TYPE_DESCRIPTION[conflict.conflict_type]" class="mt-3 text-sm text-slate-600">
        {{ CONFLICT_TYPE_DESCRIPTION[conflict.conflict_type] }}
      </p>

      <dl class="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Pedido vinculado</dt>
          <dd class="mt-0.5 text-slate-700">{{ conflict.order_number ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Produto vinculado</dt>
          <dd class="mt-0.5 text-slate-700">{{ conflict.product_sku ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Valor esperado</dt>
          <dd class="mt-0.5 text-slate-700">{{ formatMoney(conflict.expected_value) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Valor real</dt>
          <dd class="mt-0.5 text-slate-700">{{ formatMoney(conflict.actual_value) }}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Diferença</dt>
          <dd class="mt-0.5 font-medium" :class="differenceIsNegative ? 'text-red-600' : 'text-slate-700'">
            {{ formatMoney(conflict.difference) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Criado em</dt>
          <dd class="mt-0.5 text-slate-700">{{ formatDateTime(conflict.created_at) }}</dd>
        </div>
      </dl>

      <div class="mt-5">
        <label class="text-xs font-semibold uppercase tracking-wide text-slate-400">Nota</label>
        <textarea
          v-if="isOpen"
          v-model="note"
          rows="3"
          class="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          placeholder="Descreva o motivo da resolução..."
        ></textarea>
        <template v-else>
          <p class="mt-1 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">{{ conflict.notes || 'Sem nota registrada.' }}</p>
          <p class="mt-1.5 text-xs text-slate-400">
            {{ conflict.status === 'resolved' ? 'Resolvido' : 'Ignorado' }} por
            {{ conflict.resolved_by_name ?? 'alguém' }} em {{ formatDateTime(conflict.resolved_at) }}
          </p>
        </template>
      </div>

      <div v-if="isOpen" class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          :disabled="submitting"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          @click="emit('ignore', note)"
        >
          Ignorar
        </button>
        <button
          type="button"
          :disabled="submitting"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          @click="emit('resolve', note)"
        >
          Marcar como resolvido
        </button>
      </div>
    </div>
  </div>
</template>
