<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Building2, Lock, ShieldCheck, ChevronLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { DEMO_USERS, ROLE_LABELS } from '@/lib/mock'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'

definePageMeta({ layout: 'auth' })

const router = useRouter()
const auth = useAuthStore()
const step = ref<'login' | 'otp'>('login')
const selectedUserId = ref(DEMO_USERS[0].id)
const selected = computed(() => DEMO_USERS.find((u) => u.id === selectedUserId.value)!)

function handleLogin(e: Event) { e.preventDefault(); step.value = 'otp' }
function handleOtp(e: Event) {
  e.preventDefault()
  auth.login(selected.value)
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-background">
    <div class="hidden lg:flex relative bg-gradient-to-br from-primary to-primary/70 text-white p-12 flex-col justify-between overflow-hidden">
      <div>
        <div class="flex items-center gap-3">
          <div class="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-2xl font-bold">ب.م</div>
          <div>
            <div class="font-bold text-lg">البنك المركزي اليمني</div>
            <div class="text-sm text-white/70">Central Bank of Yemen</div>
          </div>
        </div>
      </div>
      <div class="space-y-6">
        <h1 class="text-4xl font-bold leading-tight">منصة إدارة ومراجعة طلبات تمويل الواردات</h1>
        <p class="text-white/80 text-lg leading-relaxed">
          دورة عمل تنظيمية محكمة: إدخال بنكي ← مراجعة داخلية ← اعتماد المساندة ← إرفاق سويفت ← تصويت تنفيذي ← إصدار إذن بيان جمركي.
        </p>
      </div>
      <div class="text-xs text-white/50">محمي بأعلى معايير الأمن السيبراني · ISO 27001</div>
    </div>

    <div class="flex items-center justify-center p-6 sm:p-12">
      <div class="w-full max-w-md">
        <form v-if="step === 'login'" @submit="handleLogin" class="space-y-6">
          <div>
            <h2 class="text-2xl font-bold">تسجيل الدخول</h2>
            <p class="text-sm text-muted-foreground mt-1">أدخل بياناتك للوصول إلى منصة الواردات</p>
          </div>
          <div class="space-y-2"><Label>البريد الإلكتروني المؤسسي</Label><Input type="email" :model-value="selected.email" /></div>
          <div class="space-y-2"><Label>كلمة المرور</Label><Input type="password" model-value="••••••••••" /></div>
          <div class="space-y-2">
            <Label>اختر مستخدم العرض التوضيحي</Label>
            <div class="grid gap-1.5 max-h-72 overflow-y-auto pr-1">
              <button v-for="u in DEMO_USERS" :key="u.id" type="button" @click="selectedUserId = u.id"
                :class="cn('text-right px-3 py-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-2',
                  selectedUserId === u.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40 hover:bg-muted/50')">
                <div class="text-right min-w-0">
                  <div class="font-semibold truncate">{{ u.name }}</div>
                  <div class="text-[10px] text-muted-foreground truncate">{{ u.org }}</div>
                </div>
                <span class="shrink-0 px-2 py-0.5 rounded-full bg-muted text-[10px]">{{ ROLE_LABELS[u.role] }}</span>
              </button>
            </div>
          </div>
          <Button type="submit" class="w-full h-11 text-base">متابعة <ChevronLeft class="h-4 w-4 mr-1" /></Button>
          <div class="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
            <ShieldCheck class="h-3.5 w-3.5" /> مصادقة متعددة العوامل (MFA) مفعّلة
          </div>
        </form>

        <form v-else @submit="handleOtp" class="space-y-6">
          <div>
            <h2 class="text-2xl font-bold">رمز التحقق (OTP)</h2>
            <p class="text-sm text-muted-foreground mt-1">أدخل الرمز المرسل إلى هاتفك المنتهي بـ ••42</p>
          </div>
          <div class="flex gap-2 justify-center" dir="ltr">
            <input v-for="(d, i) in [2,4,8,1,9,6]" :key="i" :value="d" maxlength="1"
              class="h-14 w-12 rounded-lg border-2 text-center text-2xl font-bold focus:border-primary outline-none" />
          </div>
          <Card class="p-4 bg-muted/40 border-dashed">
            <div class="flex items-start gap-3">
              <Lock class="h-4 w-4 mt-0.5 text-accent" />
              <div class="text-xs text-muted-foreground leading-relaxed">
                سيتم تسجيل دخولك بصلاحيات: <span class="font-semibold text-foreground">{{ ROLE_LABELS[selected.role] }}</span>
              </div>
            </div>
          </Card>
          <Button type="submit" class="w-full h-11 text-base">تأكيد ودخول <ChevronLeft class="h-4 w-4 mr-1" /></Button>
          <button type="button" @click="step = 'login'" class="block mx-auto text-xs text-muted-foreground hover:text-foreground">← رجوع</button>
        </form>

        <div class="mt-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Building2 class="h-3.5 w-3.5" /> البنك المركزي اليمني — منصة الواردات v3.0
        </div>
      </div>
    </div>
  </div>
</template>