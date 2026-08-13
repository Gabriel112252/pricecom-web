<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const configured = ref(false)
const loading = ref(true)
const working = ref(false)
// Só populado logo depois de gerar/regenerar — nunca vem do GET /mcp_token,
// que só confirma que existe (boolean), nunca reexibe o valor.
const revealedToken = ref(null)
const revealedUrl = ref(null)

const claudeConfigSnippet = computed(() => {
  if (!revealedToken.value || !revealedUrl.value) return ''
  return JSON.stringify(
    {
      mcpServers: {
        pricecom: {
          url: revealedUrl.value,
          headers: { Authorization: `Bearer ${revealedToken.value}` },
        },
      },
    },
    null,
    2,
  )
})

async function loadStatus() {
  loading.value = true
  try {
    const { data } = await api.get('/mcp_token')
    configured.value = data.configured
  } catch {
    // seção fica sem estado inicial — o botão de gerar continua funcionando
  } finally {
    loading.value = false
  }
}

async function regenerate() {
  const message = configured.value
    ? 'Gerar um novo token MCP invalida imediatamente o anterior — qualquer conexão já configurada (Claude Desktop, Claude.ai) para de funcionar até você atualizar com o novo token. Continuar?'
    : 'Gerar seu token MCP?'
  if (!window.confirm(message)) return

  working.value = true
  try {
    const { data } = await api.post('/mcp_token')
    revealedToken.value = data.mcp_api_key
    revealedUrl.value = data.mcp_url
    configured.value = true
    toast.success('Token gerado. Copie agora — ele não será mostrado de novo.')
  } catch (e) {
    toast.error(e.response?.data?.error || 'Não foi possível gerar o token.')
  } finally {
    working.value = false
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Copiado.')
  } catch {
    // clipboard API pode não estar disponível — o valor continua visível na tela para cópia manual
  }
}

function dismissReveal() {
  revealedToken.value = null
  revealedUrl.value = null
}

onMounted(loadStatus)
</script>

<template>
  <div class="border-t border-slate-100 pt-4">
    <h3 class="text-sm font-semibold text-slate-900">Token MCP</h3>
    <p class="mt-1 text-xs text-slate-400">
      Conecte assistentes de IA (Claude Desktop, Claude.ai) ao Pricecom via
      <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" class="underline hover:text-slate-600">MCP</a>
      — consultas de dashboard/produtos/pedidos para qualquer usuário; ações como editar credencial de canal ou
      ativar/desativar usuário exigem uma conta administradora.
    </p>

    <div v-if="loading" class="mt-3 text-sm text-slate-400">Carregando...</div>

    <template v-else>
      <div v-if="!revealedToken" class="mt-3 space-y-3">
        <div class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            :class="configured ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
          >
            {{ configured ? 'Token ativo' : 'Nenhum token gerado' }}
          </span>
          <span class="min-w-0 flex-1 truncate text-xs text-slate-500">
            {{ configured ? 'Valor não pode ser reexibido — gere um novo para ver de novo.' : '' }}
          </span>
        </div>

        <button
          type="button"
          :disabled="working"
          class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          @click="regenerate"
        >
          {{ configured ? 'Gerar novo token' : 'Gerar token' }}
        </button>
      </div>

      <div v-else class="mt-3 space-y-3">
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Copie agora — por segurança, este valor não será mostrado de novo depois que você sair desta tela.
        </div>

        <label class="block text-xs">
          <span class="font-semibold uppercase tracking-wide text-slate-400">URL do servidor MCP</span>
          <div class="mt-1 flex items-center gap-2">
            <code class="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">{{ revealedUrl }}</code>
            <button type="button" class="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-50" @click="copyToClipboard(revealedUrl)">
              Copiar
            </button>
          </div>
        </label>

        <label class="block text-xs">
          <span class="font-semibold uppercase tracking-wide text-slate-400">Token (Bearer)</span>
          <div class="mt-1 flex items-center gap-2">
            <code class="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">{{ revealedToken }}</code>
            <button type="button" class="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-50" @click="copyToClipboard(revealedToken)">
              Copiar
            </button>
          </div>
        </label>

        <label class="block text-xs">
          <span class="font-semibold uppercase tracking-wide text-slate-400">Config do Claude Desktop (claude_desktop_config.json)</span>
          <div class="mt-1 flex items-start gap-2">
            <pre class="min-w-0 flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">{{ claudeConfigSnippet }}</pre>
            <button type="button" class="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-slate-600 hover:bg-slate-50" @click="copyToClipboard(claudeConfigSnippet)">
              Copiar
            </button>
          </div>
        </label>
        <p class="text-xs text-slate-400">
          No Claude.ai, use "Adicionar conector personalizado" com a URL do servidor MCP acima — o consentimento
          via login no Pricecom cuida da autenticação, sem precisar colar o token manualmente.
        </p>

        <button type="button" class="text-xs font-medium text-slate-500 hover:text-slate-700" @click="dismissReveal">
          Ocultar
        </button>
      </div>
    </template>
  </div>
</template>
