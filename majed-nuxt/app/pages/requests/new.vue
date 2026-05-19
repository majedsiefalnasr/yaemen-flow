<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Upload, FileText, ChevronLeft, ChevronRight, Save, Send, Check,
  ShieldCheck, Eye, Trash2, FileCheck2,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { useCell } from '@/composables/useCell'
import { ENTITIES, type ImportRequest, type RequestStage } from '@/lib/mock'
import { requestsCell, merchantsCell, logAudit, notify } from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const router = useRouter()
const { user } = storeToRefs(useAuthStore())
const merchants = useCell(merchantsCell)

const STEPS = ['بيانات الطلب', 'بيانات المورد والشحنة', 'الوثائق المطلوبة', 'المراجعة والإرسال']
const TYPE_LABEL: Record<string, string> = { food: 'مواد غذائية', med: 'أدوية ومستلزمات طبية', oil: 'مشتقات نفطية', parts: 'قطع غيار' }
const PORT_LABEL: Record<string, string> = { aden: 'ميناء عدن', hodeidah: 'ميناء الحديدة', mukalla: 'ميناء المكلا' }
const COUNTRY_LABEL: Record<string, string> = { us: 'الولايات المتحدة', cn: 'الصين', in: 'الهند', sa: 'المملكة العربية السعودية' }

const bankMerchants = computed(() =>
  merchants.value.filter((m) => m.status === 'active' && (!user.value?.entityId || m.entityId === user.value.entityId)),
)

const step = ref(0)
const form = reactive({
  type: 'food', importer: '', amount: '850000', currency: 'USD' as 'USD' | 'EUR' | 'SAR',
  payment: 'lc', dueDate: '2025-12-15', notes: '',
  supplier: 'Cargill Trading Inc.', country: 'us',
  invoice: `INV-2025-${Math.floor(Math.random() * 9000 + 1000)}`,
  invoiceDate: '2025-10-22', shipPort: 'Port of Houston, USA', arrivalPort: 'aden',
  bl: 'BL-CRG-2025-991', customs: 'aden_c',
})
// Default importer to first bank merchant
if (!form.importer && bankMerchants.value[0]) form.importer = bankMerchants.value[0].name

type UploadedDoc = { file: File; url: string; dataUrl: string }
const uploads = ref<Record<string, UploadedDoc>>({})
const inputsRef = ref<Record<string, HTMLInputElement | null>>({})
const preview = ref<{ name: string; url: string; type: string } | null>(null)

const licenseRequired = computed(() => form.type === 'oil' || form.type === 'med')
const docNames = computed(() => {
  const list: { name: string; required: boolean }[] = [
    { name: 'الفاتورة الأولية (Proforma Invoice)', required: true },
    { name: 'السجل التجاري', required: true },
    { name: 'البطاقة الضريبية', required: true },
  ]
  if (licenseRequired.value) list.push({ name: `الترخيص (${TYPE_LABEL[form.type]})`, required: true })
  list.push({ name: 'مستندات إضافية', required: false })
  return list
})

const unauthorized = computed(() => user.value && user.value.role !== 'bank_intake' && user.value.role !== 'bank_admin')

function buildRequest(stage: RequestStage): ImportRequest {
  const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const entity = ENTITIES.find((e) => e.id === user.value?.entityId) ?? ENTITIES[0]!
  const ref = `IMP-2025-${Math.floor(2000 + Math.random() * 7000)}`
  const progressByStage: Record<RequestStage, number> = {
    draft: 5, bank_submitted: 12, bank_internal_review: 22, bank_approved: 35,
    support_review: 45, support_returned: 30, support_rejected: 100, bank_rejected: 100,
    support_approved: 60, swift_attached: 70, executive_voting: 80,
    executive_rejected: 100, executive_approved: 90, customs_released: 96, completed: 100,
  }
  return {
    id, ref,
    importer: form.importer,
    entityId: user.value?.entityId ?? entity.id,
    bank: entity.name,
    amount: Number(form.amount) || 0,
    currency: form.currency,
    type: TYPE_LABEL[form.type] ?? form.type,
    supplier: form.supplier,
    invoice: form.invoice,
    port: PORT_LABEL[form.arrivalPort] ?? form.arrivalPort,
    stage,
    createdAt: new Date().toISOString(),
    progress: progressByStage[stage],
    risk: 'low',
    duplicate: false,
    intakeUserId: user.value?.id ?? 'u5',
    createdBy: user.value?.id ?? 'u5',
    lastUpdatedBy: user.value?.id ?? 'u5',
    submittedBy: stage === 'draft' ? undefined : (user.value?.id ?? 'u5'),
    documents: Object.entries(uploads.value).map(([name, u]) => ({
      name, fileName: u.file.name, mime: u.file.type, size: u.file.size, dataUrl: u.dataUrl,
    })),
  } as ImportRequest
}

function persist(stage: RequestStage, successMsg: string) {
  if (!user.value) return
  if (!form.importer || !form.amount || !form.invoice) {
    toast.error('يرجى إكمال البيانات الأساسية')
    step.value = 0
    return
  }
  const req = buildRequest(stage)
  requestsCell.set((prev) => [req, ...prev])
  logAudit({
    userId: user.value.id, userName: user.value.name, role: user.value.role,
    action: stage === 'draft' ? 'حفظ مسودة طلب' : 'إنشاء طلب وتقديم للمراجعة',
    ref: req.ref, toStage: stage,
    notes: `${req.importer} — ${req.amount.toLocaleString()} ${req.currency}`,
  })
  if (stage !== 'draft') {
    notify({
      title: 'طلب جديد بانتظار المراجعة الداخلية',
      body: `${req.ref} — ${req.importer}`,
      audience: 'bank_reviewer',
      href: `/requests/${req.id}`,
    })
  }
  toast.success(successMsg)
  router.push('/requests')
}

function pick(name: string) {
  inputsRef.value[name]?.click()
}
function onFile(name: string, ev: Event) {
  const t = ev.target as HTMLInputElement
  const file = t.files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) { toast.error('حجم الملف يتجاوز 10MB'); return }
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = String(reader.result || '')
    if (uploads.value[name]) URL.revokeObjectURL(uploads.value[name].url)
    uploads.value = { ...uploads.value, [name]: { file, url: URL.createObjectURL(file), dataUrl } }
    toast.success(`تم رفع: ${file.name}`)
  }
  reader.readAsDataURL(file)
}
function removeDoc(name: string) {
  if (uploads.value[name]) URL.revokeObjectURL(uploads.value[name].url)
  const { [name]: _, ...rest } = uploads.value
  uploads.value = rest
}

const reviewSections = computed(() => ([
  { title: 'بيانات الطلب', rows: [
    ['نوع الواردات', TYPE_LABEL[form.type] ?? form.type],
    ['المستورد', form.importer],
    ['مبلغ التمويل', `${Number(form.amount).toLocaleString()} ${form.currency}`],
    ['شروط الدفع', form.payment.toUpperCase()],
  ] as [string, string][] },
  { title: 'بيانات المورد والشحنة', rows: [
    ['المورد', form.supplier],
    ['رقم الفاتورة', form.invoice],
    ['ميناء الوصول', PORT_LABEL[form.arrivalPort] ?? form.arrivalPort],
    ['البلد', COUNTRY_LABEL[form.country] ?? form.country],
  ] as [string, string][] },
]))
</script>

<template>
  <div v-if="unauthorized" class="p-8">
    <PageHeader title="غير مصرح بإنشاء طلب"
      subtitle="هذه الصفحة متاحة لمُدخِل البنك أو مسؤول البنك فقط. المراجع الداخلي وأدوار البنك المركزي لا تنشئ الطلبات." />
    <Button variant="outline" @click="router.push('/requests')">← العودة لقائمة الطلبات</Button>
  </div>
  <div v-else>
    <PageHeader title="تقديم طلب تمويل واردات جديد"
      subtitle="املأ البيانات بدقة وأرفق المستندات المطلوبة"
      :breadcrumbs="[{ label: 'الرئيسية', to: '/' }, { label: 'الطلبات', to: '/requests' }, { label: 'طلب جديد' }]" />

    <Card class="p-6 mb-6 shadow-card border-0">
      <div class="flex items-center justify-between">
        <div v-for="(s, i) in STEPS" :key="s" class="flex items-center flex-1">
          <div class="flex flex-col items-center text-center">
            <div :class="cn('h-10 w-10 rounded-full grid place-items-center font-semibold text-sm transition-colors',
              i < step ? 'bg-success text-white' : i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/15' : 'bg-muted text-muted-foreground')">
              <Check v-if="i < step" class="h-5 w-5" />
              <template v-else>{{ i + 1 }}</template>
            </div>
            <div :class="cn('text-xs mt-2 max-w-[100px]', i === step ? 'text-foreground font-semibold' : 'text-muted-foreground')">{{ s }}</div>
          </div>
          <div v-if="i < STEPS.length - 1" :class="cn('h-0.5 flex-1 mx-2 transition-colors', i < step ? 'bg-success' : 'bg-muted')" />
        </div>
      </div>
    </Card>

    <Card class="p-6 shadow-card border-0">
      <!-- Step 1 -->
      <div v-show="step === 0" class="space-y-6">
        <h3 class="font-semibold">معلومات الطلب الأساسية</h3>
        <div class="grid md:grid-cols-2 gap-5">
          <div class="space-y-2">
            <Label>نوع الواردات <span class="text-destructive">*</span></Label>
            <Select v-model="form.type">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="(v, k) in TYPE_LABEL" :key="k" :value="k">{{ v }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>المستورد (التاجر) <span class="text-destructive">*</span></Label>
            <Select v-model="form.importer">
              <SelectTrigger><SelectValue :placeholder="bankMerchants.length ? 'اختر التاجر' : 'لا يوجد تجار مسجلون لهذا البنك'" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in bankMerchants" :key="m.id" :value="m.name">{{ m.name }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="bankMerchants.length === 0" class="text-xs text-muted-foreground mt-1">يجب إضافة تجار للبنك أولاً من شاشة سجل التجار.</p>
          </div>
          <div class="space-y-2">
            <Label>مبلغ التمويل <span class="text-destructive">*</span></Label>
            <Input type="number" v-model="form.amount" />
          </div>
          <div class="space-y-2">
            <Label>العملة <span class="text-destructive">*</span></Label>
            <Select v-model="form.currency">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                <SelectItem value="EUR">يورو (EUR)</SelectItem>
                <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>شروط الدفع <span class="text-destructive">*</span></Label>
            <Select v-model="form.payment">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lc">اعتماد مستندي L/C</SelectItem>
                <SelectItem value="dp">دفع مقابل مستندات D/P</SelectItem>
                <SelectItem value="tt">حوالة برقية T/T</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>تاريخ الاستحقاق المتوقع</Label>
            <Input type="date" v-model="form.dueDate" />
          </div>
        </div>
        <div class="space-y-2">
          <Label>ملاحظات إضافية</Label>
          <Textarea :rows="3" v-model="form.notes" />
        </div>
      </div>

      <!-- Step 2 -->
      <div v-show="step === 1" class="space-y-6">
        <h3 class="font-semibold">بيانات المورد والشحنة</h3>
        <div class="grid md:grid-cols-2 gap-5">
          <div class="space-y-2"><Label>اسم المورد <span class="text-destructive">*</span></Label><Input v-model="form.supplier" /></div>
          <div class="space-y-2">
            <Label>بلد المنشأ <span class="text-destructive">*</span></Label>
            <Select v-model="form.country">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="(v, k) in COUNTRY_LABEL" :key="k" :value="k">{{ v }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2"><Label>رقم الفاتورة <span class="text-destructive">*</span></Label><Input v-model="form.invoice" /></div>
          <div class="space-y-2"><Label>تاريخ الفاتورة <span class="text-destructive">*</span></Label><Input type="date" v-model="form.invoiceDate" /></div>
          <div class="space-y-2"><Label>ميناء الشحن</Label><Input v-model="form.shipPort" /></div>
          <div class="space-y-2">
            <Label>ميناء الوصول <span class="text-destructive">*</span></Label>
            <Select v-model="form.arrivalPort">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="(v, k) in PORT_LABEL" :key="k" :value="k">{{ v }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2"><Label>رقم بوليصة الشحن</Label><Input v-model="form.bl" /></div>
          <div class="space-y-2">
            <Label>الجمارك المختصة</Label>
            <Select v-model="form.customs">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aden_c">جمارك عدن</SelectItem>
                <SelectItem value="hod_c">جمارك الحديدة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- Step 3 -->
      <div v-show="step === 2" class="space-y-6">
        <h3 class="font-semibold">رفع الوثائق المطلوبة</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div v-for="d in docNames" :key="d.name"
            :class="cn('border-2 border-dashed rounded-xl p-5 transition-colors',
              uploads[d.name] ? 'border-success/40 bg-success/5' : 'border-border hover:border-accent/40')">
            <input
              :ref="(el: any) => { inputsRef[d.name] = el as HTMLInputElement | null }"
              type="file" accept=".pdf,.jpg,.jpeg,.png" class="hidden"
              @change="(e) => onFile(d.name, e)"
            />
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <div :class="cn('h-11 w-11 rounded-lg grid place-items-center',
                  uploads[d.name] ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')">
                  <FileCheck2 v-if="uploads[d.name]" class="h-5 w-5" />
                  <Upload v-else class="h-5 w-5" />
                </div>
                <div>
                  <div class="font-medium text-sm">{{ d.name }}</div>
                  <div class="text-xs text-muted-foreground">{{ d.required ? 'مطلوب' : 'اختياري' }} · PDF, JPG (حد أقصى 10MB)</div>
                </div>
              </div>
              <Badge v-if="d.required" variant="destructive" class="text-[10px]">إلزامي</Badge>
            </div>
            <div v-if="uploads[d.name]" class="mt-4 pt-4 border-t border-success/20 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2 min-w-0">
                <FileText class="h-4 w-4 text-success shrink-0" />
                <span class="font-medium truncate">{{ uploads[d.name].file.name }}</span>
                <Badge variant="secondary" class="gap-1 text-[10px] shrink-0"><ShieldCheck class="h-3 w-3" /> آمن</Badge>
              </div>
              <div class="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" class="h-7 w-7"
                  @click="preview = { name: uploads[d.name].file.name, url: uploads[d.name].url, type: uploads[d.name].file.type }">
                  <Eye class="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" class="h-7 w-7 text-destructive" @click="removeDoc(d.name)">
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Button v-else variant="outline" size="sm" class="mt-4 w-full" @click="pick(d.name)">
              <Upload class="h-4 w-4 ml-1" /> اضغط للرفع
            </Button>
          </div>
        </div>
        <Dialog :open="!!preview" @update:open="(o: boolean) => { if (!o) preview = null }">
          <DialogContent dir="rtl" class="sm:max-w-3xl">
            <DialogHeader><DialogTitle class="truncate">{{ preview?.name }}</DialogTitle></DialogHeader>
            <template v-if="preview">
              <img v-if="preview.type.startsWith('image/')" :src="preview.url" :alt="preview.name" class="max-h-[70vh] w-full object-contain rounded-md bg-muted" />
              <iframe v-else-if="preview.type === 'application/pdf'" :src="preview.url" :title="preview.name" class="w-full h-[70vh] rounded-md border" />
              <div v-else class="text-sm text-muted-foreground p-6 text-center">
                لا يمكن المعاينة داخل المتصفح. <a :href="preview.url" :download="preview.name" class="text-primary underline">تنزيل الملف</a>
              </div>
            </template>
          </DialogContent>
        </Dialog>
      </div>

      <!-- Step 4 -->
      <div v-show="step === 3" class="space-y-6">
        <h3 class="font-semibold">مراجعة الطلب قبل الإرسال</h3>
        <div class="rounded-xl border bg-muted/30 p-6 space-y-5">
          <div v-for="sec in reviewSections" :key="sec.title">
            <div class="font-medium text-sm mb-3 pb-2 border-b">{{ sec.title }}</div>
            <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div v-for="[k, v] in sec.rows" :key="k" class="flex justify-between">
                <span class="text-muted-foreground">{{ k }}</span>
                <span class="font-medium">{{ v }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-start gap-3 p-4 rounded-lg bg-info/5 border border-info/20">
          <ShieldCheck class="h-5 w-5 text-info mt-0.5 shrink-0" />
          <div class="text-sm">
            <div class="font-medium">إقرار وتعهد</div>
            <p class="text-muted-foreground text-xs mt-1 leading-relaxed">
              أُقر بأن جميع البيانات والمستندات المقدمة صحيحة وكاملة، وأتحمل المسؤولية القانونية عن أي بيانات غير دقيقة.
              سيتم إخضاع الطلب للتدقيق التلقائي للتحقق من الفواتير المكررة والامتثال.
            </p>
          </div>
        </div>
      </div>

      <div class="flex justify-between mt-8 pt-6 border-t">
        <Button variant="outline" :disabled="step === 0" @click="step = Math.max(0, step - 1)">
          <ChevronRight class="h-4 w-4 ml-1" /> السابق
        </Button>
        <div class="flex gap-2">
          <Button variant="outline" @click="persist('draft', 'تم حفظ المسودة')">
            <Save class="h-4 w-4 ml-1" /> حفظ كمسودة
          </Button>
          <Button v-if="step < STEPS.length - 1" @click="step = step + 1">
            التالي <ChevronLeft class="h-4 w-4 mr-1" />
          </Button>
          <Button v-else @click="persist('bank_submitted', 'تم إرسال الطلب بنجاح للمراجعة الداخلية')">
            <Send class="h-4 w-4 ml-1" /> إرسال للمراجعة
          </Button>
        </div>
      </div>
    </Card>
  </div>
</template>