<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useCell } from '@/composables/useCell'
import { requestsCell } from '@/lib/governance'
import { ROLE_LABELS, visibleRequestsFor, displayStatusFor, progressForRole } from '@/lib/mock'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { FileText, CheckCircle2, XCircle, Clock, RefreshCw, FilePlus2, Inbox, ArrowUpRight } from 'lucide-vue-next'

const { user } = storeToRefs(useAuthStore())
const all = useCell(requestsCell)
const scoped = computed(() => user.value ? visibleRequestsFor(user.value, all.value) : [])

function count(stages: string[]) { return scoped.value.filter((r) => stages.includes(r.stage)).length }
const kpis = computed(() => [
  { label: 'مسودات', value: count(['draft']), icon: FileText, tone: 'text-muted-foreground bg-muted' },
  { label: 'مُعاد للتعديل', value: count(['support_returned']), icon: RefreshCw, tone: 'text-warning bg-warning/10' },
  { label: 'قيد المعالجة', value: count(['bank_submitted','bank_internal_review','bank_approved','support_review','support_approved','swift_attached','executive_voting','executive_approved']), icon: Clock, tone: 'text-info bg-info/10' },
  { label: 'مكتمل', value: count(['customs_released','completed']), icon: CheckCircle2, tone: 'text-success bg-success/10' },
])
const recent = computed(() => scoped.value.slice(0, 8))
</script>

<template>
  <div v-if="user" class="space-y-6">
    <PageHeader :title="`أهلاً، ${user.name.split(' ')[0]} 👋`" :subtitle="`لوحة ${ROLE_LABELS[user.role]}`">
      <template v-if="user.role === 'bank_intake' || user.role === 'bank_admin'" #actions>
        <Button as="a"><NuxtLink to="/requests/new"><FilePlus2 class="h-4 w-4 ml-1 inline" /> طلب جديد</NuxtLink></Button>
      </template>
    </PageHeader>

    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card v-for="k in kpis" :key="k.label" class="p-5">
        <div :class="['h-10 w-10 rounded-xl grid place-items-center', k.tone]">
          <component :is="k.icon" class="h-5 w-5" />
        </div>
        <div class="mt-4">
          <div class="text-2xl font-bold tracking-tight">{{ k.value.toLocaleString('en-US') }}</div>
          <div class="text-sm text-muted-foreground">{{ k.label }}</div>
        </div>
      </Card>
    </div>

    <Card class="p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">أحدث الطلبات</h3>
        <NuxtLink to="/requests" class="text-xs text-accent hover:underline flex items-center gap-1">
          عرض الكل <ArrowUpRight class="h-3 w-3" />
        </NuxtLink>
      </div>
      <div v-if="recent.length === 0" class="text-center py-8 text-sm text-muted-foreground">
        <Inbox class="h-8 w-8 mx-auto opacity-50 mb-2" /> لا توجد طلبات بعد.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-right text-xs text-muted-foreground border-b">
              <th class="py-2.5 font-medium">المرجع</th>
              <th class="py-2.5 font-medium">المستورد</th>
              <th class="py-2.5 font-medium">المبلغ</th>
              <th class="py-2.5 font-medium">الحالة</th>
              <th class="py-2.5 font-medium">التقدم</th>
              <th class="py-2.5 font-medium text-left">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in recent" :key="r.id" class="border-b last:border-0 hover:bg-muted/40">
              <td class="py-3"><NuxtLink :to="`/requests/${r.id}`" class="font-mono text-xs text-accent hover:underline">{{ r.ref }}</NuxtLink></td>
              <td class="py-3 truncate">{{ r.importer }}</td>
              <td class="py-3 font-semibold tabular-nums whitespace-nowrap">{{ r.amount.toLocaleString('en-US') }} <span class="text-xs text-muted-foreground">{{ r.currency }}</span></td>
              <td class="py-3 whitespace-nowrap"><Badge :class="displayStatusFor(r.stage, user.role).color" class="font-normal">{{ displayStatusFor(r.stage, user.role).label }}</Badge></td>
              <td class="py-3"><Progress :value="progressForRole(r.stage, user.role)" class="h-1.5" /></td>
              <td class="py-3 text-left">
                <Button as="a" variant="ghost" size="sm" class="h-7 text-xs">
                  <NuxtLink :to="`/requests/${r.id}`">عرض</NuxtLink>
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>