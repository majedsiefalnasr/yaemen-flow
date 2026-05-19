<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ShieldAlert } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'
import { can, type Permission } from '@/lib/governance'
import type { Role } from '@/lib/mock'
const props = defineProps<{ allow?: Role[]; perm?: Permission; message?: string }>()
const { user } = storeToRefs(useAuthStore())
const allowed = computed(() => {
  if (!user.value) return false
  if (props.perm) return can(user.value.role, props.perm)
  if (props.allow) return props.allow.includes(user.value.role)
  return true
})
</script>
<template>
  <slot v-if="allowed" />
  <div v-else-if="user" class="p-6">
    <Card class="p-8 border-0 flex items-start gap-4">
      <div class="h-12 w-12 rounded-xl grid place-items-center bg-destructive/10 text-destructive">
        <ShieldAlert class="h-6 w-6" />
      </div>
      <div>
        <div class="text-lg font-semibold mb-1">غير مصرّح بالوصول</div>
        <div class="text-sm text-muted-foreground">{{ message ?? 'هذه الصفحة غير متاحة لدورك التشغيلي.' }}</div>
      </div>
    </Card>
  </div>
</template>