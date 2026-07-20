<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import PaymentFeeRulesSection from './PaymentFeeRulesSection.vue'
import StockAlertRulesSection from './StockAlertRulesSection.vue'

const auth = useAuthStore()
const toast = useToast()

const tvToken = ref(null)
const loading = ref(true)
const working = ref(false)

const tvUrl = computed(() => (tvToken.value ? `${window.location.origin}/tv/${tvToken.value}` : null))

async function loadToken() {
  loading.value = true
  try {
    const { data } = await api.get('/tv_token')
    tvToken.value = data.tv_token
  } catch {
    // seção fica sem estado inicial — os botões ainda funcionam normalmente
  } finally {
    loading.value = false
  }
}

async function generateLink() {
  working.value = true
  try {
    const { data } = await api.post('/tv_token')
    tvToken.value = data.tv_token
    await copyToClipboard(tvUrl.value)
    toast.success('Link do modo TV gerado e copiado para a área de transferência.')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível gerar o link do modo TV.')
  } finally {
    working.value = false
  }
}

async function revokeLink() {
  working.value = true
  try {
    await api.delete('/tv_token')
    tvToken.value = null
    toast.success('Link do modo TV revogado.')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível revogar o link do modo TV.')
  } finally {
    working.value = false
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // clipboard API pode não estar disponível (ex: contexto não seguro) —
    // o link continua visível na tela para cópia manual
  }
}

onMounted(() => {
  if (auth.isAdmin) loadToken()
})
</script>

<template>
  <div class="space-y-6 p-6 lg:p-8">
    <h1 class="text-2xl font-semibold text-slate-900">Configurações</h1>

    <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 class="text-base font-semibold text-slate-900">Geral</h2>
        <p class="mt-1 text-sm text-slate-500">Preferências gerais do hub.</p>
      </div>

      <div class="border-t border-slate-100 pt-4">
        <h3 class="text-sm font-semibold text-slate-900">Modo TV</h3>
        <p class="mt-1 text-xs text-slate-400">
          Gere um link público para exibir o dashboard em uma TV ou monitor, sem exigir login. Regenerar o link
          invalida qualquer link anterior.
        </p>

        <div v-if="!auth.isAdmin" class="mt-3 text-sm text-slate-400">Acesso restrito a administradores.</div>

        <template v-else>
          <div v-if="loading" class="mt-3 text-sm text-slate-400">Carregando...</div>
          <div v-else class="mt-3 space-y-3">
            <div v-if="tvUrl" class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span class="min-w-0 flex-1 truncate text-xs text-slate-600">{{ tvUrl }}</span>
              <span class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Ativo
              </span>
            </div>
            <p v-else class="text-sm text-slate-400">Nenhum link ativo no momento.</p>

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                :disabled="working"
                class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                @click="generateLink"
              >
                {{ tvUrl ? 'Gerar novo link do modo TV' : 'Gerar link do modo TV' }}
              </button>
              <button
                v-if="tvUrl"
                type="button"
                :disabled="working"
                class="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                @click="revokeLink"
              >
                Revogar link atual
              </button>
            </div>
          </div>
        </template>
      </div>

      <PaymentFeeRulesSection />
      <StockAlertRulesSection />
    </section>
  </div>
</template>
