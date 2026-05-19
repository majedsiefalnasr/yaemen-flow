<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Check } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { STAGE_LABELS, STAGE_ORDER, bucketsFor, type ImportRequest, type RequestStage } from '@/lib/mock'
import { cn } from '@/lib/utils'

const props = defineProps<{ req: ImportRequest; compact?: boolean }>()
const { user } = storeToRefs(useAuthStore())
const RETURN_STAGES: RequestStage[] = ['support_returned']
const REJECT_STAGES: RequestStage[] = ['support_rejected', 'executive_rejected']
const TERMINAL_DONE: RequestStage[] = ['completed', 'customs_released']

const isReturn = computed(() => RETURN_STAGES.includes(props.req.stage))
const isReject = computed(() => REJECT_STAGES.includes(props.req.stage))

const steps = computed(() => {
  const role = user.value?.role ?? null
  if (role && role !== 'platform_admin') {
    return bucketsFor(role)
      .filter((b) => !b.stages.every((s) => REJECT_STAGES.includes(s) || RETURN_STAGES.includes(s)))
      .map((b) => ({ key: b.key, label: b.label, stages: b.stages }))
  }
  return STAGE_ORDER.filter((s) => !REJECT_STAGES.includes(s) && !RETURN_STAGES.includes(s))
    .map((s) => ({ key: s, label: STAGE_LABELS[s], stages: [s] }))
})
const currentIdx = computed(() => steps.value.findIndex((s) => s.stages.includes(props.req.stage)))
const completedAll = computed(() => TERMINAL_DONE.includes(props.req.stage) || (currentIdx.value >= 0 && currentIdx.value === steps.value.length - 1 && !isReject.value && !isReturn.value))
</script>
<template>
  <div class="rounded-2xl border bg-card p-5">
    <div class="flex items-center justify-between mb-4">
      <div class="text-sm font-semibold">سير العملية التنظيمية</div>
      <span v-if="isReturn || isReject" :class="cn('text-[10px] px-2 py-0.5 rounded-full font-medium', isReturn && 'bg-warning/15 text-warning', isReject && 'bg-destructive/15 text-destructive')">
        {{ isReturn ? 'مُعاد للتعديل' : 'مرفوض' }}
      </span>
    </div>
    <ol class="relative">
      <li v-for="(step, i) in steps" :key="step.key" :class="cn('relative flex items-start gap-3', i !== steps.length - 1 && 'pb-5')">
        <span v-if="i !== steps.length - 1" aria-hidden :class="cn('absolute top-7 right-[11px] w-px h-[calc(100%-1.25rem)]', (completedAll || (currentIdx >= 0 && i < currentIdx)) ? 'bg-foreground/80' : 'bg-border')" />
        <div class="relative z-10 shrink-0 w-[22px] h-[22px] flex items-center justify-center">
          <span v-if="completedAll || (currentIdx >= 0 && i < currentIdx)" class="w-[22px] h-[22px] rounded-full bg-foreground text-background grid place-items-center">
            <Check class="h-3 w-3" :stroke-width="3" />
          </span>
          <span v-else-if="!completedAll && i === currentIdx" :class="cn('w-[22px] h-[22px] rounded-full grid place-items-center', isReject ? 'bg-destructive/15 ring-2 ring-destructive' : 'bg-foreground ring-4 ring-foreground/15')">
            <span :class="cn('w-2 h-2 rounded-full', isReject ? 'bg-destructive' : 'bg-background')" />
          </span>
          <span v-else class="w-[22px] h-[22px] rounded-full border-2 border-border bg-muted/40" />
        </div>
        <div class="flex-1 -mt-0.5">
          <div :class="cn('text-sm leading-snug', i === currentIdx ? 'font-semibold text-foreground' : (completedAll || i < currentIdx) ? 'text-foreground' : 'text-muted-foreground')">{{ step.label }}</div>
          <div v-if="!compact" :class="cn('text-[11px] mt-0.5 leading-tight',
            i === currentIdx ? (isReject ? 'text-destructive' : 'text-primary')
            : (completedAll || i < currentIdx) ? 'text-success' : 'text-muted-foreground/70')">
            <template v-if="i === currentIdx">{{ isReject ? 'مرفوض في هذه المرحلة' : 'المرحلة الحالية' }}</template>
            <template v-else-if="completedAll || i < currentIdx">مكتملة</template>
            <template v-else>بانتظار</template>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>