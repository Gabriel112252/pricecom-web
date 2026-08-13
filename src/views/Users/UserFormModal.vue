<script setup>
import { ref } from 'vue'

defineProps({
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save'])

const ROLES = [
  { value: 'operador', label: 'Operador' },
  { value: 'admin', label: 'Administrador' },
]

// 'invite': só nome/e-mail/role, backend gera senha via link de convite.
// 'direct': cadastro direto, senha definida agora pelo admin.
const mode = ref('invite')

const form = ref({
  name: '',
  email: '',
  role: 'operador',
  password: '',
})

function submit() {
  const payload = { name: form.value.name, email: form.value.email, role: form.value.role }
  if (mode.value === 'invite') {
    payload.invite = true
  } else {
    payload.password = form.value.password
  }
  emit('save', payload)
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-900">Novo usuário</h2>
        <button type="button" class="shrink-0 text-slate-400 hover:text-slate-600" @click="emit('close')">✕</button>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium">
        <button
          type="button"
          class="rounded-md py-1.5 transition"
          :class="mode === 'invite' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="mode = 'invite'"
        >
          Convidar por e-mail
        </button>
        <button
          type="button"
          class="rounded-md py-1.5 transition"
          :class="mode === 'direct' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="mode = 'direct'"
        >
          Cadastro direto
        </button>
      </div>
      <p class="mt-2 text-xs text-slate-400">
        <template v-if="mode === 'invite'">
          A pessoa recebe um e-mail com um link para definir a própria senha e ativar a conta.
        </template>
        <template v-else>
          A conta já nasce ativa, com a senha que você definir abaixo.
        </template>
      </p>

      <form class="mt-4 space-y-3" @submit.prevent="submit">
        <label class="block text-sm">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Nome</span>
          <input
            v-model="form.name"
            type="text"
            required
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        </label>

        <label class="block text-sm">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">E-mail</span>
          <input
            v-model="form.email"
            type="email"
            required
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        </label>

        <label class="block text-sm">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Papel</span>
          <select
            v-model="form.role"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
          </select>
        </label>

        <label v-if="mode === 'direct'" class="block text-sm">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">Senha</span>
          <input
            v-model="form.password"
            type="password"
            minlength="8"
            required
            placeholder="Mínimo 8 caracteres"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
          />
        </label>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            :disabled="submitting"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="submitting"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {{ mode === 'invite' ? 'Enviar convite' : 'Cadastrar usuário' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
