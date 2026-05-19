<script setup lang="ts">
import { cn } from '@/lib/utils'
const props = defineProps<{ value?: number; class?: string }>()
</script>
<template>
  <div :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', $props.class)">
    <div class="h-full bg-primary transition-all" :style="{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }" />
  </div>
</template>