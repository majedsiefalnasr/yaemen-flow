<script setup lang="ts">
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
</script>
<template>
  <div :class="cn('flex h-full w-full items-center justify-center rounded-full bg-muted', $props.class)"><slot /></div>
</template>