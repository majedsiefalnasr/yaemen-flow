<script setup lang="ts">
import { useCell } from '@/composables/useCell'
import { notificationsCell, markAllRead } from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-vue-next'
const notifs = useCell(notificationsCell)
</script>
<template>
  <div>
    <PageHeader title="الإشعارات" subtitle="آخر التحديثات">
      <template #actions><Button variant="outline" @click="markAllRead">قراءة الكل</Button></template>
    </PageHeader>
    <Card class="divide-y">
      <div v-for="n in notifs" :key="n.id" class="p-4 flex gap-3 hover:bg-muted/40">
        <Bell class="h-4 w-4 mt-1 shrink-0" :class="n.unread ? 'text-accent' : 'text-muted-foreground'" />
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm">{{ n.title }}</div>
          <div class="text-xs text-muted-foreground">{{ n.body }}</div>
          <div class="text-[10px] text-muted-foreground mt-1">{{ n.time }}</div>
        </div>
      </div>
      <div v-if="notifs.length === 0" class="p-8 text-center text-muted-foreground">لا توجد إشعارات.</div>
    </Card>
  </div>
</template>