<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Lock, Upload, ShieldCheck, FileText, ArrowRight, Send, CheckCircle2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useCell } from '@/composables/useCell'
import { requestsCell, transitionRequest, logAudit } from '@/lib/governance'
import { canAttachSwift, displayStatusFor } from '@/lib/mock'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const { user } = storeToRefs(useAuthStore())
const all = useCell(requestsCell)
const id = computed(() => route.params.id as string)
const req = computed(() => all.value.find((r) => r.id === id.value))
const file = ref<File | null>(null)
const reference = ref('')

const allowed = computed(() => req.value && user.value && (canAttachSwift(req.value, user.value) || req.value.stage === 'swift_attached'))
const hasSwift = computed(() => !!req.value?.swiftFile)
const canSend = computed(() => hasSwift.value && req.value?.stage === 'swift_attached')

function onFile(e: Event) {
  const t = e.target as HTMLInputElement
  file.value = t.files?.[0] ?? null
}
function attachSwift() {
  if (!req.value || !user.value) return
  if (!file.value) { toast.error('يجب اختيار ملف PDF حقيقي لإرفاق السويفت.'); return }
  const swiftFile = { name: file.value.name, size: file.value.size, uploadedAt: new Date().toISOString(), uploadedBy: user.value.id }
  requestsCell.set((prev) => prev.map((r) => r.id === req.value!.id ? { ...r, swiftFile, stage: 'swift_attached' as const } : r))
  logAudit({
    userId: user.value.id, userName: user.value.name, role: user.value.role,
    action: 'إرفاق وثيقة السويفت',
    ref: req.value.ref, fromStage: req.value.stage, toStage: 'swift_attached',
    notes: reference.value ? `مرجع: ${reference.value}` : undefined,
  })
  toast.success('تم إرفاق السويفت. اضغط إرسال لتحويل الطلب للتصويت.')
}
function sendToVoting() {
  if (!req.value || !user.value) return
  transitionRequest(req.value, 'executive_voting', { id: user.value.id, name: user.value.name, role: user.value.role }, 'إرسال للتصويت')
  toast.success('تم إرسال الطلب للتصويت.')
  router.push(`/requests/${req.value.id}`)
}
</script>
<template>
  <div v-if="req && user">
    <PageHeader title="إرفاق وثيقة السويفت" :subtitle="`الطلب ${req.ref} · البيانات مقفلة`"
      :breadcrumbs="[{ label: 'الطلبات', to: '/requests' }, { label: req.ref, to: `/requests/${req.id}` }, { label: 'السويفت' }]">
      <template #actions>
        <Badge :class="cn('text-sm py-1.5 px-3', displayStatusFor(req.stage, user.role).color)">{{ displayStatusFor(req.stage, user.role).label }}</Badge>
      </template>
    </PageHeader>

    <Card v-if="!allowed" class="p-8 text-center border-0">
      <Lock class="h-10 w-10 mx-auto text-muted-foreground" />
      <h2 class="mt-4 font-bold text-lg">غير مصرح</h2>
      <p class="text-sm text-muted-foreground mt-1">لا تملك صلاحية رفع السويفت لهذا الطلب.</p>
      <Button as-child class="mt-4" variant="outline"><NuxtLink :to="`/requests/${req.id}`">العودة للطلب</NuxtLink></Button>
    </Card>

    <div v-else class="grid lg:grid-cols-3 gap-6">
      <Card class="lg:col-span-2 p-6 border-0">
        <div class="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <Lock class="h-4 w-4" /> البيانات أدناه للاطلاع فقط
        </div>
        <fieldset disabled class="space-y-4 opacity-90">
          <div class="grid md:grid-cols-2 gap-4">
            <div class="space-y-1"><Label class="text-xs text-muted-foreground">المستورد</Label><Input :model-value="req.importer" readonly class="bg-muted/40" /></div>
            <div class="space-y-1"><Label class="text-xs text-muted-foreground">البنك</Label><Input :model-value="req.bank" readonly class="bg-muted/40" /></div>
            <div class="space-y-1"><Label class="text-xs text-muted-foreground">المبلغ</Label><Input :model-value="`${req.amount.toLocaleString('en-US')} ${req.currency}`" readonly class="bg-muted/40" /></div>
            <div class="space-y-1"><Label class="text-xs text-muted-foreground">نوع البضاعة</Label><Input :model-value="req.type" readonly class="bg-muted/40" /></div>
            <div class="space-y-1"><Label class="text-xs text-muted-foreground">المورد</Label><Input :model-value="req.supplier" readonly class="bg-muted/40" /></div>
            <div class="space-y-1"><Label class="text-xs text-muted-foreground">رقم الفاتورة</Label><Input :model-value="req.invoice" readonly class="bg-muted/40" /></div>
          </div>
        </fieldset>

        <div class="mt-6 pt-6 border-t space-y-4">
          <h3 class="font-semibold flex items-center gap-2"><Upload class="h-4 w-4 text-accent" /> رفع وثيقة السويفت</h3>

          <div v-if="hasSwift" class="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
            <CheckCircle2 class="h-5 w-5 text-success mt-0.5" />
            <div class="text-sm">
              <div class="font-semibold text-success">تم إرفاق وثيقة السويفت</div>
              <div class="text-xs text-muted-foreground mt-1">{{ req.swiftFile!.name }} · {{ (req.swiftFile!.size / 1024).toFixed(1) }} KB</div>
            </div>
          </div>
          <template v-else>
            <div class="space-y-2"><Label>رقم مرجع السويفت</Label><Input v-model="reference" placeholder="مثل: 25CBY2025XX" /></div>
            <div class="space-y-2">
              <Label for="swift-file-input">ملف السويفت (PDF)</Label>
              <label for="swift-file-input" class="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-colors text-center">
                <Upload class="h-6 w-6 text-muted-foreground" />
                <span class="text-sm font-medium">{{ file ? 'تغيير الملف' : 'اضغط هنا لاختيار ملف PDF' }}</span>
                <span class="text-xs text-muted-foreground">{{ file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB` : 'الحد الأقصى 10MB' }}</span>
              </label>
              <input id="swift-file-input" type="file" accept="application/pdf,.pdf" class="sr-only" @change="onFile" />
              <div v-if="file" class="flex items-center gap-2 text-xs text-success"><FileText class="h-4 w-4" /> تم اختيار: {{ file.name }}</div>
            </div>
            <Button class="w-full" size="lg" :disabled="!file" @click="attachSwift"><Upload class="h-4 w-4 ml-2" /> إرفاق وثيقة السويفت</Button>
            <p class="text-xs text-muted-foreground text-center">اختر ملف PDF حقيقي ثم اضغط إرفاق. سيظهر زر "إرسال" بعدها.</p>
          </template>

          <div v-if="canSend" class="pt-4 border-t space-y-3">
            <p class="text-sm text-muted-foreground">بعد التأكد من السويفت، اضغط "إرسال" لتحويل الطلب إلى تصويت اللجنة التنفيذية.</p>
            <Button class="w-full" size="lg" @click="sendToVoting"><Send class="h-4 w-4 ml-2" /> إرسال للتصويت <ArrowRight class="h-4 w-4 mr-2" /></Button>
          </div>
        </div>
      </Card>

      <Card class="p-5 border-0 h-fit">
        <h3 class="font-semibold mb-3 flex items-center gap-2"><ShieldCheck class="h-4 w-4 text-accent" /> ضوابط المرحلة</h3>
        <ul class="text-xs text-muted-foreground space-y-2 leading-relaxed list-disc pr-4">
          <li>لا يُسمح بتعديل بيانات الطلب.</li>
          <li>الإجراء متاح فقط لموظفي السويفت أو مسؤول البنك.</li>
          <li>يجب الضغط على "إرسال" بعد الإرفاق.</li>
          <li>سيُسجَّل كل إجراء في سجل التدقيق.</li>
        </ul>
      </Card>
    </div>
  </div>
  <div v-else class="p-8 text-center text-muted-foreground">الطلب غير موجود.</div>
</template>