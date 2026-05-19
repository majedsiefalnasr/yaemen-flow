<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS } from '@/lib/mock'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
const { user } = storeToRefs(useAuthStore())
</script>
<template>
  <div v-if="user">
    <PageHeader title="الملف الشخصي" subtitle="بيانات الحساب" />
    <Card class="p-6">
      <div class="flex items-center gap-4">
        <div class="grid h-20 w-20 place-items-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">{{ user.avatar }}</div>
        <div>
          <div class="text-xl font-bold">{{ user.name }}</div>
          <div class="text-sm text-muted-foreground">{{ user.email }}</div>
          <div class="text-xs text-muted-foreground mt-1">{{ ROLE_LABELS[user.role] }} — {{ user.org }}</div>
        </div>
      </div>
    </Card>
  </div>
</template>