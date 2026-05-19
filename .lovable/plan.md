# خطة: استبدال الواجهة بـ Nuxt 4 + shadcn-vue

## ⚠️ تحذير حرج قبل البدء

مشروع Lovable مبني على قالب **TanStack Start (React)** — وهو القالب الوحيد المدعوم رسمياً على المنصة. تحويله إلى Nuxt 4 يعني:

1. **الـ Preview المباشر داخل Lovable سيتوقف عن العمل بشكل شبه مؤكد** — نظام البناء والـ dev server في Lovable مربوط بـ Vite + TanStack وليس Nuxt/Nitro.
2. **النشر (Publish) عبر Lovable لن يعمل** — قالب النشر متوقع React SSR على Cloudflare Workers، وليس Nuxt/Nitro.
3. **أدوات Lovable Cloud / Auth / السكانر الأمني** كلها مصممة لـ React وستفقد التكامل.
4. **vite.config.ts و wrangler.jsonc و src/server.ts و src/start.ts** كلها روابط للقالب الحالي.

عملياً: بعد التحويل، المشروع سيصبح "كود Nuxt مخزّن في Lovable" بدون قدرة على المعاينة أو النشر من داخل المنصة — يجب تشغيله محلياً (`npm run dev`) أو نشره خارجياً (Vercel/Netlify).

**توصيتي:** إذا الهدف Vue stack، الأفضل عمل الـ Nuxt كمشروع منفصل خارج Lovable. لكن بناءً على اختيارك "استبدال كامل"، الخطة بالأسفل تنفذ ذلك.

---

## ما سيتم تنفيذه

### 1. هيكل المشروع
- حذف: `src/` بالكامل، `vite.config.ts`، `wrangler.jsonc`، `src/server.ts/start.ts/router.tsx/routeTree.gen.ts`، `.lovable/project.json` يُحدّث.
- إضافة: `nuxt.config.ts`، `app.vue`، `app/` (Nuxt 4 srcDir الجديد) يحوي `pages/`, `layouts/`, `components/`, `composables/`, `stores/`, `lib/`, `assets/`.
- `package.json` يُعاد كتابته كاملاً بالاعتماديات المطلوبة.

### 2. الاعتماديات
```
nuxt ^4.4.5, vue ^3.5 (Vue 4 لم يصدر بعد — سنستخدم Vue 3.5 وهو ما يدعمه Nuxt 4)
@nuxtjs/tailwindcss-vite + tailwindcss ^4.1, @tailwindcss/vite
shadcn-vue ^2.7.3 + reka-ui (المتطلب) + class-variance-authority + clsx + tailwind-merge
@pinia/nuxt + pinia ^2.3, @vueuse/nuxt + @vueuse/core ^13.1
vee-validate + @vee-validate/zod + zod ^3
lucide-vue-next
@nuxtjs/google-fonts (للخط Cairo)
```

### 3. نقل الـ Routes (1:1 مع src/routes الحالية)
| React (Tan Stack) | Nuxt 4 |
|---|---|
| `index.tsx` | `pages/index.vue` |
| `login.tsx` | `pages/login.vue` |
| `requests.index.tsx` | `pages/requests/index.vue` |
| `requests.new.tsx` | `pages/requests/new.vue` |
| `requests.$id.tsx` | `pages/requests/[id].vue` |
| `requests.$id.swift.tsx` | `pages/requests/[id]/swift.vue` |
| `customs.tsx`, `customs.$id.print.tsx` | `pages/customs/index.vue`, `pages/customs/[id]/print.vue` |
| `admin.*` (4 ملفات) | `pages/admin/*.vue` |
| `audit, bank.users, merchants, notifications, profile, reports, settings` | `pages/{name}.vue` لكل واحد |

المجموع: **20 صفحة**.

### 4. نقل المكونات والمنطق
- `src/components/layout/AppShell.tsx` → `app/layouts/default.vue` + `components/layout/AppShell.vue`.
- `src/components/workflow/*` (7 ملفات: AuditTimeline, DocumentChecklist, LockedBanner, RoleGuard, RoleSwitcher, VotingPanel, WorkflowProgress) → `components/workflow/*.vue`.
- `src/components/ui/*` (shadcn React) → استبدال بمكونات `shadcn-vue` المثبتة عبر CLI ثم تخصيصها لتطابق الستايل الحالي.
- `src/lib/mock.ts, db.ts, governance.ts, utils.ts, error-capture.ts, error-page.ts` → نسخ كـ TypeScript pure إلى `app/lib/` (المنطق React-agnostic فيتم نقله مباشرة؛ أي hooks تتحول إلى composables).
- `src/hooks/use-mobile.tsx` → `app/composables/useMobile.ts` (موجود بالفعل في VueUse: `useMediaQuery`).

### 5. State Management
- استبدال أي state محلي React بـ Pinia stores تحت `app/stores/`:
  - `auth.ts` (الدور الحالي للمستخدم — للـ RoleSwitcher)
  - `requests.ts` (mock requests + audit log)
  - `merchants.ts`
  - `notifications.ts`

### 6. التصميم
- الحفاظ على نفس tokens من `src/styles.css` (oklch palette + RTL + خط Cairo) عبر `app/assets/css/main.css` بنفس متغيرات `@theme` من Tailwind v4.
- `app.vue` يضع `dir="rtl" lang="ar"` على `<html>` عبر `useHead`.
- shadcn-vue components تستخدم نفس CSS variables → نفس المظهر بصرياً.
- animations: `tw-animate-css` (الموصى به من shadcn-vue) للـ Accordion/Dialog/Dropdown.

### 7. Forms
- استبدال أي react-hook-form بـ **VeeValidate + @vee-validate/zod** مع مكونات `<Form>`, `<FormField>` الخاصة بـ shadcn-vue.
- نموذج `requests/new.vue` (الأكبر) يستخدم نفس schema الموجود.

### 8. التحقق
- بعد البناء: تشغيل `npm install && npm run dev` محلياً للتأكد أن Nuxt يبني.
- لا يمكن التحقق داخل preview الـ Lovable لأن البنية التحتية لا تدعم Nuxt.

---

## التفاصيل التقنية

- **Nuxt 4 srcDir**: المحتوى يذهب تحت `app/` بدلاً من جذر المشروع (تغيير افتراضي من Nuxt 3).
- **shadcn-vue init**: يتم تشغيله مرة عبر `npx shadcn-vue@latest init` لإنشاء `components.json` + الإعدادات.
- **RTL**: لا يحتاج plugin خاص — Tailwind v4 يدعم logical properties، والأيقونات من lucide تعكس تلقائياً مع `dir="rtl"`.
- **Vue 4**: غير موجود حالياً (آخر مستقر 3.5.x). الخطة تستخدم Vue 3.5 وهو ما يتطلبه Nuxt 4 فعلياً.
- **Mock data**: يبقى reactive عبر Pinia مع `localStorage` persistence (نفس سلوك `src/lib/db.ts` الحالي).

## الملفات التي ستُحذف
كل `src/`، `vite.config.ts`، `wrangler.jsonc`، `server-railway.mjs`، `Dockerfile` (سيتجدد لو لزم).

## النطاق التقديري
~50 ملف جديد، حجم العمل كبير جداً (نقل 20 صفحة + 7 components workflow + 30+ shadcn component + كل المنطق). يُنصح التنفيذ على دفعات لكن طلبت 1:1 كامل، فسيتم في تنفيذ واحد متتالي.

---

**هل توافق على المتابعة رغم أن الـ preview والـ publish في Lovable سيتوقفان؟** أو تفضل أعيد التفكير (مثلاً: نسخة Nuxt في مجلد منفصل بدون لمس React)?
