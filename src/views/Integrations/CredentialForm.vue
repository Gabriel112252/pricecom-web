<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  channel: { type: String, default: '' },
  requiredFields: { type: Array, required: true },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['submit', 'cancel'])

const FIELD_LABELS = {
  alias: 'Alias da loja (Yampi)',
  token: 'Token',
  secret_key: 'Secret Key (API)',
  shop_domain: 'Domínio da loja (ex: minha-loja.myshopify.com)',
  access_token: 'Access Token',
  app_key: 'App Key',
  app_secret: 'App Secret',
  webhook_secret: 'Webhook Secret',
  partner_id: 'Partner ID (Shopee Open Platform)',
  partner_key: 'Partner Key',
}

// webhook_secret é gerado numa tela de Webhooks separada da tela de
// credenciais de API em cada plataforma — valor diferente de secret_key /
// access_token, então o rótulo precisa deixar isso explícito por canal.
const CHANNEL_FIELD_LABELS = {
  yampi: { webhook_secret: 'Chave Secreta do Webhook (tela Webhooks da Yampi — diferente da Secret Key acima)' },
  shopify: { webhook_secret: 'Webhook Secret (Client Secret do app Shopify)' },
}

const SECRET_FIELDS = new Set(['token', 'secret_key', 'access_token', 'app_secret', 'webhook_secret', 'partner_key'])

// Campos extras opcionais por canal, fora dos required_fields do backend
// (o connect aceita chaves além das obrigatórias). Shopee: marcar o
// toggle grava "environment": "sandbox" no JSONB, que troca a base URL
// para partner.test-stable (ver Integrations::ShopeeAuthService).
const CHANNEL_EXTRA_TOGGLES = {
  shopee: {
    key: 'environment',
    onValue: 'sandbox',
    label: 'Ambiente sandbox (testes)',
    hint: 'Desmarcado usa produção. Trocar de ambiente exige autorizar a loja novamente.',
  },
}

const form = ref({})
const extraToggle = computed(() => CHANNEL_EXTRA_TOGGLES[props.channel] || null)
const extraToggleChecked = ref(false)

watch(
  () => props.requiredFields,
  (fields) => {
    form.value = Object.fromEntries(fields.map((field) => [field, '']))
  },
  { immediate: true },
)

function fieldLabel(field) {
  return CHANNEL_FIELD_LABELS[props.channel]?.[field] || FIELD_LABELS[field] || field
}

function handleSubmit() {
  const extras =
    extraToggle.value && extraToggleChecked.value ? { [extraToggle.value.key]: extraToggle.value.onValue } : {}
  emit('submit', { ...form.value, ...extras })
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="handleSubmit">
    <div v-for="field in requiredFields" :key="field">
      <label class="text-xs font-medium text-slate-500">{{ fieldLabel(field) }}</label>
      <input
        v-model="form[field]"
        :type="SECRET_FIELDS.has(field) ? 'password' : 'text'"
        required
        autocomplete="off"
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
      />
    </div>
    <label v-if="extraToggle" class="flex items-start gap-2 pt-1">
      <input
        v-model="extraToggleChecked"
        type="checkbox"
        class="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span class="text-xs text-slate-600">
        {{ extraToggle.label }}
        <span class="block text-slate-400">{{ extraToggle.hint }}</span>
      </span>
    </label>
    <div class="flex justify-end gap-2 pt-2">
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        @click="emit('cancel')"
      >
        Cancelar
      </button>
      <button
        type="submit"
        :disabled="submitting"
        class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {{ submitting ? 'Conectando...' : 'Conectar' }}
      </button>
    </div>
  </form>
</template>
