<script setup lang="ts">
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ListChecks } from 'lucide-vue-next'
defineProps<{ actions: { label: string; icon: any; href: string; tone?: string; primary?: boolean; description?: string }[] }>()
</script>
<template>
  <Card class="p-5 shadow-card border-0">
    <h3 class="font-semibold mb-4 flex items-center gap-2"><ListChecks class="h-4 w-4" /> إجراءات سريعة</h3>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink v-for="a in actions" :key="a.label" :to="a.href">
        <div :class="cn('p-4 rounded-lg border transition-all hover:border-accent/60 hover:shadow-sm h-full', a.primary && 'border-accent/40 bg-accent/5')">
          <div class="flex items-start gap-3">
            <div :class="cn('h-9 w-9 rounded-lg grid place-items-center shrink-0', a.tone ?? 'bg-primary/10 text-primary')">
              <component :is="a.icon" class="h-4 w-4" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm">{{ a.label }}</div>
              <div v-if="a.description" class="text-xs text-muted-foreground mt-0.5">{{ a.description }}</div>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>
  </Card>
</template>
