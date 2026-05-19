<script setup lang="ts">
import { useCell } from '@/composables/useCell'
import { merchantsCell } from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
const merchants = useCell(merchantsCell)
</script>
<template>
  <div>
    <PageHeader title="إدارة التجار" subtitle="السجل المركزي للمستوردين" />
    <Card class="p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead><tr class="text-right text-xs text-muted-foreground border-b bg-muted/30"><th class="p-3">الاسم</th><th class="p-3">المعرّف</th></tr></thead>
        <tbody>
          <tr v-for="m in (merchants as any[])" :key="m.id" class="border-b last:border-0">
            <td class="p-3 font-medium">{{ m.name }}</td>
            <td class="p-3 font-mono text-xs">{{ m.id }}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>