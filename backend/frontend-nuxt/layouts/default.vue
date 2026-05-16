<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
const auth = useAuthStore()
const route = useRoute()
const api = useApi()

async function logout() {
  try { await api.post('/auth/logout') } catch {}
  auth.clear()
  await navigateTo('/login')
}

const nav = computed(() => {
  const items = [{ to: '/', label: 'الرئيسية', icon: '🏠' }]
  if (auth.hasAnyRole(['commercial_bank', 'exchange', 'committee_manager', 'admin'])) {
    items.push({ to: '/requests', label: 'طلبات التمويل', icon: '📄' })
  }
  if (auth.hasAnyRole(['commercial_bank', 'exchange'])) {
    items.push({ to: '/requests/new', label: 'طلب جديد', icon: '➕' })
  }
  if (auth.hasAnyRole(['support_member', 'committee_manager'])) {
    items.push({ to: '/committee', label: 'لجنة المراجعة', icon: '🛡️' })
  }
  if (auth.hasAnyRole(['executive_member', 'committee_manager'])) {
    items.push({ to: '/voting', label: 'التصويت التنفيذي', icon: '🗳️' })
  }
  items.push({ to: '/merchants', label: 'التجار', icon: '🏢' })
  if (auth.hasAnyRole(['admin', 'committee_manager', 'support_member'])) {
    items.push({ to: '/audit', label: 'التدقيق والرقابة', icon: '🔍' })
  }
  items.push({ to: '/reports', label: 'التقارير', icon: '📊' })
  return items
})
</script>

<template>
  <div v-if="route.path === '/login'"><slot /></div>
  <div v-else class="min-h-screen flex" dir="rtl">
    <aside class="w-64 bg-primary-700 text-white flex flex-col">
      <div class="p-5 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 grid place-items-center rounded-lg bg-white/10 font-bold">ب.م</div>
          <div>
            <div class="font-bold text-sm">البنك المركزي اليمني</div>
            <div class="text-xs text-white/60">منصة الواردات</div>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        <NuxtLink v-for="i in nav" :key="i.to" :to="i.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-white/10"
          active-class="bg-white/15 font-semibold">
          <span>{{ i.icon }}</span><span>{{ i.label }}</span>
        </NuxtLink>
      </nav>
      <div class="p-3 border-t border-white/10">
        <div class="px-3 py-2 text-xs text-white/70">{{ auth.user?.name }}</div>
        <div class="px-3 text-[11px] text-white/50">{{ auth.user?.roles?.[0]?.name_ar }}</div>
        <button @click="logout" class="mt-2 w-full text-right px-3 py-2 rounded-lg hover:bg-white/10 text-sm">
          تسجيل الخروج
        </button>
      </div>
    </aside>
    <main class="flex-1 overflow-auto">
      <div class="p-6"><slot /></div>
    </main>
  </div>
</template>
