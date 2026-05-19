<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus, Search, Edit, Trash2, Building2, Eye } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { useCell } from '@/composables/useCell'
import { ENTITIES, type Merchant } from '@/lib/mock'
import { merchantsCell, logAudit } from '@/lib/governance'
import PageHeader from '@/components/layout/PageHeader.vue'
import RoleGuard from '@/components/workflow/RoleGuard.vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CATEGORIES = ['مواد غذائية', 'أدوية ومستلزمات طبية', 'مشتقات نفطية', 'قطع غيار', 'مواد بناء', 'إلكترونيات']

const { user } = storeToRefs(useAuthStore())
const merchants = useCell(merchantsCell)

const q = ref('')
const statusFilter = ref<'all' | 'active' | 'suspended'>('all')
const bankFilter = ref<string>('all')
const open = ref(false)
const editing = ref<Merchant | null>(null)
const viewing = ref<Merchant | null>(null)

const isPlatform = computed(() => user.value?.role === 'platform_admin')
const isBankAdmin = computed(() => user.value?.role === 'bank_admin')
const canManage = computed(() => isBankAdmin.value)

function entityName(id?: string) { return ENTITIES.find((e) => e.id === id)?.name ?? '—' }

const scoped = computed(() =>
  isBankAdmin.value && user.value?.entityId
    ? merchants.value.filter((m) => m.entityId === user.value!.entityId)
    : merchants.value,
)
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  return scoped.value.filter((m) => {
    if (statusFilter.value !== 'all' && m.status !== statusFilter.value) return false
    if (isPlatform.value && bankFilter.value !== 'all' && m.entityId !== bankFilter.value) return false
    if (!s) return true
    return (
      m.name.toLowerCase().includes(s) ||
      m.cr.toLowerCase().includes(s) ||
      m.tax.toLowerCase().includes(s) ||
      entityName(m.entityId).toLowerCase().includes(s)
    )
  })
})
const stats = computed(() => ({
  total: scoped.value.length,
  active: scoped.value.filter((m) => m.status === 'active').length,
  suspended: scoped.value.filter((m) => m.status === 'suspended').length,
}))

// Dialog form
const draft = ref<Merchant>(blank())
function blank(): Merchant {
  return { id: '', name: '', cr: '', tax: '', address: '', contact: '', category: CATEGORIES[0]!, status: 'active', entityId: user.value?.entityId ?? ENTITIES[0]!.id, transactions: 0 }
}
function openCreate() {
  draft.value = blank()
  open.value = true
}
function openEdit(m: Merchant) {
  draft.value = { ...m, address: m.address === '—' ? '' : m.address, contact: m.contact === '—' ? '' : m.contact }
  editing.value = m
}
const draftValid = computed(() => draft.value.name.trim() && draft.value.cr.trim() && draft.value.tax.trim() && draft.value.entityId)

function saveCreate() {
  if (!draftValid.value || !user.value) return
  const m: Merchant = {
    ...draft.value,
    id: `m_${Date.now()}`,
    name: draft.value.name.trim(), cr: draft.value.cr.trim(), tax: draft.value.tax.trim(),
    address: draft.value.address.trim() || '—',
    contact: draft.value.contact.trim() || '—',
    transactions: 0,
  }
  merchantsCell.set((prev) => [m, ...prev])
  logAudit({ userId: user.value.id, userName: user.value.name, role: user.value.role, action: 'إضافة تاجر جديد', ref: m.cr, notes: m.name })
  toast.success(`تم تسجيل التاجر "${m.name}"`)
  open.value = false
}
function saveEdit() {
  if (!draftValid.value || !user.value || !editing.value) return
  const orig = editing.value
  const m: Merchant = {
    ...draft.value,
    id: orig.id,
    name: draft.value.name.trim(), cr: draft.value.cr.trim(), tax: draft.value.tax.trim(),
    address: draft.value.address.trim() || '—',
    contact: draft.value.contact.trim() || '—',
    transactions: orig.transactions,
  }
  merchantsCell.set((prev) => prev.map((x) => x.id === orig.id ? m : x))
  logAudit({ userId: user.value.id, userName: user.value.name, role: user.value.role, action: 'تعديل بيانات تاجر', ref: m.cr, notes: m.name })
  toast.success('تم تحديث بيانات التاجر')
  editing.value = null
}
function toggleStatus(m: Merchant) {
  merchantsCell.set((prev) => prev.map((x) => x.id === m.id ? { ...x, status: x.status === 'active' ? 'suspended' : 'active' } : x))
}
function removeMerchant(m: Merchant) {
  if (!confirm(`حذف التاجر "${m.name}"؟`) || !user.value) return
  merchantsCell.set((prev) => prev.filter((x) => x.id !== m.id))
  logAudit({ userId: user.value.id, userName: user.value.name, role: user.value.role, action: 'حذف تاجر', ref: m.cr, notes: m.name })
  toast.success('تم حذف التاجر')
}
</script>

<template>
  <RoleGuard :allow="['platform_admin', 'bank_admin']">
    <div>
      <PageHeader
        title="إدارة التجار"
        :subtitle="isPlatform ? 'عرض جميع التجار المسجّلين على المنصّة مع البنوك التابعة لها' : 'تسجيل ومتابعة التجار والمستوردين المرتبطين بالبنك'"
        :breadcrumbs="[{ label: 'الرئيسية', to: '/' }, { label: 'التجار' }]"
      >
        <template #actions>
          <Dialog v-if="canManage" v-model:open="open">
            <DialogTrigger as-child>
              <Button @click="openCreate"><Plus class="h-4 w-4 ml-1" /> تاجر جديد</Button>
            </DialogTrigger>
            <DialogContent dir="rtl" class="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>تسجيل تاجر جديد</DialogTitle>
                <DialogDescription>الحقول المعلّمة بـ * إلزامية.</DialogDescription>
              </DialogHeader>
              <div class="grid sm:grid-cols-2 gap-3 py-2">
                <div class="space-y-1.5"><Label class="text-xs text-muted-foreground">اسم التاجر / الشركة *</Label><Input v-model="draft.name" placeholder="مثال: شركة الكميم للأدوية" /></div>
                <div class="space-y-1.5"><Label class="text-xs text-muted-foreground">رقم السجل التجاري *</Label><Input v-model="draft.cr" placeholder="CR-12345" /></div>
                <div class="space-y-1.5"><Label class="text-xs text-muted-foreground">الرقم الضريبي *</Label><Input v-model="draft.tax" placeholder="4123456" /></div>
                <div class="space-y-1.5"><Label class="text-xs text-muted-foreground">هاتف التواصل</Label><Input v-model="draft.contact" placeholder="+9677…" /></div>
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground">القطاع / النشاط</Label>
                  <Select v-model="draft.category">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div class="space-y-1.5">
                  <Label class="text-xs text-muted-foreground">الحالة</Label>
                  <Select v-model="draft.status">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="suspended">موقوف</SelectItem></SelectContent>
                  </Select>
                </div>
                <div class="sm:col-span-2 space-y-1.5">
                  <Label class="text-xs text-muted-foreground">البنك التابع له *</Label>
                  <Select v-model="draft.entityId" :disabled="!!user?.entityId">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem v-for="e in ENTITIES" :key="e.id" :value="e.id">{{ e.name }}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div class="sm:col-span-2 space-y-1.5"><Label class="text-xs text-muted-foreground">العنوان</Label><Input v-model="draft.address" placeholder="المدينة – الشارع" /></div>
              </div>
              <DialogFooter><Button :disabled="!draftValid" @click="saveCreate">حفظ التاجر</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </template>
      </PageHeader>

      <div class="grid grid-cols-3 gap-3 mb-4">
        <Card class="p-4 shadow-card border-0">
          <div class="h-9 w-9 rounded-lg grid place-items-center bg-primary/10 text-primary"><Building2 class="h-4 w-4" /></div>
          <div class="mt-2 text-2xl font-bold tabular-nums">{{ stats.total }}</div>
          <div class="text-xs text-muted-foreground">إجمالي</div>
        </Card>
        <Card class="p-4 shadow-card border-0">
          <div class="h-9 w-9 rounded-lg grid place-items-center bg-success/10 text-success"><Building2 class="h-4 w-4" /></div>
          <div class="mt-2 text-2xl font-bold tabular-nums">{{ stats.active }}</div>
          <div class="text-xs text-muted-foreground">نشط</div>
        </Card>
        <Card class="p-4 shadow-card border-0">
          <div class="h-9 w-9 rounded-lg grid place-items-center bg-destructive/10 text-destructive"><Building2 class="h-4 w-4" /></div>
          <div class="mt-2 text-2xl font-bold tabular-nums">{{ stats.suspended }}</div>
          <div class="text-xs text-muted-foreground">موقوف</div>
        </Card>
      </div>

      <Card class="p-4 mb-4 shadow-card border-0 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div class="relative flex-1">
          <Search class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input v-model="q" class="pr-10" :placeholder="isPlatform ? 'بحث بالاسم، السجل، الضريبي، أو البنك...' : 'بحث برقم السجل، الرقم الضريبي، أو الاسم...'" />
        </div>
        <Select v-if="isPlatform" v-model="bankFilter">
          <SelectTrigger class="w-full sm:w-56"><SelectValue placeholder="البنك" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل البنوك</SelectItem>
            <SelectItem v-for="e in ENTITIES" :key="e.id" :value="e.id">{{ e.name }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="statusFilter">
          <SelectTrigger class="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشط فقط</SelectItem>
            <SelectItem value="suspended">موقوف فقط</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card v-if="isPlatform" class="shadow-card border-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-muted/40 text-xs text-muted-foreground">
              <tr class="text-right">
                <th class="p-3 font-semibold">التاجر</th>
                <th class="p-3 font-semibold">السجل التجاري</th>
                <th class="p-3 font-semibold">الرقم الضريبي</th>
                <th class="p-3 font-semibold">القطاع</th>
                <th class="p-3 font-semibold">البنك التابع له</th>
                <th class="p-3 font-semibold">الحالة</th>
                <th class="p-3 font-semibold tabular-nums">المعاملات</th>
                <th class="p-3 font-semibold w-12"></th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="m in filtered" :key="m.id" class="hover:bg-muted/30">
                <td class="p-3 font-medium">{{ m.name }}</td>
                <td class="p-3 text-muted-foreground">{{ m.cr }}</td>
                <td class="p-3 text-muted-foreground tabular-nums">{{ m.tax }}</td>
                <td class="p-3 text-muted-foreground">{{ m.category }}</td>
                <td class="p-3"><Badge variant="outline" class="font-normal"><Building2 class="h-3 w-3 ml-1" />{{ entityName(m.entityId) }}</Badge></td>
                <td class="p-3"><Badge :class="m.status === 'active' ? 'bg-success/15 text-success border-0' : 'bg-destructive/15 text-destructive border-0'">{{ m.status === 'active' ? 'نشط' : 'موقوف' }}</Badge></td>
                <td class="p-3 tabular-nums font-semibold">{{ m.transactions }}</td>
                <td class="p-3"><Button size="icon" variant="ghost" class="h-8 w-8" @click="viewing = m"><Eye class="h-4 w-4" /></Button></td>
              </tr>
              <tr v-if="filtered.length === 0"><td colspan="8" class="p-8 text-center text-muted-foreground">لا توجد نتائج مطابقة.</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card v-for="m in filtered" :key="m.id" class="p-5 shadow-card border-0 hover:shadow-soft transition-shadow flex flex-col">
          <div class="flex items-start justify-between mb-3">
            <div class="h-12 w-12 rounded-xl bg-gradient-hero text-white grid place-items-center"><Building2 class="h-6 w-6" /></div>
            <Badge :class="m.status === 'active' ? 'bg-success/15 text-success border-0' : 'bg-destructive/15 text-destructive border-0'">{{ m.status === 'active' ? 'نشط' : 'موقوف' }}</Badge>
          </div>
          <div class="font-semibold text-base">{{ m.name }}</div>
          <div class="text-xs text-muted-foreground">{{ m.category }}</div>
          <div class="mt-4 space-y-1.5 text-xs">
            <div class="flex justify-between gap-2"><span class="text-muted-foreground shrink-0">السجل التجاري</span><span class="font-medium text-end truncate">{{ m.cr }}</span></div>
            <div class="flex justify-between gap-2"><span class="text-muted-foreground shrink-0">الرقم الضريبي</span><span class="font-medium text-end truncate">{{ m.tax }}</span></div>
            <div class="flex justify-between gap-2"><span class="text-muted-foreground shrink-0">البنك</span><span class="font-medium text-end truncate">{{ entityName(m.entityId) }}</span></div>
            <div class="flex justify-between gap-2"><span class="text-muted-foreground shrink-0">العنوان</span><span class="font-medium text-end truncate">{{ m.address }}</span></div>
            <div class="flex justify-between gap-2"><span class="text-muted-foreground shrink-0">هاتف</span><span class="font-medium text-end truncate">{{ m.contact }}</span></div>
          </div>
          <div class="mt-auto pt-4 border-t flex items-center justify-between">
            <div class="text-xs"><span class="text-muted-foreground">المعاملات: </span><span class="font-bold tabular-nums">{{ m.transactions }}</span></div>
            <div v-if="canManage" class="flex gap-1">
              <Button size="sm" variant="ghost" class="h-8" @click="toggleStatus(m)">{{ m.status === 'active' ? 'إيقاف' : 'تفعيل' }}</Button>
              <Button size="icon" variant="ghost" class="h-8 w-8" @click="openEdit(m)"><Edit class="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant="ghost" class="h-8 w-8 text-destructive" @click="removeMerchant(m)"><Trash2 class="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </Card>
        <Card v-if="filtered.length === 0" class="p-8 col-span-full text-center text-sm text-muted-foreground border-0 shadow-card">لا توجد نتائج مطابقة.</Card>
      </div>

      <!-- Edit Dialog -->
      <Dialog :open="!!editing" @update:open="(v: boolean) => { if (!v) editing = null }">
        <DialogContent dir="rtl" class="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل بيانات التاجر</DialogTitle>
            <DialogDescription>الحقول المعلّمة بـ * إلزامية.</DialogDescription>
          </DialogHeader>
          <div class="grid sm:grid-cols-2 gap-3 py-2">
            <div class="space-y-1.5"><Label class="text-xs text-muted-foreground">اسم التاجر / الشركة *</Label><Input v-model="draft.name" /></div>
            <div class="space-y-1.5"><Label class="text-xs text-muted-foreground">رقم السجل التجاري *</Label><Input v-model="draft.cr" /></div>
            <div class="space-y-1.5"><Label class="text-xs text-muted-foreground">الرقم الضريبي *</Label><Input v-model="draft.tax" /></div>
            <div class="space-y-1.5"><Label class="text-xs text-muted-foreground">هاتف التواصل</Label><Input v-model="draft.contact" /></div>
            <div class="space-y-1.5">
              <Label class="text-xs text-muted-foreground">القطاع / النشاط</Label>
              <Select v-model="draft.category">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</SelectItem></SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs text-muted-foreground">الحالة</Label>
              <Select v-model="draft.status">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="suspended">موقوف</SelectItem></SelectContent>
              </Select>
            </div>
            <div class="sm:col-span-2 space-y-1.5">
              <Label class="text-xs text-muted-foreground">البنك التابع له *</Label>
              <Select v-model="draft.entityId">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem v-for="e in ENTITIES" :key="e.id" :value="e.id">{{ e.name }}</SelectItem></SelectContent>
              </Select>
            </div>
            <div class="sm:col-span-2 space-y-1.5"><Label class="text-xs text-muted-foreground">العنوان</Label><Input v-model="draft.address" /></div>
          </div>
          <DialogFooter><Button :disabled="!draftValid" @click="saveEdit">حفظ التعديلات</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- View Dialog -->
      <Dialog :open="!!viewing" @update:open="(v: boolean) => { if (!v) viewing = null }">
        <DialogContent v-if="viewing" dir="rtl" class="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2"><Building2 class="h-5 w-5" /> {{ viewing.name }}</DialogTitle>
            <DialogDescription>تفاصيل التاجر — عرض فقط</DialogDescription>
          </DialogHeader>
          <div class="grid sm:grid-cols-2 gap-3 py-2 text-sm">
            <div class="space-y-0.5"><div class="text-xs text-muted-foreground">السجل التجاري</div><div class="font-medium">{{ viewing.cr }}</div></div>
            <div class="space-y-0.5"><div class="text-xs text-muted-foreground">الرقم الضريبي</div><div class="font-medium">{{ viewing.tax }}</div></div>
            <div class="space-y-0.5"><div class="text-xs text-muted-foreground">القطاع</div><div class="font-medium">{{ viewing.category }}</div></div>
            <div class="space-y-0.5"><div class="text-xs text-muted-foreground">الحالة</div><div class="font-medium">{{ viewing.status === 'active' ? 'نشط' : 'موقوف' }}</div></div>
            <div class="space-y-0.5"><div class="text-xs text-muted-foreground">البنك التابع له</div><div class="font-medium">{{ entityName(viewing.entityId) }}</div></div>
            <div class="space-y-0.5"><div class="text-xs text-muted-foreground">عدد المعاملات</div><div class="font-medium">{{ viewing.transactions }}</div></div>
            <div class="sm:col-span-2 space-y-0.5"><div class="text-xs text-muted-foreground">العنوان</div><div class="font-medium">{{ viewing.address }}</div></div>
            <div class="sm:col-span-2 space-y-0.5"><div class="text-xs text-muted-foreground">هاتف التواصل</div><div class="font-medium">{{ viewing.contact }}</div></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  </RoleGuard>
</template>