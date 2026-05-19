<script setup lang="ts">
import { DropdownMenuContent, DropdownMenuPortal } from 'reka-ui'
import { cn } from '@/lib/utils'
defineProps<{ class?: string; align?: 'start' | 'center' | 'end'; sideOffset?: number }>()
</script>
<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      :align="align ?? 'end'"
      :side-offset="sideOffset ?? 4"
      :class="cn('z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md', $props.class)"
    ><slot /></DropdownMenuContent>
  </DropdownMenuPortal>
</template>