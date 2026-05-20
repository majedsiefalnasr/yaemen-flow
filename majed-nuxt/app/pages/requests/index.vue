<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useCell } from '@/composables/useCell'
import { requestsCell } from '@/lib/governance'
import { queueRequestsFor, displayStatusFor, progressForRole } from '@/lib/mock'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'

const { user } = storeToRefs(useAuthStore())
const all = useCell(requestsCell)
const q = ref('')
const list = computed(() => {
  if (!user.value) return []
  const v = queueRequestsFor(user.value, all.value)
  if (!q.value) return v
  const s = q.value.toLowerCase()
  return v.filter((r) => r.ref.toLowerCase().includes(s) || r.importer.toLowerCase().includes(s))
})
</script>

<template>
  <div v-if="user">
    <PageHeader title="طلبات التمويل" subtitle="عرض كل الطلبات في نطاق صلاحياتك" />
    <Card class="p-4 mb-4">
      <Input v-model="q" placeholder="ابحث بالمرجع أو اسم المستورد..." />
    </Card>
    <Card class="p-0 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-right text-xs text-muted-foreground border-b bg-muted/30">
            <th class="p-3 font-medium">المرجع</th>
            <th class="p-3 font-medium">المستورد</th>
            <th class="p-3 font-medium">المبلغ</th>
            <th class="p-3 font-medium">الحالة</th>
            <th class="p-3 font-medium">التقدم</th>
            <th class="p-3 font-medium text-left">إجراء</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in list" :key="r.id" class="border-b last:border-0 hover:bg-muted/40">
            <td class="p-3"><NuxtLink :to="`/requests/${r.id}`" class="font-mono text-xs text-accent hover:underline">{{ r.ref }}</NuxtLink></td>
            <td class="p-3">{{ r.importer }}</td>
            <td class="p-3 font-semibold tabular-nums">{{ r.amount.toLocaleString('en-US') }} {{ r.currency }}</td>
            <td class="p-3"><Badge :class="displayStatusFor(r.stage, user.role).color">{{ displayStatusFor(r.stage, user.role).label }}</Badge></td>
            <td class="p-3 w-40"><Progress :value="progressForRole(r.stage, user.role)" class="h-1.5" /></td>
            <td class="p-3 text-left">
              <Button as="a" variant="outline" size="sm">
                <NuxtLink :to="`/requests/${r.id}`">فتح</NuxtLink>
              </Button>
            </td>
          </tr>
          <tr v-if="list.length === 0"><td colspan="6" class="text-center py-12 text-muted-foreground">لا توجد طلبات.</td></tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>