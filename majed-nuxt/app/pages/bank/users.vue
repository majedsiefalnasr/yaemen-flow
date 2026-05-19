<script setup lang="ts">
import { DEMO_USERS, ROLE_LABELS, BANK_ROLES } from '@/lib/mock'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
const bankStaff = DEMO_USERS.filter((u) => BANK_ROLES.includes(u.role))
</script>
<template>
  <div>
    <PageHeader title="موظفو الجهة" subtitle="موظفو البنك التجاري" />
    <Card class="p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead><tr class="text-right text-xs text-muted-foreground border-b bg-muted/30"><th class="p-3">الاسم</th><th class="p-3">البريد</th><th class="p-3">الدور</th></tr></thead>
        <tbody>
          <tr v-for="u in bankStaff" :key="u.id" class="border-b last:border-0">
            <td class="p-3 font-medium">{{ u.name }}</td>
            <td class="p-3 text-xs">{{ u.email }}</td>
            <td class="p-3 text-xs">{{ ROLE_LABELS[u.role] }}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>