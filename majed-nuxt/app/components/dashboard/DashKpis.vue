<script setup lang="ts">
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
defineProps<{ kpis: { label: string; value: number | string; icon: any; tone: string; href?: string }[] }>()
</script>
<template>
  <div :class="cn('grid gap-4 grid-cols-2', kpis.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')">
    <component :is="k.href ? 'NuxtLink' : 'div'" v-for="k in kpis" :key="k.label" :to="k.href">
      <Card class="p-5 shadow-card border-0 hover:shadow-md transition-shadow h-full">
        <div :class="cn('h-10 w-10 rounded-xl grid place-items-center', k.tone)">
          <component :is="k.icon" class="h-5 w-5" />
        </div>
        <div class="mt-4">
          <div class="text-2xl font-bold tracking-tight">
            {{ typeof k.value === 'number' ? k.value.toLocaleString('en-US') : k.value }}
          </div>
          <div class="text-sm text-muted-foreground">{{ k.label }}</div>
        </div>
      </Card>
    </component>
  </div>
</template>
