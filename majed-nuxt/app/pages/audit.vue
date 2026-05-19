<script setup lang="ts">
import { useCell } from '@/composables/useCell'
import { auditCell } from '@/lib/governance'
import { ROLE_LABELS } from '@/lib/mock'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
const audit = useCell(auditCell)
</script>
<template>
  <div>
    <PageHeader title="التدقيق والامتثال" subtitle="كل العمليات الحساسة" />
    <Card class="p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead><tr class="text-right text-xs text-muted-foreground border-b bg-muted/30">
          <th class="p-3">الوقت</th><th class="p-3">المستخدم</th><th class="p-3">الدور</th><th class="p-3">الإجراء</th><th class="p-3">المرجع</th>
        </tr></thead>
        <tbody>
          <tr v-for="a in audit.slice().reverse()" :key="a.id" class="border-b last:border-0">
            <td class="p-3 text-xs">{{ a.ts }}</td>
            <td class="p-3">{{ a.userName }}</td>
            <td class="p-3 text-xs">{{ ROLE_LABELS[a.role] }}</td>
            <td class="p-3">{{ a.action }}</td>
            <td class="p-3 font-mono text-xs">{{ a.ref ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>