<script setup lang="ts">
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
</script>
<template><div :class="cn('flex flex-col gap-1.5 text-center sm:text-right', $props.class)"><slot /></div></template>