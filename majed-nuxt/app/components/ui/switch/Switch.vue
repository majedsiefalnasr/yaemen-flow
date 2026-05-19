<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { cn } from '@/lib/utils'
const props = defineProps<{ modelValue?: boolean; class?: string; disabled?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>
<template>
  <SwitchRoot
    :checked="modelValue"
    @update:checked="(v) => emit('update:modelValue', v)"
    :disabled="disabled"
    :class="cn('peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input', $props.class)"
  >
    <SwitchThumb class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[-1rem] data-[state=unchecked]:translate-x-0" />
  </SwitchRoot>
</template>