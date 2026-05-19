<script setup lang="ts">
import { computed } from 'vue'
import { useCell } from '@/composables/useCell'
import { requestsCell } from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
const all = useCell(requestsCell)
const list = computed(() => all.value.filter((r) => r.stage === 'executive_approved' || r.stage === 'customs_released'))
</script>
<template>
  <div>
    <PageHeader title="إذن إصدار بيان جمركي" subtitle="الطلبات الجاهزة للإفراج" />
    <Card class="p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead><tr class="text-right text-xs text-muted-foreground border-b bg-muted/30"><th class="p-3">المرجع</th><th class="p-3">المستورد</th><th class="p-3">المبلغ</th><th class="p-3">الحالة</th><th class="p-3 text-left">إجراء</th></tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id" class="border-b last:border-0">
            <td class="p-3 font-mono text-xs">{{ r.ref }}</td>
            <td class="p-3">{{ r.importer }}</td>
            <td class="p-3 tabular-nums">{{ r.amount.toLocaleString('en-US') }} {{ r.currency }}</td>
            <td class="p-3 text-xs">{{ r.stage }}</td>
            <td class="p-3 text-left"><Button as="a" variant="outline" size="sm"><NuxtLink :to="`/requests/${r.id}`">عرض</NuxtLink></Button></td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>