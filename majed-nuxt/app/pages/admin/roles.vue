<script setup lang="ts">
import { useCell } from '@/composables/useCell'
import { ROLE_LABELS, type Role } from '@/lib/mock'
import { PERMISSION_LABELS, rolePermsCell, type Permission } from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Check, X, Eye } from 'lucide-vue-next'
const roles = Object.keys(ROLE_LABELS) as Role[]
const perms = Object.keys(PERMISSION_LABELS) as Permission[]
const rolePerms = useCell(rolePermsCell)
</script>
<template>
  <div>
    <PageHeader title="الأدوار والصلاحيات" subtitle="عرض للقراءة فقط">
      <template #actions><div class="text-xs text-muted-foreground flex items-center gap-1.5"><Eye class="h-3.5 w-3.5" /> قراءة فقط</div></template>
    </PageHeader>
    <Card class="p-0 overflow-x-auto">
      <table class="w-full text-sm min-w-[800px]">
        <thead><tr class="text-right text-xs text-muted-foreground border-b bg-muted/30">
          <th class="p-3 sticky right-0 bg-muted/30">الصلاحية</th>
          <th v-for="r in roles" :key="r" class="p-3 text-center">{{ ROLE_LABELS[r] }}</th>
        </tr></thead>
        <tbody>
          <tr v-for="p in perms" :key="p" class="border-b last:border-0">
            <td class="p-3 font-medium sticky right-0 bg-card">{{ PERMISSION_LABELS[p] }}</td>
            <td v-for="r in roles" :key="r" class="p-3 text-center">
              <Check v-if="rolePerms[r]?.includes(p)" class="h-4 w-4 text-success inline" />
              <X v-else class="h-4 w-4 text-muted-foreground/40 inline" />
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>