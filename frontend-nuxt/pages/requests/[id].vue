<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const api = useApi()
const auth = useAuthStore()
const { data, refresh, pending } = await useAsyncData(`req-${route.params.id}`, () => api.get(`/requests/${route.params.id}`))
const req = computed(() => data.value?.data || data.value)

// 13-stage workflow with separation of duties.
// Server returns `allowed_next` based on the user's roles, entity, and SoD rules.
const labels: Record<string, string> = {
  bank_internal_review: 'إرسال للمراجعة الداخلية',
  support_review: 'تحويل إلى لجنة الدعم',
  bank_submitted: 'إعادة بعد التعديل',
  support_approved: 'اعتماد مساند',
  support_returned: 'إعادة للبنك',
  support_rejected: 'رفض مساند',
  swift_attached: 'تأكيد رفع سويفت',
  executive_voting: 'تحويل للتصويت التنفيذي',
  executive_approved: 'إعلان الاعتماد التنفيذي',
  executive_rejected: 'إعلان الرفض التنفيذي',
  customs_released: 'إصدار البيان الجمركي',
  completed: 'إنهاء الطلب',
}
const available = computed(() =>
  ((data.value?.allowed_next ?? []) as string[]).map(to => ({ to, label: labels[to] ?? to }))
)

const comment = ref('')
async function transition(to: string) {
  await api.post(`/requests/${req.value.id}/transition`, { to_stage: to, comment: comment.value })
  comment.value = ''; await refresh()
}

const voteValue = ref('approve'); const voteJustification = ref('')
async function castVote() {
  await api.post(`/requests/${req.value.id}/vote`, { vote: voteValue.value, justification: voteJustification.value })
  await refresh()
}
</script>

<template>
  <div v-if="pending">جاري التحميل...</div>
  <div v-else-if="req">
    <div class="flex justify-between items-start mb-6">
      <div>
        <h1 class="text-2xl font-bold">{{ req.reference }}</h1>
        <p class="text-slate-500 text-sm">{{ req.merchant?.name }} · {{ req.supplier }}</p>
      </div>
      <span class="badge bg-primary text-white text-sm px-3 py-1">{{ req.stage }}</span>
    </div>

    <div class="grid md:grid-cols-3 gap-4">
      <div class="card md:col-span-2">
        <h3 class="font-bold mb-4">تفاصيل الطلب</h3>
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div><dt class="text-slate-500">المبلغ</dt><dd class="font-semibold">{{ Number(req.amount).toLocaleString() }} {{ req.currency }}</dd></div>
          <div><dt class="text-slate-500">البنك</dt><dd>{{ req.bank }}</dd></div>
          <div><dt class="text-slate-500">نوع البضاعة</dt><dd>{{ req.goods_type }}</dd></div>
          <div><dt class="text-slate-500">رقم الفاتورة</dt><dd>{{ req.invoice_number }}</dd></div>
          <div><dt class="text-slate-500">الميناء</dt><dd>{{ req.port }}</dd></div>
          <div><dt class="text-slate-500">المخاطر</dt><dd>{{ req.risk }}</dd></div>
        </dl>
        <div v-if="req.is_duplicate" class="mt-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-sm">
          ⚠️ تنبيه: فاتورة مكررة محتملة
        </div>
      </div>

      <div class="card">
        <h3 class="font-bold mb-3">المستندات</h3>
        <ul class="text-sm space-y-2">
          <li v-for="d in req.documents" :key="d.id" class="flex justify-between border-b pb-1">
            <span>{{ d.original_name }}</span>
            <a :href="`${$config.public.apiBase}/requests/${req.id}/documents/${d.id}`" target="_blank" class="text-primary">تنزيل</a>
          </li>
          <li v-if="!req.documents?.length" class="text-slate-400">لا توجد مستندات</li>
        </ul>
      </div>
    </div>

    <div v-if="available.length" class="card mt-4">
      <h3 class="font-bold mb-3">إجراءات</h3>
      <textarea v-model="comment" class="input mb-3" rows="2" placeholder="تعليق (اختياري)"></textarea>
      <div class="flex gap-2 flex-wrap">
        <button v-for="t in available" :key="t.to" @click="transition(t.to)" class="btn-primary">{{ t.label }}</button>
      </div>
    </div>

    <div v-if="req.stage === 'support_approved' && auth.hasAnyRole(['bank_swift','bank_admin'])"
         class="card mt-4 bg-emerald-50 border-emerald-200">
      <h3 class="font-bold mb-2">الخطوة 4 — رفع رسالة سويفت</h3>
      <p class="text-sm text-slate-600 mb-3">الطلب جاهز لرفع رسالة سويفت من البنك.</p>
      <NuxtLink :to="`/requests/swift-${req.id}`" class="btn-primary">فتح نموذج رفع سويفت</NuxtLink>
    </div>

    <div v-if="req.customs_declaration_no" class="card mt-4">
      <h3 class="font-bold mb-2">البيان الجمركي</h3>
      <p class="text-sm">رقم البيان: <span class="font-mono">{{ req.customs_declaration_no }}</span></p>
      <a :href="`${$config.public.apiBase}/requests/${req.id}/customs/print`" target="_blank" class="text-primary text-sm">طباعة البيان</a>
    </div>

    <div v-if="req.stage === 'executive_voting' && auth.hasRole('executive_member')" class="card mt-4">
      <h3 class="font-bold mb-3">التصويت التنفيذي</h3>
      <select v-model="voteValue" class="input mb-2 max-w-xs">
        <option value="approve">موافقة</option><option value="reject">رفض</option><option value="abstain">امتناع</option>
      </select>
      <textarea v-model="voteJustification" class="input mb-3" rows="2" placeholder="مبرر التصويت"></textarea>
      <button @click="castVote" class="btn-primary">إرسال التصويت</button>
    </div>

    <div class="card mt-4">
      <h3 class="font-bold mb-3">السجل الزمني</h3>
      <ol class="text-sm space-y-2">
        <li v-for="h in req.history" :key="h.id" class="border-r-2 border-primary pr-3">
          <div class="font-semibold">{{ h.from_stage || 'بداية' }} → {{ h.to_stage }}</div>
          <div class="text-xs text-slate-500">{{ new Date(h.created_at).toLocaleString('ar') }}</div>
          <div v-if="h.comment" class="text-xs mt-1">{{ h.comment }}</div>
        </li>
      </ol>
    </div>
  </div>
</template>
