<script setup lang="ts">
import { SelectContent, SelectPortal, SelectViewport } from 'reka-ui'
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
</script>
<template>
  <SelectPortal>
    <SelectContent position="popper" :class="cn('relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md', $props.class)">
      <SelectViewport class="p-1"><slot /></SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>