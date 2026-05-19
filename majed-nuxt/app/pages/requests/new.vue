<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { requestsCell } from '@/lib/governance'
import { useAuthStore } from '@/stores/auth'
import { progressFor } from '@/lib/mock'

const router = useRouter()
const auth = useAuthStore()
const importer = ref('')
const supplier = ref('')
const amount = ref(0)
const currency = ref('USD')
const category = ref('')
const notes = ref('')

function submit(e: Event) {
  e.preventDefault()
  const id = `r-${Date.now()}`
  const u = auth.user
  requestsCell.set([...requestsCell.get(), {
    id, ref: `IMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    importer: importer.value, supplier: supplier.value,
    amount: amount.value, currency: currency.value as 'USD' | 'EUR' | 'SAR',
    type: category.value || 'أخرى',
    entityId: 'e1', bank: 'البنك اليمني للإنشاء والتعمير',
    invoice: `INV-${Date.now()}`, port: 'ميناء عدن',
    stage: 'draft', createdAt: new Date().toISOString(),
    progress: progressFor('draft'), risk: 'low',
    intakeUserId: u?.id ?? '', createdBy: u?.id ?? '', lastUpdatedBy: u?.id ?? '',
  }])
  toast.success('تم حفظ المسودة')
  router.push(`/requests/${id}`)
}
</script>

<template>
  <div>
    <PageHeader title="طلب تمويل جديد" subtitle="إنشاء مسودة طلب تمويل وارد" />
    <Card class="p-6">
      <form @submit="submit" class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2"><Label>اسم المستورد</Label><Input v-model="importer" required /></div>
        <div class="space-y-2"><Label>اسم المورّد</Label><Input v-model="supplier" required /></div>
        <div class="space-y-2"><Label>المبلغ</Label><Input type="number" v-model.number="amount" required /></div>
        <div class="space-y-2"><Label>العملة</Label><Input v-model="currency" /></div>
        <div class="space-y-2 sm:col-span-2"><Label>السلعة / الفئة</Label><Input v-model="category" /></div>
        <div class="space-y-2 sm:col-span-2"><Label>ملاحظات</Label><Textarea v-model="notes" :rows="4" /></div>
        <div class="sm:col-span-2 flex justify-end gap-2 border-t pt-4">
          <Button as="a" variant="outline"><NuxtLink to="/requests">إلغاء</NuxtLink></Button>
          <Button type="submit">حفظ المسودة</Button>
        </div>
      </form>
    </Card>
  </div>
</template>