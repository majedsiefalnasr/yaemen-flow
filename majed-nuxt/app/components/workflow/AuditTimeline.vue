<script setup lang="ts">
import { computed } from 'vue'
import { Clock } from 'lucide-vue-next'
import { useCell } from '@/composables/useCell'
import { auditCell } from '@/lib/governance'
import { STAGE_LABELS } from '@/lib/mock'

const props = defineProps<{ refStr?: string; limit?: number }>()
const all = useCell(auditCell)
const entries = computed(() => all.value.filter((e) => !props.refStr || e.ref === props.refStr).slice(0, props.limit ?? 25))
</script>
<template>
  <div v-if="entries.length === 0" class="text-sm text-muted-foreground p-4">لا توجد إجراءات مسجلة بعد.</div>
  <ol v-else class="relative border-r-2 border-border pr-6 space-y-4">
    <li v-for="e in entries" :key="e.id" class="relative">
      <span class="absolute -right-[31px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
      <div class="rounded-lg border bg-card p-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="text-sm font-semibold">{{ e.action }}</div>
          <div class="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock class="h-3 w-3" /> {{ new Date(e.ts).toLocaleString('ar-EG') }}
          </div>
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          {{ e.userName }}
          <span v-if="e.fromStage && e.toStage"> — من «{{ STAGE_LABELS[e.fromStage] }}» إلى «{{ STAGE_LABELS[e.toStage] }}»</span>
        </div>
        <div v-if="e.notes" class="text-xs mt-1.5 bg-muted/40 rounded px-2 py-1">{{ e.notes }}</div>
      </div>
    </li>
  </ol>
</template>