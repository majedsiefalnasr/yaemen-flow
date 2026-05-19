<script setup lang="ts">
import { DropdownMenuItem } from 'reka-ui'
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
</script>
<template>
  <DropdownMenuItem
    v-bind="$attrs"
    :class="cn('relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground', $props.class)"
  ><slot /></DropdownMenuItem>
</template>