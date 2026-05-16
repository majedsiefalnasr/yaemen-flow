import { useAuthStore } from '~/stores/auth'

// Usage: definePageMeta({ middleware: ['auth', 'role'], roles: ['admin','committee_manager'] })
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const roles = (to.meta.roles as string[]) || []
  if (roles.length && !auth.hasAnyRole(roles)) {
    return navigateTo('/')
  }
})
