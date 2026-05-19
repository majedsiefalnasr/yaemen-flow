<script setup lang="ts">
import { PopoverContent, PopoverPortal } from 'reka-ui'
import { cn } from '@/lib/utils'
defineProps<{ class?: string; align?: 'start' | 'center' | 'end'; sideOffset?: number }>()
</script>
<template>
  <PopoverPortal>
    <PopoverContent
      :align="align ?? 'center'"
      :side-offset="sideOffset ?? 4"
      :class="cn('z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none', $props.class)"
    ><slot /></PopoverContent>
  </PopoverPortal>
</template>