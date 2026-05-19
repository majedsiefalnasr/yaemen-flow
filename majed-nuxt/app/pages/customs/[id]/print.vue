<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Printer, ArrowRight, FileSignature, FileText, Download, ZoomIn, ZoomOut, ShieldCheck, AlertTriangle, CheckCircle2, Lock } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useCell } from '@/composables/useCell'
import { requestsCell, logAudit, notify } from '@/lib/governance'
import { canIssueCustoms, displayStatusFor, DEMO_USERS } from '@/lib/mock'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from 'vue-sonner'

const route = useRoute()
const { user } = storeToRefs(useAuthStore())
const all = useCell(requestsCell)
const id = computed(() => route.params.id as string)
const req = computed(() => all.value.find((r) => r.id === id.value))
const zoom = ref(0.85)
const issuing = ref(false)

const issued = computed(() => !!req.value?.customsNo)
const canIssueNow = computed(() => req.value && user.value && canIssueCustoms(req.value, user.value))
const canView = computed(() => !!user.value && (canIssueNow.value || issued.value || user.value.role === 'platform_admin' || user.value.role === 'executive_member'))
const stageBlocked = computed(() => !issued.value && !canIssueNow.value)
const stageStatus = computed(() => req.value && user.value ? displayStatusFor(req.value.stage, user.value.role) : null)

function performIssue() {
  if (!req.value || !user.value) return
  issuing.value = true
  const customsNo = `CD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
  const customsAt = new Date().toISOString()
  requestsCell.set((prev) => prev.map((r) => r.id === req.value!.id
    ? { ...r, customsNo, customsAt, customsBy: user.value!.id, stage: 'completed' as const, progress: 100, lastUpdatedBy: user.value!.id }
    : r))
  logAudit({
    userId: user.value.id, userName: user.value.name, role: user.value.role,
    action: 'إصدار إذن بيان جمركي وإتمام الطلب', ref: req.value.ref,
    fromStage: 'executive_approved', toStage: 'completed', notes: `رقم البيان: ${customsNo}`,
  })
  notify({ title: `${req.value.ref}: صدر إذن إصدار بيان جمركي`, body: `رقم ${customsNo}`, audience: 'all', href: `/customs/${req.value.id}/print` })
  toast.success(`تم إصدار إذن بيان جمركي رقم ${customsNo}`)
  issuing.value = false
}
function doPrint() { if (typeof window !== 'undefined') window.print() }
function confirmIssue() {
  if (typeof window !== 'undefined' && window.confirm('سيتم إصدار إذن بيان جمركي نهائياً. متابعة؟')) performIssue()
}
</script>
<template>
  <div v-if="!user"></div>
  <div v-else-if="!req" class="p-8 text-center max-w-md mx-auto">
    <Card class="p-8 border-destructive/30 bg-destructive/5">
      <AlertTriangle class="h-10 w-10 text-destructive mx-auto mb-3" />
      <h2 class="font-bold text-lg mb-1">الطلب غير موجود</h2>
      <Button as-child variant="outline"><NuxtLink to="/customs"><ArrowRight class="h-4 w-4 ml-1" /> العودة</NuxtLink></Button>
    </Card>
  </div>
  <div v-else-if="!canView" class="p-8 text-center max-w-md mx-auto">
    <Card class="p-8 border-warning/30 bg-warning/5">
      <Lock class="h-10 w-10 text-warning mx-auto mb-3" />
      <h2 class="font-bold text-lg mb-1">غير مصرح</h2>
      <Button as-child variant="outline"><NuxtLink :to="`/requests/${req.id}`"><ArrowRight class="h-4 w-4 ml-1" /> العودة للطلب</NuxtLink></Button>
    </Card>
  </div>
  <div v-else class="space-y-4">
    <div class="print:hidden">
      <Card class="p-4 border-0">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="min-w-0">
            <h1 class="text-lg font-bold flex items-center gap-2"><FileText class="h-5 w-5 text-accent" />{{ issued ? 'إذن إصدار بيان جمركي' : 'معاينة إذن إصدار بيان جمركي' }}</h1>
            <p class="text-xs text-muted-foreground mt-0.5">طلب {{ req.ref }} — {{ req.importer }}</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            <Button variant="outline" as-child><NuxtLink :to="`/requests/${req.id}`"><ArrowRight class="h-4 w-4 ml-1" /> العودة</NuxtLink></Button>
            <Button v-if="issued" @click="doPrint"><Printer class="h-4 w-4 ml-1" /> طباعة / PDF</Button>
            <Button v-else-if="canIssueNow" :disabled="issuing" class="bg-accent hover:bg-accent/90" @click="confirmIssue">
              <FileSignature class="h-4 w-4 ml-1" /> إصدار رسمياً
            </Button>
          </div>
        </div>
        <div v-if="issued" class="mt-4 flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3">
          <CheckCircle2 class="h-5 w-5 text-success shrink-0" />
          <div class="flex-1 text-sm">
            <div class="font-semibold text-success">تم إصدار إذن بيان جمركي بنجاح</div>
            <div class="text-xs text-muted-foreground">رقم البيان <span class="font-mono font-semibold">{{ req.customsNo }}</span> · {{ (DEMO_USERS.find((u) => u.id === req.customsBy)?.name) ?? user.name }} · {{ new Date(req.customsAt!).toLocaleString('ar-EG') }}</div>
          </div>
        </div>
        <div v-else-if="stageBlocked && stageStatus" class="mt-4 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle class="h-5 w-5 text-warning shrink-0" />
          <div class="flex-1 text-sm">
            <div class="font-semibold">لا يمكن الإصدار حالياً</div>
            <div class="text-xs text-muted-foreground">الطلب في مرحلة <span class="font-medium">{{ stageStatus.label }}</span>.</div>
          </div>
        </div>
        <div v-else class="mt-4 flex items-center gap-3 rounded-lg border border-info/30 bg-info/5 p-3">
          <ShieldCheck class="h-5 w-5 text-info shrink-0" />
          <div class="flex-1 text-sm">
            <div class="font-semibold">جاهز للإصدار</div>
            <div class="text-xs text-muted-foreground">راجع المعاينة ثم أصدر الإذن نهائياً.</div>
          </div>
        </div>
      </Card>
    </div>

    <div class="print:hidden rounded-xl overflow-hidden border bg-[oklch(0.22_0.02_260)]">
      <div class="flex items-center justify-between px-4 py-2 bg-[oklch(0.18_0.02_260)] text-white text-xs">
        <div class="flex items-center gap-2">
          <FileText class="h-4 w-4 text-red-400" />
          <span class="font-mono">{{ req.customsNo ?? `DRAFT-${req.ref}` }}.pdf</span>
        </div>
        <div class="flex items-center gap-1">
          <Button size="icon" variant="ghost" class="h-7 w-7 text-white hover:bg-white/10" @click="zoom = Math.max(0.5, zoom - 0.1)"><ZoomOut class="h-3.5 w-3.5" /></Button>
          <span class="tabular-nums w-12 text-center">{{ Math.round(zoom * 100) }}%</span>
          <Button size="icon" variant="ghost" class="h-7 w-7 text-white hover:bg-white/10" @click="zoom = Math.min(1.5, zoom + 0.1)"><ZoomIn class="h-3.5 w-3.5" /></Button>
          <span class="mx-2 h-4 w-px bg-white/20" />
          <Button size="icon" variant="ghost" class="h-7 w-7 text-white hover:bg-white/10" @click="doPrint"><Download class="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div class="overflow-auto max-h-[80vh] py-6 px-2 grid place-items-start justify-center bg-[oklch(0.25_0.02_260)]">
        <div :style="{ transform: `scale(${zoom})`, transformOrigin: 'top center' }">
          <div dir="rtl" :class="cn('bg-white text-black mx-auto shadow-md relative')" :style="{ width: '210mm', minHeight: '297mm', padding: '20mm' }">
            <div v-if="!issued" class="absolute inset-0 grid place-items-center pointer-events-none">
              <div class="text-[140px] font-black text-gray-200/70 -rotate-12 select-none tracking-widest">مسودة</div>
            </div>
            <header class="flex items-start justify-between border-b-2 border-black pb-4 relative">
              <div>
                <div class="text-xs">الجمهورية اليمنية</div>
                <div class="text-lg font-bold">البنك المركزي اليمني</div>
                <div class="text-xs">إدارة تنظيم وتمويل الواردات</div>
              </div>
              <div class="text-center">
                <div class="text-base font-bold">إذن إصدار بيان جمركي</div>
                <div class="text-xs">Customs Declaration Permit</div>
              </div>
              <div class="text-left text-xs">
                <div>رقم البيان: <span class="font-bold">{{ req.customsNo ?? '—' }}</span></div>
                <div>التاريخ: {{ req.customsAt ? new Date(req.customsAt).toLocaleDateString('ar-EG') : '—' }}</div>
                <div>المرجع: {{ req.ref }}</div>
              </div>
            </header>
            <section class="mt-6 relative">
              <h2 class="font-bold text-sm mb-2 bg-black text-white px-2 py-1">بيانات المستورد والجهة الممولة</h2>
              <table class="w-full text-xs border-collapse">
                <tbody>
                  <tr><td class="border p-2 bg-gray-100 w-1/4">المستورد</td><td class="border p-2 w-1/4">{{ req.importer }}</td><td class="border p-2 bg-gray-100 w-1/4">البنك</td><td class="border p-2 w-1/4">{{ req.bank }}</td></tr>
                  <tr><td class="border p-2 bg-gray-100">المبلغ</td><td class="border p-2">{{ req.amount.toLocaleString('en-US') }} {{ req.currency }}</td><td class="border p-2 bg-gray-100">رقم الفاتورة</td><td class="border p-2">{{ req.invoice }}</td></tr>
                  <tr><td class="border p-2 bg-gray-100">المورد</td><td class="border p-2">{{ req.supplier }}</td><td class="border p-2 bg-gray-100">ميناء الوصول</td><td class="border p-2">{{ req.port }}</td></tr>
                  <tr><td class="border p-2 bg-gray-100">نوع البضاعة</td><td class="border p-2" :colspan="3">{{ req.type }}</td></tr>
                </tbody>
              </table>
            </section>
            <section class="mt-10 grid grid-cols-3 gap-6 relative">
              <div class="text-center"><div class="border-t border-black pt-2 mt-12 text-xs">توقيع عضو اللجنة</div></div>
              <div class="text-center"><div class="border-t border-black pt-2 mt-12 text-xs">الختم الرسمي</div></div>
              <div class="text-center"><div class="border-t border-black pt-2 mt-12 text-xs">تأشيرة الجمارك</div></div>
            </section>
            <footer class="mt-12 text-[10px] text-gray-600 border-t pt-2 text-center relative">
              وثيقة صادرة إلكترونياً — البنك المركزي اليمني.
            </footer>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  body { background: white !important; }
  aside, header, footer, nav, .print\:hidden { display: none !important; }
  main { padding: 0 !important; max-width: none !important; }
  @page { size: A4; margin: 0; }
}
</style>