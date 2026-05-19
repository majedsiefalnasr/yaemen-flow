<script setup lang="ts">
import { useCell } from '@/composables/useCell'
import { docRulesCell } from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
const rules = useCell(docRulesCell)
</script>
<template>
  <div>
    <PageHeader title="قواعد المستندات" subtitle="المستندات المطلوبة لكل مرحلة" />
    <Card class="p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead><tr class="text-right text-xs text-muted-foreground border-b bg-muted/30"><th class="p-3">المرحلة</th><th class="p-3">المستند</th><th class="p-3">إلزامي</th><th class="p-3">الأنواع</th><th class="p-3">الحد الأدنى</th></tr></thead>
        <tbody>
          <tr v-for="r in rules" :key="r.id" class="border-b last:border-0">
            <td class="p-3 text-xs">{{ r.stage }}</td>
            <td class="p-3 font-medium">{{ r.name }}</td>
            <td class="p-3"><Badge :variant="r.required ? 'default' : 'secondary'">{{ r.required ? 'نعم' : 'لا' }}</Badge></td>
            <td class="p-3 text-xs">{{ r.fileTypes.join(', ') }}</td>
            <td class="p-3 tabular-nums">{{ r.minCount }}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>