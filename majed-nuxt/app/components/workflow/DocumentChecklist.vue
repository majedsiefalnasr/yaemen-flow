<script setup lang="ts">
import { computed } from 'vue'
import { Check, AlertCircle, FileText } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { useCell } from '@/composables/useCell'
import { docRulesCell } from '@/lib/governance'
import { STAGE_LABELS, type RequestStage } from '@/lib/mock'
import { cn } from '@/lib/utils'
const props = defineProps<{ stage: RequestStage; uploaded: string[] }>()
const allRules = useCell(docRulesCell)
const rules = computed(() => allRules.value.filter((r) => r.stage === props.stage))
const missing = computed(() => rules.value.filter((r) => r.required && !props.uploaded.includes(r.name)).length)
</script>
<template>
  <div v-if="rules.length === 0" class="text-xs text-muted-foreground p-3 border rounded-md">
    لا توجد قواعد مستندات معرّفة لمرحلة {{ STAGE_LABELS[stage] }}.
  </div>
  <div v-else class="space-y-2">
    <div class="flex items-center justify-between text-xs">
      <span class="text-muted-foreground">قواعد المستندات لمرحلة {{ STAGE_LABELS[stage] }}</span>
      <Badge v-if="missing > 0" class="bg-destructive/15 text-destructive border-0">
        <AlertCircle class="h-3 w-3 ml-1" /> ينقص {{ missing }} مستند مطلوب
      </Badge>
      <Badge v-else class="bg-success/15 text-success border-0">
        <Check class="h-3 w-3 ml-1" /> مكتمل
      </Badge>
    </div>
    <div class="space-y-1.5">
      <div v-for="r in rules" :key="r.id"
        :class="cn('flex items-center gap-2 p-2.5 rounded-md border text-sm',
          uploaded.includes(r.name) && 'border-success/30 bg-success/5',
          !uploaded.includes(r.name) && r.required && 'border-destructive/30 bg-destructive/5',
          !uploaded.includes(r.name) && !r.required && 'border-border bg-muted/20')">
        <div :class="cn('h-7 w-7 rounded grid place-items-center', uploaded.includes(r.name) ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')">
          <Check v-if="uploaded.includes(r.name)" class="h-3.5 w-3.5" />
          <FileText v-else class="h-3.5 w-3.5" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-xs">{{ r.name }}</div>
          <div class="text-[10px] text-muted-foreground">{{ r.fileTypes.join(', ') }} · حد أدنى {{ r.minCount }}</div>
        </div>
        <Badge variant="outline" class="text-[10px]">{{ r.required ? 'مطلوب' : 'اختياري' }}</Badge>
      </div>
    </div>
  </div>
</template>