<script setup lang="ts">
import { ref, computed, defineComponent, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  FileText, Download, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Eye,
  MapPin, Building2, User, Calendar, TrendingUp, Upload, FileSignature, Lock,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { useCell } from '@/composables/useCell'
import {
  availableTransitions, canAttachSwift, canIssueCustoms, DEMO_USERS,
  canViewRequest, displayStatusFor, progressForRole, type RequestStage,
} from '@/lib/mock'
import {
  requestsCell, transitionRequest, isLocked, isEditable, logAudit,
  isClaimedByOther, auditCell,
} from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import WorkflowProgress from '@/components/workflow/WorkflowProgress.vue'
import VotingPanel from '@/components/workflow/VotingPanel.vue'
import LockedBanner from '@/components/workflow/LockedBanner.vue'
import DocumentChecklist from '@/components/workflow/DocumentChecklist.vue'
import { cn } from '@/lib/utils'

const route = useRoute()
const router = useRouter()
const { user } = storeToRefs(useAuthStore())
const requests = useCell(requestsCell)
const audit = useCell(auditCell)

const id = computed(() => route.params.id as string)
const req = computed(() => requests.value.find((r) => r.id === id.value))
const comment = ref('')
const previewDoc = ref<any | null>(null)

const allowed = computed(() => !!req.value && !!user.value && canViewRequest(user.value, req.value))
const claimedByOther = computed(() =>
  req.value && user.value?.role === 'support_member' && isClaimedByOther(req.value, user.value.id),
)
const transitions = computed(() =>
  claimedByOther.value || !req.value || !user.value ? [] : availableTransitions(req.value, user.value),
)
const canSwift = computed(() => req.value && user.value && canAttachSwift(req.value, user.value))
const canCustoms = computed(() => req.value && user.value && canIssueCustoms(req.value, user.value))
const sodViolation = computed(() =>
  req.value && user.value &&
  req.value.stage === 'bank_submitted' &&
  user.value.id === req.value.intakeUserId &&
  user.value.entityId === req.value.entityId,
)
const locked = computed(() => req.value && isLocked(req.value))
const editable = computed(() => req.value && isEditable(req.value))
const displayStatus = computed(() => req.value && user.value ? displayStatusFor(req.value.stage, user.value.role) : null)
const progressPct = computed(() => req.value && user.value ? progressForRole(req.value.stage, user.value.role) : 0)

function reasonFor(toStage: RequestStage): string | undefined {
  if (!req.value) return undefined
  const entry = audit.value.find((a) => a.ref === req.value!.ref && a.toStage === toStage && a.notes)
  return entry?.notes
}
const returnedReason = computed(() => req.value?.stage === 'support_returned' ? reasonFor('support_returned') : undefined)
const supportRejectedReason = computed(() => req.value?.stage === 'support_rejected' ? reasonFor('support_rejected') : undefined)
const execRejectedReason = computed(() => req.value?.stage === 'executive_rejected' ? reasonFor('executive_rejected') : undefined)
const bankRejectedReason = computed(() => req.value?.stage === 'bank_rejected' ? reasonFor('bank_rejected') : undefined)
const bankReturnedReason = computed(() => req.value?.stage === 'bank_returned' ? reasonFor('bank_returned') : undefined)

const supportClaimedByName = computed(() =>
  DEMO_USERS.find((u) => u.id === req.value?.supportClaimedBy)?.name ?? 'عضو آخر',
)

const infoRows = computed(() => req.value ? [
  ['نوع الواردات', req.value.type],
  ['المستورد', req.value.importer],
  ['البنك / الجهة', req.value.bank],
  ['المبلغ', `${req.value.amount.toLocaleString('en-US')} ${req.value.currency}`],
  ['المورد', req.value.supplier],
  ['رقم الفاتورة', req.value.invoice],
  ['ميناء الوصول', req.value.port],
  ['تاريخ التقديم', new Date(req.value.createdAt).toLocaleDateString('ar-EG')],
  ['مستوى المخاطر', req.value.risk === 'high' ? 'عالية' : req.value.risk === 'medium' ? 'متوسطة' : 'منخفضة'],
] : [])

const docs = computed(() => {
  if (!req.value) return []
  if (req.value.documents && req.value.documents.length > 0) return req.value.documents
  const base: any[] = [
    { name: 'الفاتورة التجارية', fileName: 'doc_1.pdf', mime: 'application/pdf', size: 2_400_000 },
    { name: 'بوليصة الشحن', fileName: 'doc_2.pdf', mime: 'application/pdf', size: 2_400_000 },
    { name: 'شهادة المنشأ', fileName: 'doc_3.pdf', mime: 'application/pdf', size: 2_400_000 },
  ]
  if (req.value.swiftFile) base.push({ name: 'وثيقة سويفت', fileName: req.value.swiftFile.name, mime: 'application/pdf', size: req.value.swiftFile.size })
  return base
})
const uploadedDocNames = computed(() => docs.value.map((d: any) => d.name))

const sideRows = computed(() => req.value ? [
  { icon: User, label: 'أنشأ الطلب', value: DEMO_USERS.find((u) => u.id === (req.value!.createdBy ?? req.value!.intakeUserId))?.name ?? '—' },
  { icon: Building2, label: 'البنك / الجهة', value: req.value.bank },
  { icon: MapPin, label: 'الميناء', value: req.value.port },
  { icon: Calendar, label: 'التقديم', value: new Date(req.value.createdAt).toLocaleDateString('ar-EG') },
  { icon: TrendingUp, label: 'المخاطر', value: req.value.risk === 'high' ? 'عالية' : req.value.risk === 'medium' ? 'متوسطة' : 'منخفضة' },
] : [])

function actorByUserId(uid?: string) {
  return uid ? DEMO_USERS.find((u) => u.id === uid) : undefined
}

const ActorRow = defineComponent({
  name: 'ActorRow',
  props: { label: { type: String, required: true }, userId: String, extra: String },
  setup(props) {
    return () => {
      const u = props.userId ? DEMO_USERS.find((x) => x.id === props.userId) : undefined
      return h('div', { class: 'flex items-center justify-between border-b pb-2 last:border-0' }, [
        h('div', { class: 'flex items-center gap-3' }, [
          h('div', { class: 'h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-[10px] font-bold' }, u?.avatar ?? '—'),
          h('div', null, [
            h('div', { class: 'text-xs text-muted-foreground' }, props.label),
            h('div', { class: 'text-sm font-medium' }, u?.name ?? 'بانتظار التنفيذ'),
            props.extra ? h('div', { class: 'text-[11px] text-muted-foreground' }, props.extra) : null,
          ]),
        ]),
        u ? h(Badge as any, { variant: 'secondary', class: 'text-[10px]' }, () => u.org) : null,
      ])
    }
  },
})

function performTransition(to: string, label: string) {
  if (!req.value || !user.value) return
  const t = transitions.value.find((x) => x.to === to)
  if (t?.requiresComment && !comment.value.trim()) {
    toast.error('التعليق إلزامي لهذا الإجراء')
    return
  }
  transitionRequest(req.value, to as RequestStage, { id: user.value.id, name: user.value.name, role: user.value.role }, comment.value || label)
  requestsCell.set((prev) => prev.map((r) => {
    if (r.id !== req.value!.id) return r
    const patch: any = { lastUpdatedBy: user.value!.id }
    if (to === 'bank_submitted') patch.submittedBy = user.value!.id
    if (to === 'bank_internal_review' || to === 'bank_approved') patch.internalReviewUserId = user.value!.id
    if (to === 'support_review') {
      patch.supportClaimedBy = user.value!.id
      patch.supportClaimedAt = new Date().toISOString()
    }
    if (to === 'support_approved' || to === 'support_returned' || to === 'support_rejected') patch.supportReviewerId = user.value!.id
    if (to === 'executive_approved' || to === 'executive_rejected') patch.executiveDecisionBy = user.value!.id
    return { ...r, ...patch }
  }))
  toast.success(`تم: ${label}`)
  comment.value = ''
}

function attachSwiftDirectly() {
  if (!req.value || !user.value) return
  const swiftFile = {
    name: `SWIFT_${req.value.ref}_${Date.now()}.pdf`,
    size: 184320,
    uploadedAt: new Date().toISOString(),
    uploadedBy: user.value.id,
  }
  requestsCell.set((prev) => prev.map((r) =>
    r.id === req.value!.id
      ? { ...r, swiftFile, stage: 'executive_voting' as const, lastUpdatedBy: user.value!.id }
      : r,
  ))
  logAudit({
    userId: user.value.id, userName: user.value.name, role: user.value.role,
    action: 'إرفاق وثيقة السويفت وإرسال للتصويت التنفيذي',
    ref: req.value.ref, fromStage: req.value.stage, toStage: 'executive_voting',
  })
  toast.success('تم إرفاق السويفت وتحويل حالة الطلب إلى تصويت اللجنة التنفيذية.')
}

function goCustoms() {
  if (req.value) router.push(`/customs/${req.value.id}/print`)
}
</script>

<template>
  <div v-if="!req" class="p-8 text-center">
    <PageHeader title="الطلب غير موجود" subtitle="قد يكون الطلب محذوفاً أو خارج نطاق صلاحياتك." />
    <NuxtLink to="/requests" class="text-accent hover:underline">العودة لقائمة الطلبات</NuxtLink>
  </div>
  <div v-else-if="!allowed" class="p-8">
    <PageHeader title="غير مصرح" subtitle="هذا الطلب خارج نطاق صلاحياتك التشغيلية." />
    <Card class="p-6 border-destructive/30 bg-destructive/5 shadow-card">
      <div class="flex items-start gap-3">
        <Lock class="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div class="text-sm">لا تملك صلاحية الاطلاع على هذا الطلب. يتم عرض الطلبات المرتبطة بدورك ومسؤوليتك التشغيلية فقط.</div>
      </div>
      <NuxtLink to="/requests" class="text-accent hover:underline mt-3 inline-block text-sm">← العودة لقائمة الطلبات</NuxtLink>
    </Card>
  </div>
  <div v-else>
    <PageHeader
      :title="req.ref"
      :subtitle="`${req.importer} · ${req.type}`"
      :breadcrumbs="[{ label: 'الرئيسية', to: '/' }, { label: 'الطلبات', to: '/requests' }, { label: req.ref }]"
    >
      <template #actions>
        <Button variant="outline"><Download class="h-4 w-4 ml-1" /> تنزيل الطلب</Button>
        <Badge v-if="displayStatus" :class="cn('text-sm py-1.5 px-3', displayStatus.color)">{{ displayStatus.label }}</Badge>
      </template>
    </PageHeader>

    <div class="mb-4 space-y-3">
      <LockedBanner v-if="locked" variant="locked" />
      <LockedBanner v-else-if="!editable" variant="readonly" message="لا تتوفر تعديلات في هذه المرحلة." />
    </div>

    <Card v-if="req.duplicate" class="p-4 mb-4 border-destructive/30 bg-destructive/5 shadow-card">
      <div class="flex items-start gap-3">
        <AlertTriangle class="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div class="flex-1">
          <div class="font-semibold text-destructive">تنبيه: فاتورة مكررة محتملة</div>
          <div class="text-xs text-muted-foreground mt-0.5">رقم الفاتورة <span class="font-mono font-semibold">{{ req.invoice }}</span> ظهر في طلبات سابقة.</div>
        </div>
      </div>
    </Card>

    <Card v-if="sodViolation" class="p-4 mb-4 border-warning/30 bg-warning/5 shadow-card">
      <div class="flex items-start gap-3">
        <Lock class="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div class="flex-1">
          <div class="font-semibold text-warning">فصل المهام</div>
          <div class="text-xs text-muted-foreground mt-0.5">لا يمكن لنفس المستخدم تنفيذ خطوتي الإدخال والمراجعة الداخلية لذات الطلب. الرجاء استخدام حساب مراجع داخلي مختلف.</div>
        </div>
      </div>
    </Card>

    <Card v-if="req.stage === 'support_returned'" class="p-4 mb-4 border-amber-300 bg-amber-50/70 shadow-card border-r-4 border-r-amber-500">
      <div class="flex items-start gap-3">
        <AlertTriangle class="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div class="flex-1">
          <div class="font-semibold text-amber-700">الطلب مُعاد للتعديل من اللجنة المساندة</div>
          <div class="text-xs text-muted-foreground mt-1">يمكنك مراجعة الملاحظات وتعديل البيانات والمستندات ثم إعادة إرساله، أو الإبقاء على الطلب في وضعه الحالي.</div>
          <div v-if="returnedReason" class="mt-2 text-sm bg-card border border-amber-200 rounded-md px-3 py-2">
            <span class="font-semibold text-amber-700">سبب الإعادة: </span><span>{{ returnedReason }}</span>
          </div>
        </div>
      </div>
    </Card>

    <Card v-if="req.stage === 'bank_returned'" class="p-4 mb-4 border-amber-300 bg-amber-50/70 shadow-card border-r-4 border-r-amber-500">
      <div class="flex items-start gap-3">
        <AlertTriangle class="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div class="flex-1">
          <div class="font-semibold text-amber-700">الطلب مُعاد لإعادة الإدخال من المراجع الداخلي</div>
          <div class="mt-2 text-sm bg-card border border-amber-200 rounded-md px-3 py-2">
            <span class="font-semibold text-amber-700">سبب الإعادة: </span><span>{{ bankReturnedReason }}</span>
          </div>
        </div>
      </div>
    </Card>

    <Card v-if="req.stage === 'bank_rejected'" class="p-4 mb-4 border-rose-300 bg-rose-50/70 shadow-card border-r-4 border-r-rose-600">
      <div class="flex items-start gap-3">
        <XCircle class="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        <div class="flex-1">
          <div class="font-semibold text-rose-700">مرفوض من المراجعة الداخلية بالبنك</div>
          <div v-if="bankRejectedReason" class="mt-2 text-sm bg-card border border-rose-200 rounded-md px-3 py-2">
            <span class="font-semibold text-rose-700">سبب الرفض: </span><span>{{ bankRejectedReason }}</span>
          </div>
        </div>
      </div>
    </Card>

    <Card v-if="req.stage === 'executive_rejected'" class="p-4 mb-4 border-rose-300 bg-rose-50/70 shadow-card border-r-4 border-r-rose-600">
      <div class="flex items-start gap-3">
        <XCircle class="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        <div class="flex-1">
          <div class="font-semibold text-rose-700">رفض نهائي من اللجنة التنفيذية</div>
          <div class="text-xs text-muted-foreground mt-1">هذا قرار نهائي ولا يمكن إعادة إرسال الطلب نفسه مرة أخرى. لتقديم طلب جديد، يلزم إنشاء طلب مستقل ببيانات مختلفة.</div>
          <div v-if="execRejectedReason" class="mt-2 text-sm bg-card border border-rose-200 rounded-md px-3 py-2">
            <span class="font-semibold text-rose-700">سبب الرفض: </span><span>{{ execRejectedReason }}</span>
          </div>
        </div>
      </div>
    </Card>

    <Card v-if="req.stage === 'support_rejected'" class="p-4 mb-4 border-rose-300 bg-rose-50/60 shadow-card border-r-4 border-r-rose-500">
      <div class="flex items-start gap-3">
        <XCircle class="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        <div class="flex-1">
          <div class="font-semibold text-rose-700">مرفوض من اللجنة المساندة</div>
          <div class="text-xs text-muted-foreground mt-1">لا يمكن متابعة هذا الطلب ضمن مساره الحالي. يمكنك الإبقاء عليه للأرشفة أو إنشاء طلب جديد بعد معالجة سبب الرفض.</div>
          <div v-if="supportRejectedReason" class="mt-2 text-sm bg-card border border-rose-200 rounded-md px-3 py-2">
            <span class="font-semibold text-rose-700">سبب الرفض: </span><span>{{ supportRejectedReason }}</span>
          </div>
        </div>
      </div>
    </Card>

    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <Card class="p-5 shadow-card border-0">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold">تقدم الطلب في الدورة التنظيمية</h3>
            <span class="text-2xl font-bold tabular-nums">{{ progressPct }}%</span>
          </div>
          <Progress :value="progressPct" class="h-2 mb-2" />
          <div class="text-xs text-muted-foreground">المرحلة الحالية: {{ displayStatus?.label }}</div>
        </Card>

        <Card
          v-if="(req.stage === 'bank_approved' || req.stage === 'support_review') && user?.role === 'support_member' && req.supportClaimedBy && req.supportClaimedBy !== user.id"
          class="p-4 shadow-card border-0 bg-warning/5 border-warning/30"
        >
          <div class="flex items-center gap-3">
            <Lock class="h-5 w-5 text-warning" />
            <div class="flex-1 text-sm">
              الطلب قيد المراجعة من قبل <span class="font-semibold">{{ supportClaimedByName }}</span> — لا يمكن لعضو آخر اتخاذ إجراء عليه.
            </div>
          </div>
        </Card>

        <VotingPanel
          v-if="(req.stage === 'executive_voting' || req.stage === 'swift_attached') && (user?.role === 'executive_member' || user?.role === 'committee_manager')"
          :req="req"
        />

        <Tabs default-value="info">
          <TabsList class="grid grid-cols-3 w-full">
            <TabsTrigger value="info">المعلومات</TabsTrigger>
            <TabsTrigger value="docs">الوثائق</TabsTrigger>
            <TabsTrigger value="actors">الأطراف</TabsTrigger>
          </TabsList>

          <TabsContent value="info" class="mt-4">
            <Card class="p-6 shadow-card border-0">
              <div class="grid md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div v-for="[k, v] in infoRows" :key="k" class="flex justify-between items-center gap-3 border-b pb-2.5">
                  <span class="text-muted-foreground text-start">{{ k }}</span>
                  <span class="font-medium text-end">{{ v }}</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="docs" class="mt-4 space-y-4">
            <Card class="p-4 shadow-card border-0">
              <DocumentChecklist :stage="req.stage" :uploaded="uploadedDocNames" />
            </Card>
            <Card class="p-4 shadow-card border-0 space-y-2">
              <div v-for="(d, i) in docs" :key="d.name + i" class="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 border">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-lg bg-destructive/10 text-destructive grid place-items-center">
                    <FileText class="h-5 w-5" />
                  </div>
                  <div>
                    <div class="font-medium text-sm">{{ d.name }}</div>
                    <div class="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>{{ (d as any).fileName ?? `doc_${i + 1}.pdf` }} · {{ ((((d as any).size ?? 2400000) / 1048576).toFixed(1)) }}MB</span>
                      <Badge variant="secondary" class="gap-1 h-4 text-[10px]"><ShieldCheck class="h-2.5 w-2.5" /> مفحوص</Badge>
                    </div>
                  </div>
                </div>
                <div class="flex gap-1">
                  <Button size="sm" variant="ghost" @click="previewDoc = d"><Eye class="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost"><Download class="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
            <Dialog :open="!!previewDoc" @update:open="(o: boolean) => { if (!o) previewDoc = null }">
              <DialogContent class="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{{ previewDoc?.name }}</DialogTitle>
                  <DialogDescription>معاينة الوثيقة (نموذج تجريبي)</DialogDescription>
                </DialogHeader>
                <template v-if="previewDoc?.dataUrl">
                  <img v-if="previewDoc.mime?.startsWith('image/')" :src="previewDoc.dataUrl" :alt="previewDoc.name" class="max-h-[70vh] w-full object-contain rounded-lg border" />
                  <iframe v-else :src="previewDoc.dataUrl" :title="previewDoc.name" class="w-full h-[70vh] rounded-lg border bg-white" />
                </template>
                <div v-else class="border rounded-lg bg-muted/30 aspect-[4/5] grid place-items-center text-center p-6">
                  <div class="space-y-3">
                    <div class="h-16 w-16 mx-auto rounded-lg bg-destructive/10 text-destructive grid place-items-center">
                      <FileText class="h-8 w-8" />
                    </div>
                    <div class="font-medium">{{ previewDoc?.name }}</div>
                    <div class="text-xs text-muted-foreground">ملف PDF · معاينة تجريبية</div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="actors" class="mt-4">
            <Card class="p-5 shadow-card border-0 space-y-3 text-sm">
              <ActorRow label="أنشأ الطلب" :user-id="req.createdBy ?? req.intakeUserId" />
              <ActorRow label="آخر من حدّث الطلب" :user-id="req.lastUpdatedBy ?? req.intakeUserId" />
              <ActorRow label="قدّم الطلب للمراجعة" :user-id="req.submittedBy" />
              <ActorRow label="المراجع الداخلي بالبنك" :user-id="req.internalReviewUserId" />
              <ActorRow label="مراجع اللجنة المساندة" :user-id="req.supportReviewerId ?? req.supportClaimedBy" />
              <ActorRow v-if="req.swiftFile" label="موظف السويفت" :user-id="req.swiftFile.uploadedBy" :extra="`رفع ${req.swiftFile.name}`" />
              <ActorRow
                label="قرار اللجنة التنفيذية"
                :user-id="req.executiveDecisionBy"
                :extra="req.stage === 'executive_approved' ? 'اعتماد' : req.stage === 'executive_rejected' ? 'رفض' : req.stage === 'executive_voting' ? 'قيد التصويت' : undefined"
              />
              <ActorRow v-if="req.customsBy" label="مُصدِر إذن إصدار بيان جمركي" :user-id="req.customsBy" :extra="`رقم البيان ${req.customsNo}`" />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div class="space-y-4">
        <WorkflowProgress :req="req" />

        <Card v-if="transitions.length > 0 || canSwift || canCustoms" class="p-5 shadow-card border-0">
          <h3 class="font-semibold mb-4">إجراءات متاحة لك</h3>
          <div class="space-y-2">
            <Button
              v-for="t in transitions" :key="t.to"
              :variant="t.destructive ? 'outline' : 'default'"
              :class="cn('w-full justify-start', t.destructive && 'text-destructive hover:text-destructive')"
              @click="performTransition(t.to, t.label)"
            >
              <XCircle v-if="t.destructive" class="h-4 w-4 ml-2" />
              <CheckCircle2 v-else class="h-4 w-4 ml-2" />
              {{ t.label }}
            </Button>

            <Button v-if="canSwift" class="w-full justify-start" @click="attachSwiftDirectly">
              <Upload class="h-4 w-4 ml-2" /> إرفاق وثيقة السويفت
            </Button>
            <Button v-if="canCustoms" class="w-full justify-start" @click="goCustoms">
              <FileSignature class="h-4 w-4 ml-2" /> إصدار إذن بيان جمركي
            </Button>
          </div>
          <div v-if="transitions.length > 0" class="mt-4 pt-4 border-t space-y-2">
            <p v-if="transitions.some((t: any) => t.requiresComment)" class="text-xs text-destructive">
              * التعليق إلزامي في حالة الإعادة للتعديل أو رفض الطلب
            </p>
            <Textarea
              :rows="2"
              :placeholder="transitions.some((t: any) => t.requiresComment) ? 'اكتب سبب الإعادة أو الرفض...' : 'تعليق (اختياري)...'"
              v-model="comment"
            />
          </div>
        </Card>

        <Card class="p-5 shadow-card border-0">
          <h3 class="font-semibold mb-3 text-sm">معلومات سريعة</h3>
          <div class="space-y-3 text-sm">
            <div v-for="r in sideRows" :key="r.label" class="flex items-center gap-3">
              <div class="h-8 w-8 rounded-lg bg-muted grid place-items-center text-muted-foreground">
                <component :is="r.icon" class="h-4 w-4" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[11px] text-muted-foreground">{{ r.label }}</div>
                <div class="text-sm font-medium truncate">{{ r.value }}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card class="p-5 shadow-card border-0">
          <NuxtLink to="/requests" class="text-sm text-accent hover:underline">← العودة لقائمة الطلبات</NuxtLink>
        </Card>
      </div>
    </div>
  </div>
</template>