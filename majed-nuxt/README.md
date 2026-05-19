# Majed Nuxt — منصة الواردات (Nuxt 4)

نسخة Nuxt 4 مستقلة من واجهة منصة إدارة وتمويل الواردات للبنك المركزي اليمني، تعمل بـ Mock data محلي.

## التشغيل

```bash
cd majed-nuxt
npm install
npm run dev   # http://localhost:3000
```

## التقنيات

- Nuxt 4 + Vue 3.5 + TypeScript strict
- shadcn-vue (مكونات مخصصة فوق reka-ui)
- Tailwind CSS v4 عبر @tailwindcss/vite
- Pinia + VueUse
- VeeValidate + Zod
- lucide-vue-next + vue-sonner

## الصفحات المنفذة

- `/login` — اختيار مستخدم تجريبي + OTP
- `/` — لوحة معلومات (KPIs + أحدث الطلبات)
- `/requests`, `/requests/new`, `/requests/[id]`
- `/notifications`, `/profile`, `/settings`
- `/audit`, `/reports`, `/merchants`, `/customs`
- `/admin/entities`, `/admin/cby-staff`, `/admin/workflow-docs`
- `/admin/roles` — مصفوفة صلاحيات **للقراءة فقط**
- `/bank/users`

## البيانات

Mock data كامل في `app/lib/mock.ts` و `app/lib/governance.ts` (مطابق لنسخة React 1:1).
يُحفظ في `localStorage` تحت `cby.v2.*`. لإعادة الضبط: **الإعدادات ← إعادة ضبط البيانات**.

## ملاحظات

- نسخة React الأصلية في `/src` خارج هذا المجلد ولا تتأثر.
- منطق سير العمل (التصويت، السويفت، Claim، التحولات) منقول 1:1 في `governance.ts`.
  الصفحات تعرض القراءة + بانرات الإعادة/الرفض؛ الأزرار التفاعلية يمكن توسيعها
  باستدعاء الدوال الجاهزة (`castVote`, `attachSwift`, `transitionTo`, …).
- AppShell يدعم RTL + الوضع الداكن + قائمة جانبية متجاوبة (Sheet للموبايل).

## النشر

```bash
npm run build      # Nitro
npm run preview
npm run generate   # موقع ثابت
```

متوافق مع Vercel / Netlify / Cloudflare Pages / أي مستضيف Nitro.
