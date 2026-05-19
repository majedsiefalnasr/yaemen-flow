<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  LayoutDashboard, FileText, FilePlus2, Users, BarChart3, PackageCheck, Settings,
  Bell, Search, Sun, Moon, LogOut, Languages, Building2, ScrollText, AlertTriangle,
  ChevronLeft, UserCog, Network, FileCheck2, KeyRound, Menu,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS, type Role } from '@/lib/mock'
import { can, type Permission } from '@/lib/governance'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

type NavItem = { to: string; label: string; icon: any; roles?: Role[]; perm?: Permission }
const NAV: NavItem[] = [
  { to: '/', label: 'اللوحة الرئيسية', icon: LayoutDashboard },
  { to: '/requests', label: 'طلبات التمويل', icon: FileText },
  { to: '/requests/new', label: 'تقديم طلب جديد', icon: FilePlus2, roles: ['bank_intake', 'bank_admin'] },
  { to: '/merchants', label: 'إدارة التجار', icon: Building2, perm: 'merchants.manage' },
  { to: '/customs', label: 'إذن إصدار بيان جمركي', icon: PackageCheck, roles: ['committee_manager'] },
  { to: '/reports', label: 'التقارير والتحليلات', icon: BarChart3, perm: 'reports.view' },
  { to: '/audit', label: 'التدقيق والامتثال', icon: ScrollText, perm: 'audit.view' },
  { to: '/notifications', label: 'الإشعارات', icon: Bell },
  { to: '/admin/entities', label: 'إدارة البنوك', icon: Network, perm: 'entities.manage' },
  { to: '/admin/cby-staff', label: 'مستخدمي النظام', icon: UserCog, roles: ['platform_admin'] },
  { to: '/admin/workflow-docs', label: 'قواعد المستندات', icon: FileCheck2, perm: 'docrules.manage' },
  { to: '/admin/roles', label: 'الأدوار والصلاحيات', icon: KeyRound, perm: 'roles.manage' },
  { to: '/bank/users', label: 'موظفو الجهة', icon: Users, roles: ['bank_admin'] },
  { to: '/settings', label: 'إعدادات النظام', icon: Settings, roles: ['platform_admin'] },
]

const auth = useAuthStore()
const { user, theme } = storeToRefs(auth)
const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const mobileOpen = ref(false)

watch(() => route.fullPath, () => { mobileOpen.value = false })

const items = computed(() => {
  if (!user.value) return []
  return NAV.filter((i) => {
    if (i.perm) return can(user.value!.role, i.perm)
    if (i.roles) return i.roles.includes(user.value!.role)
    return true
  })
})

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

function logout() { auth.logout(); router.push('/login') }
</script>

<template>
  <div v-if="!user"><slot /></div>
  <div v-else dir="rtl" class="flex min-h-screen w-full bg-background text-foreground">
    <aside :class="cn('sticky top-0 h-screen shrink-0 bg-sidebar text-sidebar-foreground transition-all duration-300 border-l border-sidebar-border hidden lg:block relative', collapsed ? 'w-20' : 'w-72')">
      <div class="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div class="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold">ب م</div>
        <div v-if="!collapsed" class="leading-tight">
          <div class="font-bold">منصة الواردات</div>
          <div class="text-[11px] text-sidebar-foreground/60">البنك المركزي اليمني</div>
        </div>
      </div>
      <nav class="p-3 space-y-1 overflow-y-auto h-[calc(100vh-9rem)]">
        <NuxtLink v-for="it in items" :key="it.to" :to="it.to"
          :class="cn('group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all', isActive(it.to) ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')">
          <component :is="it.icon" class="h-5 w-5 shrink-0" />
          <span v-if="!collapsed" class="truncate">{{ it.label }}</span>
          <ChevronLeft v-if="!collapsed && isActive(it.to)" class="h-4 w-4 ms-auto opacity-60" />
        </NuxtLink>
      </nav>
      <div class="absolute bottom-0 inset-x-0 p-3 border-t border-sidebar-border bg-sidebar">
        <button @click="collapsed = !collapsed" class="w-full text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground py-2">
          {{ collapsed ? 'توسيع ›' : '‹ طي الشريط الجانبي' }}
        </button>
      </div>
    </aside>

    <Sheet v-model:open="mobileOpen">
      <SheetContent side="right" class="p-0 w-72 bg-sidebar text-sidebar-foreground border-l border-sidebar-border">
        <div class="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
          <div class="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold">ب م</div>
          <div class="leading-tight">
            <div class="font-bold">منصة الواردات</div>
            <div class="text-[11px] text-sidebar-foreground/60">البنك المركزي اليمني</div>
          </div>
        </div>
        <nav class="p-3 space-y-1 overflow-y-auto">
          <NuxtLink v-for="it in items" :key="it.to" :to="it.to"
            :class="cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm', isActive(it.to) ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent')">
            <component :is="it.icon" class="h-5 w-5 shrink-0" />
            <span class="truncate">{{ it.label }}</span>
          </NuxtLink>
        </nav>
      </SheetContent>
    </Sheet>

    <div class="flex flex-1 flex-col min-w-0">
      <header class="sticky top-0 z-30 h-16 border-b bg-card/80 backdrop-blur-md flex items-center gap-2 sm:gap-3 px-3 sm:px-6">
        <Button variant="ghost" size="icon" class="lg:hidden shrink-0" @click="mobileOpen = true">
          <Menu class="h-5 w-5" />
        </Button>
        <div class="relative w-full max-w-md hidden md:block">
          <Search class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="ابحث عن طلب، تاجر، أو رقم فاتورة..." class="pr-10 bg-muted/50 border-transparent" />
        </div>
        <div class="ms-auto flex items-center gap-1.5 sm:gap-3">
          <Button variant="ghost" size="icon" class="hidden sm:inline-flex" @click="auth.setLang(auth.lang === 'ar' ? 'en' : 'ar')">
            <Languages class="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" class="hidden sm:inline-flex" @click="auth.toggleTheme()">
            <Sun v-if="theme === 'dark'" class="h-5 w-5" />
            <Moon v-else class="h-5 w-5" />
          </Button>
          <NuxtLink to="/notifications">
            <Button variant="ghost" size="icon" class="relative"><Bell class="h-5 w-5" /></Button>
          </NuxtLink>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button class="flex items-center gap-3 pr-2 pl-1 py-1 rounded-full hover:bg-muted/60">
                <div class="text-right leading-tight hidden sm:block">
                  <div class="text-sm font-semibold">{{ user.name }}</div>
                  <div class="text-[11px] text-muted-foreground">{{ ROLE_LABELS[user.role] }}</div>
                </div>
                <div class="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-bold">{{ user.avatar }}</div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-64">
              <DropdownMenuLabel>
                <div class="font-semibold">{{ user.name }}</div>
                <div class="text-xs font-normal text-muted-foreground">{{ user.email }}</div>
                <div class="text-xs font-normal text-muted-foreground mt-0.5">{{ user.org }}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem @select="router.push('/profile')">الملف الشخصي</DropdownMenuItem>
              <DropdownMenuItem @select="router.push('/settings')">الإعدادات</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem class="text-destructive" @select="logout">
                <LogOut class="h-4 w-4 ml-2" /> تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main class="flex-1 p-3 sm:p-5 lg:p-8 max-w-[1600px] w-full mx-auto min-w-0"><slot /></main>
      <footer class="px-3 sm:px-6 py-4 text-[10px] sm:text-xs text-muted-foreground border-t flex items-center justify-between gap-2 flex-wrap">
        <div>© 2025 البنك المركزي اليمني</div>
        <div class="flex items-center gap-2 shrink-0"><AlertTriangle class="h-3.5 w-3.5" />بيئة عرض توضيحي</div>
      </footer>
    </div>
  </div>
</template>