<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { dbResetAll } from '@/lib/db'
import { toast } from 'vue-sonner'
const auth = useAuthStore()
function reset() { dbResetAll(); toast.success('تمت إعادة الضبط'); setTimeout(() => location.reload(), 500) }
</script>
<template>
  <div>
    <PageHeader title="إعدادات النظام" subtitle="التفضيلات والأدوات" />
    <div class="grid gap-4 md:grid-cols-2">
      <Card class="p-5 space-y-4">
        <h3 class="font-semibold">المظهر</h3>
        <div class="flex items-center justify-between"><Label>الوضع الداكن</Label>
          <Switch :model-value="auth.theme === 'dark'" @update:model-value="auth.toggleTheme()" /></div>
      </Card>
      <Card class="p-5 space-y-4">
        <h3 class="font-semibold">بيانات العرض</h3>
        <p class="text-xs text-muted-foreground">إعادة تعيين كل البيانات المحلية.</p>
        <Button variant="destructive" @click="reset">إعادة ضبط البيانات</Button>
      </Card>
    </div>
  </div>
</template>