<script setup lang="ts">
import { useCell } from '@/composables/useCell'
import { entitiesCell } from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
const entities = useCell(entitiesCell)
</script>
<template>
  <div>
    <PageHeader title="إدارة البنوك" subtitle="البنوك التجارية المرخصة" />
    <Card class="p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead><tr class="text-right text-xs text-muted-foreground border-b bg-muted/30"><th class="p-3">الاسم</th><th class="p-3">SWIFT</th><th class="p-3">الترخيص</th><th class="p-3">الحالة</th></tr></thead>
        <tbody>
          <tr v-for="e in entities" :key="e.id" class="border-b last:border-0">
            <td class="p-3 font-medium">{{ e.name }}</td>
            <td class="p-3 font-mono text-xs">{{ e.swiftCode }}</td>
            <td class="p-3 font-mono text-xs">{{ e.licenseNo }}</td>
            <td class="p-3 text-xs">{{ e.status }}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>