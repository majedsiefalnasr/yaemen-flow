<script setup lang="ts">
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
</script>
<template><div :class="cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2', $props.class)"><slot /></div></template>