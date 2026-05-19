<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useCell } from '@/composables/useCell'
import { requestsCell, auditCell } from '@/lib/governance'
import { displayStatusFor, progressForRole, ROLE_LABELS } from '@/lib/mock'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-vue-next'

const route = useRoute()
const id = computed(() => route.params.id as string)
const all = useCell(requestsCell)
const audit = useCell(auditCell)
const { user } = storeToRefs(useAuthStore())
const req = computed(() => all.value.find((r) => r.id === id.value))
const logs = computed(() => audit.value.filter((a) => a.requestId === id.value).slice().reverse())
</script>

<template>
  <div v-if="user && req">
    <PageHeader :title="`طلب ${req.ref}`" :subtitle="req.importer"
      :breadcrumbs="[{ label: 'الطلبات', to: '/requests' }, { label: req.ref }]" />

    <div v-if="req.stage === 'support_returned' && req.returnReason" class="mb-4 p-4 rounded-lg border-2 border-warning bg-warning/10">
      <div class="flex items-start gap-3">
        <AlertTriangle class="h-5 w-5 text-warning mt-0.5" />
        <div>
          <div class="font-semibold text-warning">طلب مُعاد للمراجعة</div>
          <div class="text-sm mt-1">السبب: {{ req.returnReason }}</div>
        </div>
      </div>
    </div>

    <div v-if="req.stage === 'executive_rejected' && req.rejectReason" class="mb-4 p-4 rounded-lg border-2 border-destructive bg-destructive/10">
      <div class="flex items-start gap-3">
        <AlertTriangle class="h-5 w-5 text-destructive mt-0.5" />
        <div>
          <div class="font-semibold text-destructive">طلب مرفوض</div>
          <div class="text-sm mt-1">السبب: {{ req.rejectReason }}</div>
        </div>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <Card class="p-5 lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">تفاصيل الطلب</h3>
          <Badge :class="displayStatusFor(req.stage, user.role).color">{{ displayStatusFor(req.stage, user.role).label }}</Badge>
        </div>
        <Progress :value="progressForRole(req.stage, user.role)" />
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div><dt class="text-muted-foreground">المستورد</dt><dd class="font-medium">{{ req.importer }}</dd></div>
          <div><dt class="text-muted-foreground">المبلغ</dt><dd class="font-medium tabular-nums">{{ req.amount.toLocaleString('en-US') }} {{ req.currency }}</dd></div>
          <div><dt class="text-muted-foreground">المورّد</dt><dd class="font-medium">{{ req.supplier }}</dd></div>
          <div><dt class="text-muted-foreground">السلعة</dt><dd class="font-medium">{{ req.category }}</dd></div>
          <div><dt class="text-muted-foreground">البنك</dt><dd class="font-medium">{{ req.bankName }}</dd></div>
          <div><dt class="text-muted-foreground">تاريخ الإنشاء</dt><dd class="font-medium">{{ req.createdAt }}</dd></div>
        </dl>
        <div class="text-xs text-muted-foreground border-t pt-3">
          هذا عرض مبسّط — الإجراءات التفاعلية (تقديم/مراجعة/سويفت/تصويت) متاحة في النسخة الكاملة.
        </div>
      </Card>

      <Card class="p-5">
        <h3 class="font-semibold mb-3">سجل العمليات</h3>
        <div class="space-y-3">
          <div v-for="l in logs" :key="l.id" class="text-xs border-r-2 border-muted pr-3 pb-2">
            <div class="font-medium">{{ l.action }}</div>
            <div class="text-muted-foreground">{{ l.actorName }} ({{ ROLE_LABELS[l.actorRole] }})</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">{{ l.at }}</div>
            <div v-if="l.note" class="text-[11px] mt-1 text-muted-foreground italic">{{ l.note }}</div>
          </div>
          <div v-if="logs.length === 0" class="text-xs text-muted-foreground">لا يوجد سجل.</div>
        </div>
      </Card>
    </div>
  </div>
  <div v-else class="p-8 text-center text-muted-foreground">الطلب غير موجود.</div>
</template>