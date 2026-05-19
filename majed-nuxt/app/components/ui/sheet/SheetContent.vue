<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogClose } from 'reka-ui'
import { X } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
const props = defineProps<{ class?: string; side?: 'right' | 'left' | 'top' | 'bottom' }>()
const sideClass = {
  right: 'inset-y-0 right-0 h-full w-3/4 sm:max-w-sm border-l',
  left: 'inset-y-0 left-0 h-full w-3/4 sm:max-w-sm border-r',
  top: 'inset-x-0 top-0 border-b',
  bottom: 'inset-x-0 bottom-0 border-t',
}
</script>
<template>
  <DialogPortal>
    <DialogOverlay class="fixed inset-0 z-50 bg-black/50" />
    <DialogContent :class="cn('fixed z-50 bg-background p-0 shadow-lg', sideClass[side ?? 'right'], $props.class)">
      <slot />
      <DialogClose class="absolute end-4 top-4 rounded-sm opacity-70 hover:opacity-100"><X class="h-4 w-4" /></DialogClose>
    </DialogContent>
  </DialogPortal>
</template>