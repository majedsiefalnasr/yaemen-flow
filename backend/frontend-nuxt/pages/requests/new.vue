<script setup lang="ts">
import { z } from 'zod'
definePageMeta({ middleware: ['auth', 'role'], roles: ['commercial_bank', 'exchange'] })

const api = useApi()
const merchants = ref<any[]>([])
onMounted(async () => { merchants.value = (await api.get('/merchants')).data })

const form = reactive({
  merchant_id: '', bank: '', amount: 0, currency: 'USD',
  goods_type: '', supplier: '', invoice_number: '', port: '', notes: '',
})
const files = ref<File[]>([])
const error = ref(''); const success = ref(''); const loading = ref(false)

const schema = z.object({
  merchant_id: z.string().min(1, 'اختر التاجر'),
  bank: z.string().min(2, 'اسم البنك مطلوب'),
  amount: z.number().min(1, 'المبلغ مطلوب'),
  currency: z.enum(['USD', 'EUR', 'SAR']),
  goods_type: z.string().min(1, 'نوع البضاعة مطلوب'),
  supplier: z.string().min(2, 'المورد مطلوب'),
  invoice_number: z.string().min(1, 'رقم الفاتورة مطلوب'),
  port: z.string().min(1, 'الميناء مطلوب'),
})

async function submit() {
  error.value = success.value = ''
  const parsed = schema.safeParse({ ...form, amount: Number(form.amount) })
  if (!parsed.success) { error.value = parsed.error.issues[0].message; return }
  loading.value = true
  try {
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
    files.value.forEach(f => fd.append('documents[]', f))
    const res = await api.upload('/requests', fd)
    success.value = `تم إنشاء الطلب ${res.data?.reference || ''}`
    setTimeout(() => navigateTo(`/requests/${res.data?.id || res.id}`), 800)
  } catch (e: any) {
    error.value = e?.data?.message || 'فشل إنشاء الطلب'
  } finally { loading.value = false }
}
</script>

<template>
  <div class="max-w-3xl">
    <h1 class="text-2xl font-bold mb-6">طلب تمويل واردات جديد</h1>
    <form @submit.prevent="submit" class="card space-y-4">
      <div class="grid md:grid-cols-2 gap-4">
        <div><label class="label">التاجر</label>
          <select v-model="form.merchant_id" class="input" required>
            <option value="">اختر</option>
            <option v-for="m in merchants" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div><label class="label">البنك</label><input v-model="form.bank" class="input" required /></div>
        <div><label class="label">المبلغ</label><input v-model.number="form.amount" type="number" class="input" required /></div>
        <div><label class="label">العملة</label>
          <select v-model="form.currency" class="input"><option>USD</option><option>EUR</option><option>SAR</option></select>
        </div>
        <div><label class="label">نوع البضاعة</label><input v-model="form.goods_type" class="input" required /></div>
        <div><label class="label">المورد</label><input v-model="form.supplier" class="input" required /></div>
        <div><label class="label">رقم الفاتورة</label><input v-model="form.invoice_number" class="input" required /></div>
        <div><label class="label">الميناء</label><input v-model="form.port" class="input" required /></div>
      </div>
      <div><label class="label">ملاحظات</label><textarea v-model="form.notes" class="input" rows="3"></textarea></div>
      <div><label class="label">مرفقات (PDF/صور، حد أقصى 10MB)</label>
        <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" @change="(e: any) => files = Array.from(e.target.files)" class="input" />
      </div>
      <div v-if="error" class="text-sm text-danger bg-red-50 p-3 rounded">{{ error }}</div>
      <div v-if="success" class="text-sm text-success bg-green-50 p-3 rounded">{{ success }}</div>
      <button :disabled="loading" class="btn-primary">{{ loading ? '...' : 'تقديم الطلب' }}</button>
    </form>
  </div>
</template>
