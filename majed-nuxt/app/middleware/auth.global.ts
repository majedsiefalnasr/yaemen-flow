import { useAuthStore } from '@/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return
  const auth = useAuthStore()
  if (!auth.user && to.path !== '/login') return navigateTo('/login')
  if (auth.user && to.path === '/login') return navigateTo('/')
})