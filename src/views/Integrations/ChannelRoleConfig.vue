<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from '@/composables/useToast'

const CHANNEL_LABELS = {
  yampi: 'Yampi',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
}

const ROLE_LABELS = {
  fonte_estoque: 'Fonte de estoque',
  consumidor_pedido: 'Consumidor de pedido',
  ambos: 'Ambos',
}

const props = defineProps({
  channel: { type: Object, required: true },
  allChannels: { type: Array, required: true },
  onUpdateRole: { type: Function, required: true },
})

const toast = useToast()
const saving = ref(false)
const role = ref(props.channel.role || 'ambos')
const stockSourceChannel = ref(props.channel.stock_source_channel || '')

// Keep local selection in sync if the channel prop is refreshed from a
// sibling save (e.g. this channel gets picked as someone else's source).
watch(
  () => [props.channel.role, props.channel.stock_source_channel],
  ([newRole, newSource]) => {
    role.value = newRole || 'ambos'
    stockSourceChannel.value = newSource || ''
  },
)

// Candidates for "debitar estoque de qual canal?": any other connected
// channel whose own role actually owns real stock.
const sourceOptions = computed(() =>
  props.allChannels.filter(
    (c) => c.channel !== props.channel.channel && c.status !== 'pending' && ['fonte_estoque', 'ambos'].includes(c.role),
  ),
)

const dirty = computed(
  () => role.value !== (props.channel.role || 'ambos') || stockSourceChannel.value !== (props.channel.stock_source_channel || ''),
)

async function save() {
  if (role.value === 'consumidor_pedido' && !stockSourceChannel.value) {
    toast.error('Selecione de qual canal debitar o estoque.')
    return
  }

  saving.value = true
  try {
    await props.onUpdateRole(props.channel.channel, role.value, role.value === 'consumidor_pedido' ? stockSourceChannel.value : '')
    toast.success('Papel do canal atualizado.')
  } catch (e) {
    toast.error(e.response?.data?.errors?.[0] || 'Não foi possível atualizar o papel do canal.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mt-4 border-t border-slate-100 pt-4">
    <label class="text-xs font-medium text-slate-500">Papel do canal</label>
    <select v-model="role" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
      <option v-for="(label, value) in ROLE_LABELS" :key="value" :value="value">{{ label }}</option>
    </select>

    <div v-if="role === 'consumidor_pedido'" class="mt-3">
      <label class="text-xs font-medium text-slate-500">Debitar estoque de qual canal?</label>
      <select v-model="stockSourceChannel" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
        <option value="">Selecione...</option>
        <option v-for="opt in sourceOptions" :key="opt.channel" :value="opt.channel">
          {{ CHANNEL_LABELS[opt.channel] || opt.channel }}
        </option>
      </select>
      <p v-if="sourceOptions.length === 0" class="mt-1 text-xs text-amber-600">
        Nenhum canal "fonte de estoque" ou "ambos" conectado ainda.
      </p>
    </div>

    <button
      v-if="dirty"
      type="button"
      :disabled="saving"
      class="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      @click="save"
    >
      {{ saving ? 'Salvando...' : 'Salvar papel' }}
    </button>
  </div>
</template>
