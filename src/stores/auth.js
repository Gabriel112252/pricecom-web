import { defineStore } from 'pinia'
import api, { TOKEN_KEY } from '@/lib/api'

const USER_KEY = 'pricecom_user'

function loadStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || null,
    user: loadStoredUser(),
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin',
  },

  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password })
      this.token = data.token
      this.user = data.user
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    },

    // Refreshes the role (and other profile fields) from the server rather
    // than trusting whatever was cached in localStorage at last login —
    // matters if an admin changes a user's role between sessions.
    async fetchMe() {
      const { data } = await api.get('/auth/me')
      this.user = { ...this.user, ...data.user }
      localStorage.setItem(USER_KEY, JSON.stringify(this.user))
    },

    logout() {
      this.token = null
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})
