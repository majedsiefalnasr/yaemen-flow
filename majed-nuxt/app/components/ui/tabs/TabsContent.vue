<script setup lang="ts">
import { TabsContent } from 'reka-ui'
import { cn } from '@/lib/utils'
defineProps<{ class?: string; value: string }>()
</script>
<template><TabsContent :value="value" :class="cn('mt-2 outline-none', $props.class)"><slot /></TabsContent></template>