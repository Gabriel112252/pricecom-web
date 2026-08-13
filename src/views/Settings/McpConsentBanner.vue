<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const authorizing = ref(false)

// mcp_callback já chega decodificado (Vue Router decodifica query params) —
// é o redirect_uri que o client MCP (Claude.ai/Desktop) mandou pro backend
// em GET /oauth/authorize, repassado aqui por Api::V1::McpTokensController
// (ver config/initializers/fast_mcp.rb).
const callbackUrl = route.query.mcp_callback
const state = route.query.state

function clearConsentParams() {
  const { mcp_callback: _mcpCallback, state: _state, ...rest } = route.query
  router.replace({ query: rest })
}

// "Autorizar" gera um token novo (mesma action de McpTokenSection —
// regenerar) e o envia direto pro client MCP via redirect. Não é
// reexibição do token existente: é a mesma operação de "gerar/regenerar e
// mostrar uma vez", só que a "tela" que recebe o valor desta vez é o
// client MCP, não o usuário.
async function authorize() {
  authorizing.value = true
  try {
    const { data } = await api.post('/mcp_token')
    const redirectUrl = new URL(callbackUrl)
    redirectUrl.searchParams.set('code', data.mcp_api_key)
    if (state) redirectUrl.searchParams.set('state', state)
    window.location.href = redirectUrl.toString()
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível autorizar a conexão.')
    authorizing.value = false
  }
}

function cancel() {
  clearConsentParams()
}
</script>

<template>
  <div v-if="callbackUrl" class="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
    <h2 class="text-sm font-semibold text-indigo-900">Conectar aplicativo MCP</h2>
    <p class="mt-1 text-sm text-indigo-800">
      Um aplicativo está pedindo para se conectar à sua conta do Pricecom via MCP. Ao autorizar, um novo token MCP
      é gerado para você e enviado ao aplicativo — qualquer conexão MCP anterior configurada manualmente para de
      funcionar.
    </p>
    <p class="mt-2 truncate text-xs text-indigo-600">Destino: {{ callbackUrl }}</p>

    <div class="mt-4 flex gap-2">
      <button
        type="button"
        :disabled="authorizing"
        class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        @click="authorize"
      >
        {{ authorizing ? 'Autorizando...' : 'Autorizar' }}
      </button>
      <button
        type="button"
        :disabled="authorizing"
        class="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
        @click="cancel"
      >
        Cancelar
      </button>
    </div>
  </div>
</template>
