<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/lib/api'
import StatusBadge from '@/components/StatusBadge.vue'

const loading = ref(true)
const summary = ref(null)
const financial = ref(null)

async function loadAll() {
  loading.value = true
  try {
    const [summaryRes, financialRes] = await Promise.all([
      api.get('/dashboard/summary'),
      api.get('/dashboard/financial'),
    ])
    summary.value = summaryRes.data
    financial.value = financialRes.data
  } catch {
    summary.value = null
    financial.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value ?? 0))
}

const blocks = [
  { key: 'orders', title: 'Pedidos', to: '/orders', accent: 'bg-blue-500' },
  { key: 'products', title: 'Produtos', to: '/products', accent: 'bg-indigo-500' },
  { key: 'inventory', title: 'Estoque', to: '/inventory', accent: 'bg-violet-500' },
  { key: 'financial', title: 'Financeiro', to: '/financial', accent: 'bg-emerald-500' },
  { key: 'audit', title: 'Auditoria', to: '/audit', accent: 'bg-amber-500' },
  { key: 'integrations', title: 'Integrações', to: '/integrations', accent: 'bg-cyan-500' },
  { key: 'settings', title: 'Configurações', to: '/settings', accent: 'bg-slate-500' },
]
</script>

<template>
  <div class="space-y-10 p-6 lg:p-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">Visão geral operacional do hub Pricecom.</p>
      </div>
      <button
        type="button"
        class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        :disabled="loading"
        @click="loadAll"
      >
        Atualizar
      </button>
    </div>

    <div v-if="loading" class="text-sm text-slate-500">Carregando visão geral...</div>

    <template v-else>
      <section class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Pedidos</p>
          <p class="mt-2 text-3xl font-bold text-slate-900">{{ summary?.totals?.orders_count ?? '—' }}</p>
          <p class="mt-1 text-xs text-slate-400">Margem média: {{ summary?.totals?.margin_pct ?? 0 }}%</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Repasses</p>
          <p class="mt-2 text-3xl font-bold text-slate-900">{{ financial?.totals?.settlements_count ?? '—' }}</p>
          <p class="mt-1 text-xs text-slate-400">
            Diferença total: {{ formatMoney(financial?.totals?.difference_amount) }}
          </p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Conflitos abertos</p>
          <p class="mt-2 text-3xl font-bold text-slate-900">{{ summary?.audit?.open_count ?? '—' }}</p>
          <p class="mt-1 text-xs text-slate-400">Críticos: {{ summary?.audit?.critical_count ?? 0 }}</p>
        </div>

        <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Conciliação</p>
          <div class="mt-2 flex items-center gap-2">
            <StatusBadge status="disputed" :label="`${financial?.totals?.disputed_count ?? 0} divergentes`" />
          </div>
          <p class="mt-1 text-xs text-slate-400">
            {{ financial?.totals?.unmatched_count ?? 0 }} não encontrados
          </p>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-lg font-semibold text-slate-900">Áreas do hub</h2>
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <RouterLink
            v-for="block in blocks"
            :key="block.key"
            :to="block.to"
            class="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span class="inline-block h-2 w-8 rounded-full" :class="block.accent"></span>
            <p class="mt-3 text-base font-semibold text-slate-900 group-hover:text-indigo-600">
              {{ block.title }}
            </p>
            <p class="mt-1 text-xs text-slate-400">Acessar módulo</p>
          </RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>
