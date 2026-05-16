import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (import.meta.client) auth.hydrate()
  if (!auth.isAuthenticated && to.path !== '/login') {
    return navigateTo('/login')
  }
})
