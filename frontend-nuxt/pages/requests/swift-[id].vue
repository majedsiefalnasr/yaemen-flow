<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
definePageMeta({ middleware: ['auth', 'role'], roles: ['bank_swift', 'bank_admin'] })

const route = useRoute()
const api = useApi()
const auth = useAuthStore()
const { data, refresh } = await useAsyncData(`req-swift-${route.params.id}`,
  () => api.get(`/requests/${route.params.id}`))
const req = computed<any>(() => data.value?.data || data.value)

const file = ref<File | null>(null)
const comment = ref('')
const error = ref('')
const submitting = ref(false)

async function upload() {
  if (!file.value) { error.value = 'الرجاء اختيار ملف PDF لرسالة سويفت'; return }
  error.value = ''; submitting.value = true
  try {
    const fd = new FormData()
    fd.append('swift_file', file.value)
    if (comment.value) fd.append('comment', comment.value)
    await api.post(`/requests/${req.value.id}/swift`, fd)
    await refresh()
    navigateTo(`/requests/${req.value.id}`)
  } catch (e: any) {
    error.value = e?.data?.message ?? 'تعذّر رفع الملف'
  } finally { submitting.value = false }
}
</script>

<template>
  <div v-if="req">
    <h1 class="text-2xl font-bold mb-1">رفع رسالة سويفت — {{ req.reference }}</h1>
    <p class="text-slate-500 text-sm mb-6">
      عرض مقيّد: بيانات الطلب للقراءة فقط. يُسمح فقط برفع ملف SWIFT (PDF حتى 10MB).
    </p>

    <div class="card mb-4 opacity-90">
      <h3 class="font-bold mb-3">بيانات الطلب (للقراءة فقط)</h3>
      <dl class="grid grid-cols-2 gap-3 text-sm">
        <div><dt class="text-slate-500">التاجر</dt><dd>{{ req.merchant?.name }}</dd></div>
        <div><dt class="text-slate-500">المبلغ</dt><dd>{{ Number(req.amount).toLocaleString() }} {{ req.currency }}</dd></div>
        <div><dt class="text-slate-500">رقم الفاتورة</dt><dd>{{ req.invoice_number }}</dd></div>
        <div><dt class="text-slate-500">المورد</dt><dd>{{ req.supplier }}</dd></div>
        <div><dt class="text-slate-500">الميناء</dt><dd>{{ req.port }}</dd></div>
        <div><dt class="text-slate-500">المرحلة</dt><dd>{{ req.stage }}</dd></div>
      </dl>
    </div>

    <div class="card">
      <h3 class="font-bold mb-3">رفع رسالة سويفت</h3>
      <input type="file" accept="application/pdf"
             @change="(e: any) => file = e.target.files?.[0] ?? null"
             class="input mb-3" />
      <textarea v-model="comment" class="input mb-3" rows="2" placeholder="ملاحظة (اختياري)"></textarea>
      <p v-if="error" class="text-red-600 text-sm mb-2">{{ error }}</p>
      <button :disabled="submitting" @click="upload" class="btn-primary">
        {{ submitting ? 'جارٍ الرفع...' : 'رفع وتأكيد' }}
      </button>
    </div>
  </div>
</template>
