<script setup>
import ConflictRow from './ConflictRow.vue'
import { TAB_EMPTY_MESSAGE } from './lib/auditLabels'

const props = defineProps({
  conflicts: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  activeStatus: { type: String, required: true },
})

defineEmits(['view'])

const COLUMNS = ['Severidade', 'Tipo', 'Status', 'Referência', 'Diferença', 'Criado em', '']
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
    <table class="min-w-full divide-y divide-slate-200 text-sm">
      <thead class="bg-slate-50">
        <tr>
          <th
            v-for="col in COLUMNS"
            :key="col"
            class="px-4 py-2 text-left font-medium text-slate-600"
            :class="{ 'text-right': col === 'Diferença' }"
          >
            {{ col }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100" :class="{ 'opacity-60 transition-opacity': loading && conflicts.length > 0 }">
        <template v-if="loading && conflicts.length === 0">
          <tr v-for="n in 5" :key="n">
            <td v-for="col in COLUMNS" :key="col" class="px-4 py-3">
              <div class="h-4 w-full max-w-24 animate-pulse rounded bg-slate-200"></div>
            </td>
          </tr>
        </template>

        <tr v-else-if="conflicts.length === 0">
          <td :colspan="COLUMNS.length" class="px-4 py-12 text-center text-sm text-slate-400">
            {{ TAB_EMPTY_MESSAGE[activeStatus] ?? 'Nenhum conflito encontrado.' }}
          </td>
        </tr>

        <template v-else>
          <ConflictRow
            v-for="conflict in conflicts"
            :key="conflict.id"
            :conflict="conflict"
            @view="$emit('view', $event)"
          />
        </template>
      </tbody>
    </table>
  </div>
</template>
