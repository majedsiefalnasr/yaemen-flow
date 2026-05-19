<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useCell } from '@/composables/useCell'
import { requestsCell } from '@/lib/governance'
import {
  ROLE_LABELS, CATEGORY_DIST,
  visibleRequestsFor, type ImportRequest, type Role, type User,
} from '@/lib/mock'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  FileText, CheckCircle2, XCircle, Clock,
  AlertTriangle, ShieldCheck, FilePlus2, Inbox, RefreshCw, Send,
  Vote, Upload, ListChecks, FileSearch, Users as UsersIcon,
  Building2, BarChart3, Bell,
} from 'lucide-vue-next'
import DashKpis from '@/components/dashboard/DashKpis.vue'
import DashActions from '@/components/dashboard/DashActions.vue'
import DashRecent from '@/components/dashboard/DashRecent.vue'
import DashAreaChart from '@/components/dashboard/DashAreaChart.vue'

definePageMeta({ layout: 'default' })

const { user } = storeToRefs(useAuthStore())
const all = useCell(requestsCell)
const scoped = computed<ImportRequest[]>(() =>
  user.value ? visibleRequestsFor(user.value as User, all.value) : [],
)
const role = computed<Role | null>(() => (user.value?.role ?? null) as Role | null)
const uid = computed(() => user.value?.id ?? '')

const CHART_COLORS = [
  'oklch(0.28 0.09 255)','oklch(0.65 0.14 195)','oklch(0.7 0.15 75)',
  'oklch(0.6 0.18 25)','oklch(0.55 0.15 290)','oklch(0.5 0.1 160)',
]
const cnt = (st: string[]) => scoped.value.filter((r) => st.includes(r.stage)).length

// Intake
const intakeKpis = computed(() => [
  { label: 'مسودات لم تُقدَّم', value: cnt(['draft']), icon: FileText, tone: 'text-muted-foreground bg-muted' },
  { label: 'بحاجة لتعديل', value: cnt(['support_returned']), icon: RefreshCw, tone: 'text-warning bg-warning/10' },
  { label: 'قيد المعالجة', value: cnt(['bank_submitted','bank_internal_review','bank_approved','support_review','support_approved','swift_attached','executive_voting','executive_approved']), icon: Clock, tone: 'text-info bg-info/10' },
  { label: 'مكتمل / صدر البيان', value: cnt(['customs_released','completed']), icon: CheckCircle2, tone: 'text-success bg-success/10' },
])
const intakeActions = [
  { label: 'إنشاء طلب جديد', description: 'ابدأ طلب تمويل جديد', icon: FilePlus2, href: '/requests/new', primary: true, tone: 'bg-accent/10 text-accent' },
  { label: 'متابعة طلباتي', description: 'كل ما قمت بإنشائه', icon: FileSearch, href: '/requests', tone: 'bg-primary/10 text-primary' },
  { label: 'الإشعارات', description: 'آخر التحديثات على طلباتك', icon: Bell, href: '/notifications', tone: 'bg-info/10 text-info' },
]
const intakeReturned = computed(() => scoped.value.filter((r) => r.stage === 'support_returned').slice(0, 5))
const intakeDrafts = computed(() => scoped.value.filter((r) => r.stage === 'draft').slice(0, 5))

// Reviewer
const reviewerKpis = computed(() => [
  { label: 'بانتظار مراجعتي', value: cnt(['bank_submitted','bank_internal_review']), icon: Inbox, tone: 'text-warning bg-warning/10', href: '/requests' },
  { label: 'قيد البنك المركزي', value: cnt(['bank_approved','support_review']), icon: Clock, tone: 'text-info bg-info/10' },
  { label: 'مُعاد للتعديل', value: cnt(['support_returned']), icon: RefreshCw, tone: 'text-destructive bg-destructive/10' },
  { label: 'مُعتمد / مكتمل', value: cnt(['executive_approved','customs_released','completed']), icon: CheckCircle2, tone: 'text-success bg-success/10' },
])
const reviewerActions = computed(() => [
  { label: 'طابور المراجعة', description: `${cnt(['bank_submitted','bank_internal_review'])} طلب بانتظارك`, icon: ListChecks, href: '/requests', primary: true, tone: 'bg-warning/10 text-warning' },
  { label: 'كل الطلبات', description: 'نطاق بنكي كامل', icon: FileSearch, href: '/requests', tone: 'bg-primary/10 text-primary' },
])
const reviewerQueue = computed(() => scoped.value.filter((r) => ['bank_submitted','bank_internal_review'].includes(r.stage)).slice(0, 6))

// SWIFT
const swiftKpis = computed(() => [
  { label: 'بانتظار رفع السويفت', value: cnt(['support_approved']), icon: Upload, tone: 'text-warning bg-warning/10', href: '/requests' },
  { label: 'تم رفع السويفت', value: cnt(['swift_attached','executive_voting']), icon: Send, tone: 'text-info bg-info/10' },
  { label: 'مُعتمد نهائياً', value: cnt(['executive_approved','customs_released','completed']), icon: CheckCircle2, tone: 'text-success bg-success/10' },
  { label: 'مرفوض نهائياً', value: cnt(['executive_rejected']), icon: XCircle, tone: 'text-destructive bg-destructive/10' },
])
const swiftActions = computed(() => [
  { label: 'طابور رفع السويفت', description: `${cnt(['support_approved'])} طلب بانتظار رفع MT103`, icon: Upload, href: '/requests', primary: true, tone: 'bg-accent/10 text-accent' },
])
const swiftQueue = computed(() => scoped.value.filter((r) => r.stage === 'support_approved').slice(0, 6))

// Support
const supportKpis = computed(() => [
  { label: 'بانتظار المطالبة', value: scoped.value.filter((r) => r.stage === 'bank_approved').length, icon: Inbox, tone: 'text-warning bg-warning/10' },
  { label: 'أعمل عليها الآن', value: scoped.value.filter((r) => r.stage === 'support_review' && r.supportClaimedBy === uid.value).length, icon: ShieldCheck, tone: 'text-accent bg-accent/10' },
  { label: 'محجوزة لأعضاء آخرين', value: scoped.value.filter((r) => r.stage === 'support_review' && r.supportClaimedBy && r.supportClaimedBy !== uid.value).length, icon: UsersIcon, tone: 'text-muted-foreground bg-muted' },
  { label: 'اعتمدتُها مؤخراً', value: cnt(['support_approved']), icon: CheckCircle2, tone: 'text-success bg-success/10' },
])
const supportActions = computed(() => [
  { label: 'طابور المساندة', description: `${scoped.value.filter((r) => r.stage === 'bank_approved').length} طلب جاهز للمراجعة`, icon: ListChecks, href: '/requests', primary: true, tone: 'bg-warning/10 text-warning' },
  { label: 'التقارير والإحصاءات', icon: BarChart3, href: '/reports', tone: 'bg-primary/10 text-primary' },
])
const supportQueue = computed(() =>
  scoped.value.filter((r) => r.stage === 'bank_approved' || (r.stage === 'support_review' && r.supportClaimedBy === uid.value)).slice(0, 6),
)

// Executive
const execKpis = computed(() => [
  { label: 'طابور التصويت', value: cnt(['swift_attached','executive_voting']), icon: Vote, tone: 'text-chart-5 bg-chart-5/10', href: '/requests' },
  { label: 'قرارات اعتماد', value: cnt(['executive_approved','customs_released','completed']), icon: CheckCircle2, tone: 'text-success bg-success/10' },
  { label: 'قرارات رفض', value: cnt(['executive_rejected']), icon: XCircle, tone: 'text-destructive bg-destructive/10' },
])
const execActions = computed(() => [
  { label: 'طابور التصويت', description: `${cnt(['swift_attached','executive_voting'])} طلب بانتظار التصويت`, icon: Vote, href: '/requests', primary: true, tone: 'bg-chart-5/10 text-chart-5' },
  { label: 'التقارير', icon: BarChart3, href: '/reports', tone: 'bg-primary/10 text-primary' },
])
const execQueue = computed(() => scoped.value.filter((r) => ['swift_attached','executive_voting'].includes(r.stage)).slice(0, 6))

// Bank Admin
const bankAdminKpis = computed(() => [
  { label: 'إجمالي طلبات البنك', value: scoped.value.length, icon: FileText, tone: 'text-primary bg-primary/10' },
  { label: 'مراجعة داخلية معلّقة', value: cnt(['bank_submitted','bank_internal_review']), icon: Clock, tone: 'text-warning bg-warning/10' },
  { label: 'قيد البنك المركزي', value: cnt(['bank_approved','support_review','support_approved','swift_attached','executive_voting']), icon: Send, tone: 'text-info bg-info/10' },
  { label: 'مُعتمد', value: cnt(['executive_approved','customs_released','completed']), icon: CheckCircle2, tone: 'text-success bg-success/10' },
])
const bankAdminActions = [
  { label: 'طلب جديد', icon: FilePlus2, href: '/requests/new', tone: 'bg-accent/10 text-accent', primary: true },
  { label: 'إدارة التجار', icon: Building2, href: '/merchants', tone: 'bg-info/10 text-info' },
  { label: 'مستخدمو البنك', icon: UsersIcon, href: '/bank/users', tone: 'bg-primary/10 text-primary' },
  { label: 'التقارير', icon: BarChart3, href: '/reports', tone: 'bg-chart-5/10 text-chart-5' },
]

// Platform Admin
const platformKpis = computed(() => [
  { label: 'إجمالي الطلبات', value: scoped.value.length, icon: FileText, tone: 'text-primary bg-primary/10' },
  { label: 'طلبات معتمدة', value: cnt(['executive_approved','customs_released','completed']), icon: CheckCircle2, tone: 'text-success bg-success/10' },
  { label: 'قيد المعالجة', value: cnt(['draft','bank_submitted','bank_internal_review','bank_approved','support_review','support_returned','support_approved','swift_attached','executive_voting']), icon: Clock, tone: 'text-warning bg-warning/10' },
  { label: 'طلبات مرفوضة', value: cnt(['support_rejected','executive_rejected']), icon: XCircle, tone: 'text-destructive bg-destructive/10' },
])
const platformActions = [
  { label: 'سجل التدقيق', icon: FileSearch, href: '/audit', tone: 'bg-info/10 text-info', primary: true },
  { label: 'التقارير', icon: BarChart3, href: '/reports', tone: 'bg-chart-5/10 text-chart-5' },
  { label: 'مستخدمي النظام', icon: UsersIcon, href: '/admin/cby-staff', tone: 'bg-primary/10 text-primary' },
  { label: 'إدارة الجهات', icon: Building2, href: '/admin/entities', tone: 'bg-warning/10 text-warning' },
  { label: 'الإشعارات', icon: Bell, href: '/notifications', tone: 'bg-muted text-muted-foreground' },
]
const platformAlerts = [
  { icon: AlertTriangle, tone: 'text-destructive bg-destructive/10', title: 'فاتورة مكررة', body: 'INV-2024028 على طلبين', time: 'منذ 12 د' },
  { icon: ShieldCheck, tone: 'text-warning bg-warning/10', title: 'طلب عالي المخاطر', body: 'IMP-2025-1031 يستلزم مراجعة', time: 'منذ 45 د' },
  { icon: CheckCircle2, tone: 'text-success bg-success/10', title: 'اعتماد دفعة طلبات', body: '12 طلب اعتُمدت اليوم', time: 'اليوم 10:15' },
]
const topBanks = [
  { bank: 'اليمني للإنشاء', requests: 184, value: 12.4 },
  { bank: 'التضامن', requests: 156, value: 9.8 },
  { bank: 'سبأ الإسلامي', requests: 142, value: 8.6 },
  { bank: 'اليمن والكويت', requests: 128, value: 7.2 },
  { bank: 'القاسمي', requests: 98, value: 5.4 },
  { bank: 'الأمل للتمويل', requests: 76, value: 3.8 },
]
const bankBars = computed(() => {
  const max = Math.max(...topBanks.map((b) => b.requests))
  return topBanks.map((b) => ({ ...b, pct: (b.requests / max) * 100, valPct: (b.value / 15) * 100 }))
})

// Pie chart for categories
const pieSlices = computed(() => {
  const total = CATEGORY_DIST.reduce((s, c) => s + c.value, 0)
  let a0 = -Math.PI / 2
  return CATEGORY_DIST.map((c, i) => {
    const a1 = a0 + (c.value / total) * Math.PI * 2
    const large = a1 - a0 > Math.PI ? 1 : 0
    const r = 75, ir = 45, cx = 100, cy = 100
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    const ix0 = cx + ir * Math.cos(a1), iy0 = cy + ir * Math.sin(a1)
    const ix1 = cx + ir * Math.cos(a0), iy1 = cy + ir * Math.sin(a0)
    const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${ix0} ${iy0} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`
    a0 = a1
    return { d, color: CHART_COLORS[i % CHART_COLORS.length], name: c.name, value: c.value }
  })
})

const greetingName = computed(() => user.value?.name?.split(' ')[0] ?? '')
const showNewBtn = computed(() => role.value === 'bank_intake' || role.value === 'bank_admin')
</script>

<template>
  <div v-if="user" class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">أهلاً، {{ greetingName }} 👋</h1>
        <p class="text-sm text-muted-foreground">لوحة {{ ROLE_LABELS[user.role] }}</p>
      </div>
      <NuxtLink v-if="showNewBtn" to="/requests/new">
        <Button><FilePlus2 class="h-4 w-4 ml-1" /> طلب جديد</Button>
      </NuxtLink>
    </div>

    <!-- INTAKE -->
    <template v-if="role === 'bank_intake'">
      <DashKpis :kpis="intakeKpis" />
      <DashActions :actions="intakeActions" />
      <Card v-if="intakeReturned.length" class="p-5 shadow-card border-0 border-r-4 border-r-warning">
        <div class="flex items-center gap-2 mb-3">
          <AlertTriangle class="h-4 w-4 text-warning" />
          <h3 class="font-semibold">طلبات تتطلب تعديلاً منك ({{ intakeReturned.length }})</h3>
        </div>
        <div class="space-y-2">
          <NuxtLink v-for="r in intakeReturned" :key="r.id" :to="`/requests/${r.id}`"
            class="flex items-center justify-between p-3 rounded-lg border hover:border-warning/50 hover:bg-warning/5">
            <div>
              <div class="font-mono text-xs text-accent">{{ r.ref }}</div>
              <div class="text-sm">{{ r.importer }}</div>
            </div>
            <div class="text-xs text-muted-foreground">{{ r.amount.toLocaleString('en-US') }} {{ r.currency }}</div>
          </NuxtLink>
        </div>
      </Card>
      <div class="grid gap-4 lg:grid-cols-2 min-w-0">
        <DashRecent :rows="intakeDrafts" role="bank_intake" title="مسوداتي" empty-text="لا توجد مسودات حالياً." />
        <DashRecent :rows="scoped.slice(0, 5)" role="bank_intake" title="آخر نشاطي" />
      </div>
    </template>

    <!-- REVIEWER -->
    <template v-else-if="role === 'bank_reviewer'">
      <DashKpis :kpis="reviewerKpis" />
      <DashActions :actions="reviewerActions" />
      <DashRecent :rows="reviewerQueue" role="bank_reviewer" title="طابور المراجعة الحالي" empty-text="لا توجد طلبات بانتظار مراجعتك." />
    </template>

    <!-- SWIFT -->
    <template v-else-if="role === 'bank_swift'">
      <DashKpis :kpis="swiftKpis" />
      <DashActions :actions="swiftActions" />
      <DashRecent :rows="swiftQueue" role="bank_swift" title="طابور رفع السويفت" empty-text="لا توجد طلبات بانتظار السويفت." />
    </template>

    <!-- SUPPORT -->
    <template v-else-if="role === 'support_member'">
      <DashKpis :kpis="supportKpis" />
      <DashActions :actions="supportActions" />
      <DashRecent :rows="supportQueue" role="support_member" title="طابور عملي" empty-text="لا توجد طلبات حالياً." />
    </template>

    <!-- EXECUTIVE -->
    <template v-else-if="role === 'executive_member' || role === 'committee_manager'">
      <DashKpis :kpis="execKpis" />
      <DashActions :actions="execActions" />
      <DashRecent :rows="execQueue" role="executive_member" title="طلبات بانتظار تصويتك" empty-text="لا توجد طلبات للتصويت." />
    </template>

    <!-- BANK ADMIN -->
    <template v-else-if="role === 'bank_admin'">
      <DashKpis :kpis="bankAdminKpis" />
      <DashActions :actions="bankAdminActions" />
      <Card class="p-5 shadow-card border-0">
        <div class="mb-4">
          <h3 class="font-semibold">حركة طلبات البنك الشهرية</h3>
          <p class="text-xs text-muted-foreground">المُقدَّم مقابل المُعتمد</p>
        </div>
        <DashAreaChart />
      </Card>
      <DashRecent :rows="scoped.slice(0, 6)" role="bank_admin" />
    </template>

    <!-- PLATFORM ADMIN -->
    <template v-else-if="role === 'platform_admin'">
      <DashKpis :kpis="platformKpis" />
      <DashActions :actions="platformActions" />

      <div class="grid gap-4 lg:grid-cols-3 min-w-0">
        <Card class="p-5 lg:col-span-2 shadow-card border-0 min-w-0">
          <div class="mb-4">
            <h3 class="font-semibold">حركة الطلبات الشهرية</h3>
            <p class="text-xs text-muted-foreground">المُقدَّم مقابل المُعتمد</p>
          </div>
          <DashAreaChart />
        </Card>
        <Card class="p-5 shadow-card border-0 min-w-0">
          <h3 class="font-semibold mb-1">توزيع فئات الواردات</h3>
          <p class="text-xs text-muted-foreground mb-4">حسب نوع البضاعة</p>
          <svg viewBox="0 0 200 200" class="w-full h-44 mx-auto block">
            <path v-for="(s, i) in pieSlices" :key="i" :d="s.d" :fill="s.color" />
          </svg>
          <div class="space-y-1.5 mt-3">
            <div v-for="(c, i) in CATEGORY_DIST.slice(0, 4)" :key="c.name" class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full" :style="{ background: CHART_COLORS[i] }" />
                {{ c.name }}
              </div>
              <span class="font-semibold">{{ c.value }}%</span>
            </div>
          </div>
        </Card>
      </div>

      <div class="grid gap-4 lg:grid-cols-3 min-w-0">
        <div class="lg:col-span-2 min-w-0">
          <DashRecent :rows="scoped.slice(0, 6)" role="platform_admin" />
        </div>
        <Card class="p-5 shadow-card border-0 min-w-0">
          <h3 class="font-semibold mb-4">تنبيهات الامتثال</h3>
          <div class="space-y-3">
            <div v-for="(a, i) in platformAlerts" :key="i" class="flex gap-3 p-3 rounded-lg border hover:border-accent/40 transition-colors">
              <div :class="cn('h-9 w-9 rounded-lg grid place-items-center shrink-0', a.tone)">
                <component :is="a.icon" class="h-4 w-4" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm">{{ a.title }}</div>
                <div class="text-xs text-muted-foreground">{{ a.body }}</div>
                <div class="text-[10px] text-muted-foreground mt-1">{{ a.time }}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card class="p-5 shadow-card border-0">
        <div class="mb-4">
          <h3 class="font-semibold">أنشط البنوك التجارية</h3>
          <p class="text-xs text-muted-foreground">عدد الطلبات هذا الربع</p>
        </div>
        <div class="space-y-3">
          <div v-for="b in bankBars" :key="b.bank" class="text-xs">
            <div class="flex justify-between mb-1.5">
              <span class="font-medium">{{ b.bank }}</span>
              <span class="tabular-nums text-muted-foreground">{{ b.requests }} طلب · {{ b.value }}م$</span>
            </div>
            <div class="space-y-1">
              <div class="h-2 rounded" :style="{ width: b.pct + '%', background: CHART_COLORS[0] }" />
              <div class="h-2 rounded" :style="{ width: b.valPct + '%', background: CHART_COLORS[1] }" />
            </div>
          </div>
        </div>
      </Card>
    </template>
  </div>
</template>
