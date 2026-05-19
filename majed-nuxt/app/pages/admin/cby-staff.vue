<script setup lang="ts">
import { DEMO_USERS, ROLE_LABELS } from '@/lib/mock'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
const staff = DEMO_USERS.filter((u) => ['platform_admin','support_member','executive_member','committee_manager'].includes(u.role))
</script>
<template>
  <div>
    <PageHeader title="مستخدمي النظام" subtitle="موظفو البنك المركزي" />
    <Card class="p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead><tr class="text-right text-xs text-muted-foreground border-b bg-muted/30"><th class="p-3">الاسم</th><th class="p-3">البريد</th><th class="p-3">الدور</th></tr></thead>
        <tbody>
          <tr v-for="u in staff" :key="u.id" class="border-b last:border-0">
            <td class="p-3 font-medium">{{ u.name }}</td>
            <td class="p-3 text-xs">{{ u.email }}</td>
            <td class="p-3 text-xs">{{ ROLE_LABELS[u.role] }}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>