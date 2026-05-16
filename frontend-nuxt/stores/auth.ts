import { defineStore } from 'pinia'

interface Role { key: string; name_ar: string }
interface User { id: number; name: string; email: string; organization?: string; roles: Role[] }

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '' as string,
    user: null as User | null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    roleKeys: (s) => s.user?.roles.map(r => r.key) || [],
    hasRole: (s) => (key: string) => !!s.user?.roles.some(r => r.key === key),
    hasAnyRole: (s) => (keys: string[]) => !!s.user?.roles.some(r => keys.includes(r.key)),
  },
  actions: {
    setSession(token: string, user: User) {
      this.token = token
      this.user = user
      if (import.meta.client) {
        localStorage.setItem('cby_token', token)
        localStorage.setItem('cby_user', JSON.stringify(user))
      }
    },
    hydrate() {
      if (!import.meta.client) return
      const t = localStorage.getItem('cby_token')
      const u = localStorage.getItem('cby_user')
      if (t && u) { this.token = t; this.user = JSON.parse(u) }
    },
    clear() {
      this.token = ''
      this.user = null
      if (import.meta.client) {
        localStorage.removeItem('cby_token')
        localStorage.removeItem('cby_user')
      }
    },
  },
})
