<script setup lang="ts">
import { SelectTrigger, SelectIcon } from 'reka-ui'
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
</script>
<template>
  <SelectTrigger :class="cn('flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm', $props.class)">
    <slot />
    <SelectIcon><ChevronDown class="h-4 w-4 opacity-50" /></SelectIcon>
  </SelectTrigger>
</template>