<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; breadcrumbs?: { label: string; to?: string }[] }>()
</script>
<template>
  <div class="mb-6">
    <nav v-if="breadcrumbs" class="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
      <template v-for="(b, i) in breadcrumbs" :key="i">
        <span v-if="i > 0">/</span>
        <NuxtLink v-if="b.to" :to="b.to" class="hover:text-foreground">{{ b.label }}</NuxtLink>
        <span v-else>{{ b.label }}</span>
      </template>
    </nav>
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-muted-foreground mt-1">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2"><slot name="actions" /></div>
    </div>
  </div>
</template>