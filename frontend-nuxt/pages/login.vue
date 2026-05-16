<script setup lang="ts">
import { z } from 'zod'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const api = useApi()

const form = reactive({ email: 'admin@cby.gov.ye', password: 'Password@123' })
const error = ref('')
const loading = ref(false)

const schema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة مرور قصيرة'),
})

async function submit() {
  error.value = ''
  const parsed = schema.safeParse(form)
  if (!parsed.success) { error.value = parsed.error.issues[0].message; return }
  loading.value = true
  try {
    const { token, user } = await api.post('/auth/login', { ...form, device: 'web' })
    auth.setSession(token, user)
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.data?.message || 'فشل تسجيل الدخول'
  } finally { loading.value = false }
}
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2" dir="rtl">
    <div class="hidden lg:flex bg-gradient-to-br from-primary-900 to-primary-500 text-white p-12 flex-col justify-between">
      <div class="flex items-center gap-3">
        <div class="h-14 w-14 grid place-items-center rounded-2xl bg-white/10 backdrop-blur text-2xl font-bold">ب.م</div>
        <div>
          <div class="font-bold text-lg">البنك المركزي اليمني</div>
          <div class="text-sm text-white/70">Central Bank of Yemen</div>
        </div>
      </div>
      <div class="space-y-4">
        <h1 class="text-4xl font-bold leading-tight">منصة إدارة ومراجعة طلبات تمويل الواردات</h1>
        <p class="text-white/80">نظام رقمي متكامل لإدارة دورة حياة طلبات تمويل الواردات بشفافية وكفاءة، مع رقابة ذكية وتدقيق متقدم.</p>
      </div>
      <div class="text-xs text-white/50">محمي بأعلى معايير الأمن السيبراني · ISO 27001</div>
    </div>

    <div class="flex items-center justify-center p-8">
      <form @submit.prevent="submit" class="w-full max-w-md space-y-5">
        <div>
          <h2 class="text-2xl font-bold">تسجيل الدخول</h2>
          <p class="text-sm text-slate-500 mt-1">أدخل بياناتك للوصول إلى المنصة</p>
        </div>
        <div>
          <label class="label">البريد الإلكتروني</label>
          <input v-model="form.email" class="input" type="email" autocomplete="email" required />
        </div>
        <div>
          <label class="label">كلمة المرور</label>
          <input v-model="form.password" class="input" type="password" autocomplete="current-password" required />
        </div>
        <div v-if="error" class="text-sm text-danger bg-red-50 border border-red-200 rounded-lg p-3">{{ error }}</div>
        <button :disabled="loading" class="btn-primary w-full h-11">{{ loading ? '...' : 'دخول' }}</button>
        <div class="text-xs text-slate-500 text-center">
          حسابات تجريبية: admin@cby.gov.ye / ahmed@ybank.ye / kh.ansi@cby.gov.ye — كلمة المرور: Password@123
        </div>
      </form>
    </div>
  </div>
</template>
