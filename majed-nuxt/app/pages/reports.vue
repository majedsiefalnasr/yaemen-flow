<script setup lang="ts">
import { computed } from 'vue'
import { useCell } from '@/composables/useCell'
import { requestsCell } from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
const all = useCell(requestsCell)
const stats = computed(() => { const m = new Map<string, number>(); for (const r of all.value) m.set(r.stage, (m.get(r.stage) ?? 0) + 1); return Array.from(m.entries()) })
const total = computed(() => all.value.reduce((s, r) => s + r.amount, 0))
</script>
<template>
  <div>
    <PageHeader title="التقارير والتحليلات" subtitle="مؤشرات الأداء" />
    <div class="grid gap-4 md:grid-cols-3 mb-4">
      <Card class="p-5"><div class="text-sm text-muted-foreground">إجمالي الطلبات</div><div class="text-2xl font-bold mt-2">{{ all.length }}</div></Card>
      <Card class="p-5"><div class="text-sm text-muted-foreground">إجمالي المبالغ</div><div class="text-2xl font-bold mt-2 tabular-nums">{{ total.toLocaleString('en-US') }}</div></Card>
      <Card class="p-5"><div class="text-sm text-muted-foreground">المراحل النشطة</div><div class="text-2xl font-bold mt-2">{{ stats.length }}</div></Card>
    </div>
    <Card class="p-5">
      <h3 class="font-semibold mb-3">توزيع الطلبات حسب المرحلة</h3>
      <div class="space-y-2">
        <div v-for="[s, c] in stats" :key="s" class="flex items-center gap-3">
          <div class="text-xs w-48 truncate">{{ s }}</div>
          <div class="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div class="h-full bg-primary" :style="{ width: `${(c / all.length) * 100}%` }" /></div>
          <div class="text-xs tabular-nums w-10 text-left">{{ c }}</div>
        </div>
      </div>
    </Card>
  </div>
</template>