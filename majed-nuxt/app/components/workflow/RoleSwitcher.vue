<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { UserCog } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { DEMO_USERS, ROLE_LABELS, type User } from '@/lib/mock'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
const auth = useAuthStore()
const { user } = storeToRefs(auth)
function switchTo(u: User) { auth.login(u) }
</script>
<template>
  <DropdownMenu v-if="user">
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" title="تبديل الدور"><UserCog class="h-5 w-5" /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-72">
      <DropdownMenuLabel>تبديل الدور — عرض توضيحي</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem v-for="u in DEMO_USERS" :key="u.id" @select="switchTo(u)">
        <div class="flex items-start justify-between gap-2 w-full">
          <div class="min-w-0">
            <div class="text-sm truncate">{{ u.name }}</div>
            <div class="text-[10.5px] text-muted-foreground truncate">{{ ROLE_LABELS[u.role] }}</div>
          </div>
          <span v-if="user.id === u.id" class="text-[10px] text-success">نشط</span>
        </div>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>