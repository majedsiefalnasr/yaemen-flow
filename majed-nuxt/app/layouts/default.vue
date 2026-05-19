<script setup lang="ts">
import AppShell from '@/components/layout/AppShell.vue'
import { onMounted, watchEffect } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { user, theme } = storeToRefs(auth)
const router = useRouter()
const route = useRoute()

onMounted(() => {
  document.documentElement.classList.toggle('dark', theme.value === 'dark')
})

watchEffect(() => {
  if (!user.value && route.path !== '/login') router.push('/login')
})
</script>
<template>
  <AppShell><slot /></AppShell>
</template>