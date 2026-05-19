import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { DEMO_USERS, type User } from '@/lib/mock'

export const useAuthStore = defineStore('auth', () => {
  const user = useLocalStorage<User | null>('cby.auth.user', null, { serializer: { read: (v) => v ? JSON.parse(v) : null, write: (v) => JSON.stringify(v) } })
  const lang = useLocalStorage<'ar' | 'en'>('cby.auth.lang', 'ar')
  const theme = useLocalStorage<'light' | 'dark'>('cby.auth.theme', 'light')

  function login(u: User) { user.value = u }
  function logout() { user.value = null }
  function setLang(l: 'ar' | 'en') { lang.value = l }
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme.value === 'dark')
    }
  }

  return { user, lang, theme, login, logout, setLang, toggleTheme, DEMO_USERS }
})