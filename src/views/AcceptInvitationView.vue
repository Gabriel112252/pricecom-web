<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/lib/api'
import logoLockup from '@/assets/pricecom-lockup.png'

const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const error = ref('')
const done = ref(false)

const router = useRouter()
const route = useRoute()
const token = route.query.token

async function handleSubmit() {
  error.value = ''

  if (!token) {
    error.value = 'Link de convite inválido — falta o token na URL.'
    return
  }
  if (password.value !== passwordConfirmation.value) {
    error.value = 'As senhas não coincidem.'
    return
  }

  loading.value = true
  try {
    await api.post('/users/accept_invitation', { token, password: password.value })
    done.value = true
    setTimeout(() => router.push({ name: 'login' }), 2500)
  } catch (e) {
    error.value = e.response?.data?.error || 'Não foi possível ativar sua conta.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#eef2f7] px-4">
    <div class="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col items-center gap-3 text-center">
        <img :src="logoLockup" alt="Pricecom" class="h-24 w-auto" />
        <h1 class="text-xl font-semibold text-slate-900">Ativar sua conta</h1>
      </div>

      <div v-if="done" class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700">
        Conta ativada! Redirecionando para o login...
      </div>

      <form v-else class="space-y-4" @submit.prevent="handleSubmit">
        <p class="text-center text-sm text-slate-500">Defina uma senha para começar a usar o Pricecom.</p>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Nova senha</label>
          <input
            v-model="password"
            type="password"
            required
            minlength="8"
            placeholder="Mínimo 8 caracteres"
            class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">Confirmar senha</label>
          <input
            v-model="passwordConfirmation"
            type="password"
            required
            minlength="8"
            class="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {{ loading ? 'Ativando...' : 'Ativar conta' }}
        </button>
      </form>
    </div>
  </div>
</template>
