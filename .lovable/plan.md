# خطة مواءمة Yemen Flow Hub مع المواصفات الكاملة

البروتوتايب الحالي يغطي معظم المواصفات (الأدوار، المراحل، التصويت، إصدار البيان، RTL/عربي، حالة مشتركة عبر الجلسات). الخطة التالية تغلق الفجوات المتبقية لتطابق نص الـ brief حرفيًا.

## الفجوات المُحدَّدة مقابل المواصفات

| # | المواصفة | الحالة الحالية | الإجراء |
|---|---------|---------------|--------|
| 1 | **Support Claiming / Locking** — أول عضو مساندة يطالب بالطلب يقفله على الباقين | غير موجود — كل أعضاء المساندة يرون نفس الطابور دون قفل | إضافة `claimedBy` على الطلب + زر "حجز للمراجعة" + شارة "محجوز بواسطة …" + منع باقي أعضاء المساندة من اتخاذ إجراء |
| 2 | **Committee Director** — دور منفصل يحل التعادل في التصويت | لا يوجد دور منفصل؛ مدير اللجنة هو نفسه عضو | إضافة Role `committee_director` + مستخدم تجريبي + لوحة "حسم التعادل" تظهر فقط عند تساوي الأصوات |
| 3 | **CBY Admin / Customs Officer** — إصدار البيان الجمركي وإدارة المستخدمين والبنوك ومراجعة الـ audit | إصدار البيان حاليًا بيد عضو اللجنة التنفيذية | فصل صلاحية إصدار البيان إلى `platform_admin` (= CBY Admin)، وإبقاء التصويت فقط لأعضاء اللجنة |
| 4 | **SWIFT Officer dashboard** | يوجد زر رفع داخل الطلب فقط | إضافة طابور مخصص `/swift` يعرض الطلبات في حالة "support_approved" فقط لـ `bank_swift` |
| 5 | **Voting realism** — كل عضو يصوّت مرة واحدة، عدّاد لحظي | يعمل لكن لا يمنع التصويت المزدوج بوضوح ولا يُظهر "صوّت/لم يصوّت" لكل عضو | تحسين `VotingPanel` ليعرض حالة كل عضو + قفل بعد التصويت + حسم تلقائي عند اكتمال النصاب |
| 6 | **مراحل العرض الكاملة** — إضافة "Support Review In Progress" (مرحلة الحجز) للوضوح في الـ timeline | غير ممثلة كحدث | تسجيل حدث "حُجز للمراجعة بواسطة X" في Audit Timeline |
| 7 | **Reports & Analytics** | الصفحة موجودة لكن سطحية | إضافة 4 KPIs ديناميكية تُحسب من الـ store (إجمالي/معتمد/مرفوض/متوسط زمن المعالجة) + رسم بسيط حسب المرحلة |
| 8 | **Audit log عام لكل النظام** لـ CBY Admin | `AuditTimeline` لكل طلب فقط | إضافة `/audit` global feed مرتب زمنيًا |
| 9 | **Notifications dynamic** | الصفحة ثابتة | ربطها بأحداث الـ store (طلب جديد في طابوري، تم حجز طلبي، صدر قرار) |
| 10 | **RTL polish** | الأساس صحيح | مراجعة سريعة للأيقونات الاتجاهية (chevrons, arrows) واستبدال `mr-/ml-` ببدائل منطقية في الأماكن المتبقية |

## ترتيب التنفيذ

1. **بنية البيانات (`src/lib/mock.ts` + `governance.ts`)**
   - إضافة Role `committee_director` + مستخدم تجريبي.
   - إضافة حقول `claimedBy`, `claimedAt`, `customsIssuedBy` على الطلب.
   - تحديث `displayStatusFor` و `bucketsFor` للأدوار الجديدة.
   - تعديل `TRANSITIONS` لفصل "إصدار البيان" إلى `platform_admin` فقط.

2. **Support Claiming**
   - زر "حجز للمراجعة" في `requests.$id.tsx` لأعضاء المساندة في مرحلة `support_review`.
   - بعد الحجز: باقي أعضاء المساندة يرون شارة قفل ولا يستطيعون اتخاذ إجراء.
   - في `requests.index.tsx` عرض شارة "محجوز بواسطة …".

3. **SWIFT Queue**
   - صفحة `/swift` جديدة (`requests.swift-queue.tsx`) لطابور `bank_swift` فقط.
   - إضافة عنصر تنقل في `AppShell` للدور.

4. **Voting refactor**
   - في `VotingPanel`: عرض قائمة الأعضاء مع حالة (وافق/رفض/امتنع/لم يصوّت).
   - منع التصويت المزدوج عبر `hasVoted(userId, requestId)`.
   - عند اكتمال أصوات كل الأعضاء: حسم تلقائي بالأغلبية، وعند التعادل تنتقل الحالة إلى `tie_break` ويظهر زر للمدير فقط.

5. **Committee Director**
   - لوحة "حسم التعادل" داخل `voting.$id.tsx` تظهر فقط لـ `committee_director` عند `tie_break`.

6. **CBY Admin = Customs Officer**
   - نقل أزرار "إصدار البيان" من `executive_member` إلى `platform_admin`.
   - صفحة `/customs` تصبح طابور `platform_admin` للطلبات في `executive_approved`.

7. **Reports + Global Audit + Notifications dynamic**
   - حساب KPIs من `requestsCell`.
   - `/audit` يقرأ من سجل أحداث global في `governance.ts`.
   - `/notifications` يُولّد إشعارات من نفس السجل مفلترة حسب المستخدم/الدور.

8. **مراجعة RTL سريعة** على الشاشات المعدّلة.

9. **تقرير تنفيذ نهائي** يربط كل عنصر في الـ brief بالملف/الشاشة المطابقة.

## ملاحظات تقنية

- لا توجد حاجة لـ Lovable Cloud؛ كل الحالة في `requestsCell` (in-memory store + `useSyncExternalStore`) تستمر خلال الجلسة كما يطلب الـ brief.
- لن نُغيّر منظومة `displayStatusFor` المعتمدة لإخفاء التعقيد عن أدوار البنك.
- كل إجراء جديد سيكتب حدثًا في `AuditTimeline` للحفاظ على واقعية الـ timeline.

## الملفات المتأثرة (تقدير)

- تعديل: `src/lib/mock.ts`, `src/lib/governance.ts`, `src/components/workflow/VotingPanel.tsx`, `src/components/layout/AppShell.tsx`, `src/routes/requests.$id.tsx`, `src/routes/requests.index.tsx`, `src/routes/voting.$id.tsx`, `src/routes/customs.tsx`, `src/routes/customs.$id.print.tsx`, `src/routes/reports.tsx`, `src/routes/audit.tsx`, `src/routes/notifications.tsx`.
- جديد: `src/routes/requests.swift-queue.tsx` (طابور SWIFT المخصص).
