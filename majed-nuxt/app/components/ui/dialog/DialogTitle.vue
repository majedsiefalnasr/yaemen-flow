<script setup lang="ts">
import { DialogTitle } from 'reka-ui'
import { cn } from '@/lib/utils'
defineProps<{ class?: string }>()
</script>
<template><DialogTitle :class="cn('text-lg font-semibold', $props.class)"><slot /></DialogTitle></template>