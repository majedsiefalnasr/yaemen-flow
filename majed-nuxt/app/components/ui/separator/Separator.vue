<script setup lang="ts">
import { cn } from '@/lib/utils'
defineProps<{ orientation?: 'horizontal' | 'vertical'; class?: string }>()
</script>
<template>
  <div role="separator" :class="cn('bg-border shrink-0', orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full', $props.class)" />
</template>