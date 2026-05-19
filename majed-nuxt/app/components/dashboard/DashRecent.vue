<script setup lang="ts">
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowUpRight, Inbox, Vote } from 'lucide-vue-next'
import { displayStatusFor, progressForRole, type ImportRequest, type Role } from '@/lib/mock'
import { cn } from '@/lib/utils'
const props = withDefaults(defineProps<{
  rows: ImportRequest[]; role: Role
  title?: string; emptyText?: string
}>(), { title: 'أحدث الطلبات', emptyText: 'لا توجد طلبات بعد.' })
</script>
<template>
  <Card class="p-5 shadow-card border-0 min-w-0 overflow-hidden">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold">{{ title }}</h3>
      <NuxtLink to="/requests" class="text-xs text-accent hover:underline flex items-center gap-1">
        عرض الكل <ArrowUpRight class="h-3 w-3" />
      </NuxtLink>
    </div>
    <div v-if="rows.length === 0" class="text-center py-8 text-sm text-muted-foreground">
      <Inbox class="h-8 w-8 mx-auto opacity-50 mb-2" /> {{ emptyText }}
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm min-w-[720px]">
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
          <tr v-for="r in rows" :key="r.id" class="border-b last:border-0 hover:bg-muted/40">
            <td class="py-3 align-top">
              <div class="flex items-center gap-1.5 flex-wrap">
                <NuxtLink :to="`/requests/${r.id}`" class="font-mono text-xs text-accent hover:underline">{{ r.ref }}</NuxtLink>
                <Badge v-if="r.stage === 'executive_voting' && (role === 'executive_member' || role === 'committee_manager')"
                  class="gap-1 text-[10px] py-0 px-1.5 bg-chart-5/15 text-chart-5 animate-pulse">
                  <Vote class="h-2.5 w-2.5" /> تصويت مفتوح
                </Badge>
              </div>
            </td>
            <td class="py-3 truncate align-top">{{ r.importer }}</td>
            <td class="py-3 font-semibold tabular-nums align-top whitespace-nowrap">
              {{ r.amount.toLocaleString('en-US') }} <span class="text-xs text-muted-foreground">{{ r.currency }}</span>
            </td>
            <td class="py-3 align-top whitespace-nowrap">
              <Badge :class="cn('font-normal whitespace-nowrap', displayStatusFor(r.stage, role).color)">
                {{ displayStatusFor(r.stage, role).label }}
              </Badge>
            </td>
            <td class="py-3 align-top">
              <Progress :value="progressForRole(r.stage, role)" class="h-1.5" />
              <div class="text-[10px] text-muted-foreground mt-1">{{ progressForRole(r.stage, role) }}%</div>
            </td>
            <td class="py-3 text-left align-top">
              <NuxtLink :to="`/requests/${r.id}`">
                <Button variant="ghost" size="sm" class="h-7 text-xs">عرض</Button>
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
