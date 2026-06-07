import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Upload, FileText, Save, Send, ShieldCheck, Eye, Trash2, FileCheck2,
  Search, AlertCircle, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useAuth, ENTITIES, findMerchantByTax,
  type ImportRequest, type RequestStage, type Merchant,
} from "@/lib/mock";
import { requestsCell, merchantsCell, logAudit, notify } from "@/lib/governance";

export const Route = createFileRoute("/requests/new")({ component: NewRequest });

// ──────────────────────────────────────────────────────────────
// Reference data (per business spec)
// ──────────────────────────────────────────────────────────────
const PORTS_15 = [
  "ميناء عدن", "ميناء الحديدة", "ميناء المكلا", "ميناء نشطون", "ميناء الصليف",
  "ميناء رأس عيسى", "منفذ الوديعة البري", "منفذ شحن البري", "منفذ علب",
  "ميناء جدة الإسلامي", "ميناء جبل علي", "ميناء صلالة", "ميناء صحار",
  "ميناء بورسعيد", "ميناء العقبة",
];
const INCOTERMS_13 = [
  "EXW - تسليم المصنع",
  "FCA - تسليم الناقل",
  "CPT - النقل مدفوع إلى",
  "CIP - النقل والتأمين مدفوعان إلى",
  "DAP - التسليم في المكان",
  "DPU - التسليم في المكان مع تفريغ",
  "DDP - التسليم خالص الرسوم",
  "FAS - تسليم بجانب السفينة",
  "FOB - تسليم على ظهر السفينة",
  "CFR - التكلفة وأجرة الشحن",
  "CIF - التكلفة والتأمين والشحن",
  "DAT - التسليم في المحطة",
  "DDU - التسليم بدون أداء الرسوم",
];
const CURRENCIES: ImportRequest["currency"][] = ["USD", "EUR", "SAR"];
const PAYMENT_KIND = [
  { value: "full", label: "تمويل كامل (100%)" },
  { value: "partial", label: "تمويل جزئي (5% – أقل من 100%)" },
];

const REQUIRED_DOCS = [
  "إثبات مصادر الريال اليمني (YER)",
  "إثبات مصادر الريال السعودي (SAR) من مناطق التحاكم الشرعية",
  "إثبات مصادر الدولار (USD) من مناطق التحاكم الشرعية",
  "البطاقة الضريبية",
  "السجل التجاري",
  "الفاتورة الأولية",
];
const OPTIONAL_DOCS = [
  "شهادة المنشأ",
  "بوليصة الشحن (B/L)",
  "قائمة التعبئة (Packing List)",
  "شهادة الفحص / الجودة",
  "شهادة التأمين",
  "ترخيص استيراد (إن وُجد)",
  "كتاب من الجهات الرقابية",
  "مستندات إضافية أخرى",
];

// ──────────────────────────────────────────────────────────────
// Form state
// ──────────────────────────────────────────────────────────────
type FormState = {
  // Tab 1 — basic merchant
  taxNo: string;
  traderName: string;
  taxExpiry: string;
  crNo: string;
  crExpiry: string;
  activity: string;
  address: string;
  contact: string;
  shareholders: { name: string; percent: string }[];
  /** الشركات المرتبطة بالتاجر (تُسجَّل عند إنشاء تاجر جديد من شاشة الطلب). */
  companies: { name: string }[];

  // Tab 2 — invoice
  invoiceNo: string;
  invoiceDate: string;
  invoiceAmount: string;
  currency: ImportRequest["currency"];
  supplier: string;
  originCountry: string;
  type: string;
  paymentKind: "full" | "partial";
  fundingPercent: string; // 100 when full; 5..<100 when partial

  // Tab 3 — shipping
  shipmentDate: string;
  arrivalDate: string;
  shipPort: string;
  arrivalPort: string;
  incoterm: string;
  finalDestination: string;
  bl: string;

  // Tab 4 — documents (handled separately as uploads map)

  // Tab 5 — workflow
  notes: string;
};

const INITIAL: FormState = {
  taxNo: "", traderName: "", taxExpiry: "", crNo: "", crExpiry: "",
  activity: "", address: "", contact: "",
  shareholders: [{ name: "", percent: "" }],
  companies: [],
  invoiceNo: "", invoiceDate: "", invoiceAmount: "", currency: "USD",
  supplier: "", originCountry: "", type: "مواد غذائية",
  paymentKind: "full", fundingPercent: "100",
  shipmentDate: "", arrivalDate: "", shipPort: "ميناء عدن", arrivalPort: "ميناء عدن",
  incoterm: "CIF - التكلفة والتأمين والشحن", finalDestination: "", bl: "",
  notes: "",
};

type UploadedDoc = { file: File; url: string; dataUrl: string };

// ──────────────────────────────────────────────────────────────
// Duplicate check (cross-bank)
// ──────────────────────────────────────────────────────────────
type DupResult =
  | { ok: true; usedPercent: number }
  | { ok: false; reason: string };

function checkDuplicate(
  list: ImportRequest[],
  taxNo: string,
  invoiceNo: string,
  newPercent: number,
): DupResult {
  if (!taxNo || !invoiceNo) return { ok: true, usedPercent: 0 };
  const matches = list.filter(
    (r) =>
      (r.taxNo ?? "").trim() === taxNo.trim() &&
      r.invoice.trim() === invoiceNo.trim() &&
      r.stage !== "support_rejected" &&
      r.stage !== "executive_rejected" &&
      r.stage !== "bank_rejected",
  );
  if (matches.length === 0) return { ok: true, usedPercent: 0 };
  // If any existing entry is full (100%) → block
  const usedPercent = matches.reduce((acc, r) => {
    // infer percent: if invoiceAmount equals amount → 100, else amount/invoiceAmount
    const inv = r.invoiceAmount ?? r.amount;
    const p = inv > 0 ? Math.round((r.amount / inv) * 100) : 100;
    return acc + p;
  }, 0);
  if (usedPercent >= 100) {
    return { ok: false, reason: "هذه الفاتورة ممولة بالكامل مسبقاً (100%) — لا يمكن إنشاء طلب جديد." };
  }
  if (usedPercent + newPercent > 100) {
    return {
      ok: false,
      reason: `مجموع نسب التمويل المرتبطة بهذه الفاتورة (${usedPercent}%) + النسبة المطلوبة (${newPercent}%) يتجاوز 100%.`,
    };
  }
  return { ok: true, usedPercent };
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
function NewRequest() {
  const { user } = useAuth();
  const allMerchants = merchantsCell.use();
  const allRequests = requestsCell.use();
  const nav = useNavigate();
  const [tab, setTab] = useState("basic");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [uploads, setUploads] = useState<Record<string, UploadedDoc>>({});
  const [matchedMerchant, setMatchedMerchant] = useState<Merchant | null>(null);

  if (user && user.role !== "bank_intake" && user.role !== "bank_admin") {
    return (
      <div className="p-8">
        <PageHeader
          title="غير مصرح بإنشاء طلب"
          subtitle="هذه الصفحة متاحة لمُدخِل البيانات أو مدير البنك فقط."
        />
        <Button variant="outline" onClick={() => nav({ to: "/requests" })}>← العودة</Button>
      </div>
    );
  }

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // Tax-ID auto-fill
  function lookupByTax() {
    const m = findMerchantByTax(allMerchants, form.taxNo);
    if (!m) {
      setMatchedMerchant(null);
      toast.info("لا يوجد تاجر بهذا الرقم الضريبي — يمكنك إدخال بياناته وحفظه ضمن هذا الطلب.");
      return;
    }
    setMatchedMerchant(m);
    update({
      traderName: m.traderName ?? "",
      taxExpiry: m.taxExpiry ?? "",
      crNo: m.cr,
      crExpiry: m.crExpiry ?? "",
      activity: m.category,
      address: m.address,
      contact: m.contact,
      shareholders: (m.shareholders ?? []).length
        ? m.shareholders!.map((s) => ({ name: s.name, percent: String(s.percent) }))
        : [{ name: "", percent: "" }],
      companies: (m.companies ?? []).map((c) => ({ name: c.name })),
    });
    toast.success(`تم جلب بيانات التاجر: ${m.traderName ?? m.name}`);
  }

  // Derived
  const fundingPercentNum = Number(form.fundingPercent) || 0;
  const dup = useMemo(
    () => checkDuplicate(allRequests, form.taxNo, form.invoiceNo, fundingPercentNum),
    [allRequests, form.taxNo, form.invoiceNo, fundingPercentNum],
  );
  const requestedAmount = useMemo(() => {
    const inv = Number(form.invoiceAmount) || 0;
    return Math.round(inv * (fundingPercentNum / 100));
  }, [form.invoiceAmount, fundingPercentNum]);

  function validateBasic(): string | null {
    if (!form.taxNo) return "الرقم الضريبي مطلوب";
    if (!form.traderName.trim()) return "اسم التاجر مطلوب";
    if (!matchedMerchant) {
      // سيتم إنشاء تاجر جديد — تحقق من توفر الحقول الأساسية
      if (!form.taxExpiry) return "تاريخ انتهاء البطاقة الضريبية مطلوب لإنشاء تاجر جديد";
      if (!form.crNo.trim()) return "رقم السجل التجاري مطلوب لإنشاء تاجر جديد";
      if (!form.crExpiry) return "تاريخ انتهاء السجل التجاري مطلوب لإنشاء تاجر جديد";
    }
    return null;
  }
  function validateInvoice(): string | null {
    if (!form.invoiceNo) return "رقم الفاتورة مطلوب";
    if (!form.invoiceDate) return "تاريخ الفاتورة مطلوب";
    if (!form.invoiceAmount || Number(form.invoiceAmount) <= 0) return "مبلغ الفاتورة مطلوب";
    if (!form.supplier) return "اسم المورد مطلوب";
    if (!form.originCountry) return "بلد المنشأ مطلوب";
    if (!form.type) return "نوع الواردات مطلوب";
    if (form.paymentKind === "partial") {
      const p = Number(form.fundingPercent);
      if (!(p >= 5 && p < 100)) return "نسبة التمويل الجزئي يجب أن تكون بين 5% وأقل من 100%";
    }
    if (!dup.ok) return dup.reason;
    return null;
  }
  function validateShipping(): string | null {
    if (!form.shipPort) return "ميناء الشحن مطلوب";
    if (!form.arrivalPort) return "ميناء الوصول مطلوب";
    if (!form.incoterm) return "Incoterm مطلوب";
    if (!form.finalDestination) return "الوجهة النهائية مطلوبة";
    return null;
  }
  function validateDocs(): string | null {
    const missing = REQUIRED_DOCS.filter((d) => !uploads[d]);
    if (missing.length) return `الوثائق التالية مطلوبة: ${missing.join("، ")}`;
    return null;
  }
  function validateAll(): string | null {
    return validateBasic() || validateInvoice() || validateShipping() || validateDocs();
  }

  function buildRequest(stage: RequestStage): ImportRequest {
    const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const entity = ENTITIES.find((e) => e.id === user?.entityId) ?? ENTITIES[0];
    const ref = `IMP-2026-${Math.floor(2000 + Math.random() * 7000)}`;
    const progressByStage: Record<RequestStage, number> = {
      draft: 5, bank_submitted: 12, bank_internal_review: 22, bank_approved: 35,
      support_review: 45, support_returned: 30, support_rejected: 100,
      bank_returned: 18, bank_rejected: 100, support_approved: 60,
      swift_attached: 90, executive_voting: 70, executive_rejected: 100,
      executive_approved: 80, customs_released: 96, completed: 100,
    };
    return {
      id, ref,
      importer: form.traderName,
      entityId: user?.entityId ?? entity.id,
      bank: entity.name,
      amount: requestedAmount,
      currency: form.currency,
      type: form.type,
      supplier: form.supplier,
      invoice: form.invoiceNo,
      port: form.arrivalPort,
      stage,
      createdAt: new Date().toISOString(),
      progress: progressByStage[stage],
      risk: "low",
      duplicate: false,
      intakeUserId: user?.id ?? "u5",
      createdBy: user?.id ?? "u5",
      lastUpdatedBy: user?.id ?? "u5",
      submittedBy: stage === "draft" ? undefined : user?.id,
      documents: Object.entries(uploads).map(([name, u]) => ({
        name, fileName: u.file.name, mime: u.file.type, size: u.file.size, dataUrl: u.dataUrl,
      })),
      activity: form.activity || undefined,
      taxNo: form.taxNo || undefined,
      crNo: form.crNo || undefined,
      originCountry: form.originCountry,
      invoiceAmount: Number(form.invoiceAmount) || undefined,
      invoiceDate: form.invoiceDate || undefined,
      paymentTerms: form.paymentKind === "full" ? "تمويل كامل" : `تمويل جزئي ${form.fundingPercent}%`,
      shipmentDate: form.shipmentDate || undefined,
      shipPort: form.shipPort || undefined,
      shareholders: form.shareholders
        .filter((s) => s.name.trim() && Number(s.percent) >= 25)
        .map((s) => ({ name: s.name.trim(), percent: Number(s.percent) })),
    };
  }

  function persist(stage: RequestStage) {
    if (!user) return;
    if (stage !== "draft") {
      const err = validateAll();
      if (err) { toast.error(err); return; }
    } else {
      if (!form.taxNo || !form.traderName.trim()) {
        toast.error("الرقم الضريبي واسم التاجر على الأقل مطلوبان لحفظ المسودة");
        return;
      }
    }

    // إنشاء تاجر جديد مباشرةً إذا لم يكن مسجَّلاً
    if (!matchedMerchant && form.taxNo && form.traderName.trim()) {
      const exists = findMerchantByTax(allMerchants, form.taxNo);
      if (exists) {
        toast.error(`الرقم الضريبي ${form.taxNo} مسجَّل لتاجر آخر — أعد جلب البيانات.`);
        return;
      }
      const newMerchant: Merchant = {
        id: `m_${Date.now()}`,
        name: form.traderName.trim(),
        traderName: form.traderName.trim(),
        tax: form.taxNo.trim(),
        taxExpiry: form.taxExpiry || undefined,
        cr: form.crNo.trim(),
        crExpiry: form.crExpiry || undefined,
        companies: form.companies.filter((c) => c.name.trim()).map((c, i) => ({
          id: `c_${Date.now()}_${i}`, name: c.name.trim(),
        })),
        shareholders: form.shareholders
          .filter((s) => s.name.trim() && Number(s.percent) >= 25)
          .map((s, i) => ({ id: `sh_${Date.now()}_${i}`, name: s.name.trim(), percent: Number(s.percent) })),
        address: form.address.trim() || "—",
        contact: form.contact.trim() || "—",
        category: form.activity || "غير محدد",
        status: "active",
        entityId: user.entityId ?? undefined,
        transactions: 0,
      };
      merchantsCell.set((prev) => [newMerchant, ...prev]);
      setMatchedMerchant(newMerchant);
      logAudit({
        userId: user.id, userName: user.name, role: user.role,
        action: "إنشاء تاجر جديد من شاشة الطلب",
        ref: newMerchant.cr, notes: newMerchant.traderName,
      });
      toast.success(`تم تسجيل تاجر جديد: ${newMerchant.traderName}`);
    }

    const req = buildRequest(stage);
    requestsCell.set((prev) => [req, ...prev]);
    logAudit({
      userId: user.id, userName: user.name, role: user.role,
      action: stage === "draft" ? "حفظ مسودة طلب" : "إنشاء طلب وتقديم للمراجعة",
      ref: req.ref, toStage: stage,
      notes: `${req.importer} — ${req.amount.toLocaleString()} ${req.currency}`,
    });
    if (stage !== "draft") {
      notify({
        title: "طلب جديد بانتظار المراجعة الداخلية",
        body: `${req.ref} — ${req.importer}`,
        audience: "bank_reviewer",
        href: `/requests/${req.id}`,
      });
    }
    toast.success(stage === "draft" ? "تم حفظ المسودة" : "تم إرسال الطلب للمراجعة الداخلية");
    nav({ to: "/requests" });
  }

  return (
    <div>
      <PageHeader
        title="تقديم طلب تمويل واردات جديد"
        subtitle="املأ التبويبات الخمسة بدقة — ابدأ بالرقم الضريبي لجلب بيانات التاجر"
        breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "الطلبات", to: "/requests" }, { label: "طلب جديد" }]}
      />

      <Card className="p-6 shadow-card border-0">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 w-full mb-6">
            <TabsTrigger value="basic">1. البيانات الأساسية</TabsTrigger>
            <TabsTrigger value="invoice">2. بيانات الفاتورة</TabsTrigger>
            <TabsTrigger value="shipping">3. بيانات الشحن</TabsTrigger>
            <TabsTrigger value="docs">4. الوثائق</TabsTrigger>
            <TabsTrigger value="workflow">5. سير الإجراء</TabsTrigger>
          </TabsList>

          {/* Tab 1 */}
          <TabsContent value="basic">
            <BasicTab form={form} update={update} lookup={lookupByTax} matched={!!matchedMerchant} />
          </TabsContent>

          {/* Tab 2 */}
          <TabsContent value="invoice">
            <InvoiceTab form={form} update={update} dup={dup} requestedAmount={requestedAmount} />
          </TabsContent>

          {/* Tab 3 */}
          <TabsContent value="shipping">
            <ShippingTab form={form} update={update} />
          </TabsContent>

          {/* Tab 4 */}
          <TabsContent value="docs">
            <DocsTab uploads={uploads} setUploads={setUploads} />
          </TabsContent>

          {/* Tab 5 */}
          <TabsContent value="workflow">
            <WorkflowTab form={form} requestedAmount={requestedAmount} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={() => nav({ to: "/requests" })}>إلغاء</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => persist("draft")}>
              <Save className="h-4 w-4 ml-1" />
              {matchedMerchant ? "حفظ كمسودة" : "حفظ التاجر + مسودة"}
            </Button>
            <Button onClick={() => persist("bank_submitted")}>
              <Send className="h-4 w-4 ml-1" />
              {matchedMerchant ? "إرسال للمراجعة الداخلية" : "حفظ التاجر + إرسال للمراجعة"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Reusable Field
// ──────────────────────────────────────────────────────────────
function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tab components
// ──────────────────────────────────────────────────────────────
type TabProps = { form: FormState; update: (p: Partial<FormState>) => void };

function BasicTab({ form, update, lookup, matched }: TabProps & { lookup: () => void; matched: boolean }) {
  function updateShareholder(i: number, patch: Partial<{ name: string; percent: string }>) {
    update({ shareholders: form.shareholders.map((s, idx) => idx === i ? { ...s, ...patch } : s) });
  }
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Search className="h-4 w-4" /> ابحث عن التاجر بالرقم الضريبي
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="أدخل الرقم الضريبي"
            value={form.taxNo}
            onChange={(e) => update({ taxNo: e.target.value })}
            className="max-w-xs"
          />
          <Button onClick={lookup}><Search className="h-4 w-4 ml-1" /> جلب البيانات</Button>
        </div>
        {matched && (
          <p className="text-xs text-success mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> تم جلب بيانات التاجر — يمكنك تعديلها لهذا الطلب دون التأثير على السجل الأصلي.
          </p>
        )}
        {!matched && form.taxNo && (
          <p className="text-xs text-info mt-2 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> الرقم الضريبي غير مسجَّل — أكمل البيانات الأساسية وسيتم إنشاء تاجر جديد تلقائياً عند الحفظ أو الإرسال.
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Field label="اسم التاجر" required>
          <Input value={form.traderName} onChange={(e) => update({ traderName: e.target.value })} />
        </Field>
        <Field label="تاريخ انتهاء البطاقة الضريبية" required>
          <Input type="date" value={form.taxExpiry} onChange={(e) => update({ taxExpiry: e.target.value })} />
        </Field>
        <Field label="رقم السجل التجاري" required>
          <Input value={form.crNo} onChange={(e) => update({ crNo: e.target.value })} />
        </Field>
        <Field label="تاريخ انتهاء السجل التجاري" required>
          <Input type="date" value={form.crExpiry} onChange={(e) => update({ crExpiry: e.target.value })} />
        </Field>
        <Field label="نوع النشاط التجاري">
          <Input value={form.activity} onChange={(e) => update({ activity: e.target.value })} />
        </Field>
        <Field label="العنوان">
          <Input value={form.address} onChange={(e) => update({ address: e.target.value })} />
        </Field>
        <Field label="رقم التواصل">
          <Input value={form.contact} onChange={(e) => update({ contact: e.target.value })} />
        </Field>
      </div>

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">الشركات المرتبطة بالتاجر</h3>
          <Button type="button" size="sm" variant="outline"
            onClick={() => update({ companies: [...form.companies, { name: "" }] })}>
            + إضافة شركة
          </Button>
        </div>
        {form.companies.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد شركات مضافة بعد.</p>
        ) : (
          <div className="space-y-2">
            {form.companies.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <Input placeholder="اسم الشركة" value={c.name}
                  onChange={(e) => update({ companies: form.companies.map((x, idx) => idx === i ? { name: e.target.value } : x) })} />
                <Button type="button" variant="ghost" size="icon" className="text-destructive h-9 w-9"
                  onClick={() => update({ companies: form.companies.filter((_, idx) => idx !== i) })} aria-label="حذف">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">المساهمون / الملاك (بنسبة ≥ 25%)</h3>
          <Button type="button" size="sm" variant="outline"
            onClick={() => update({ shareholders: [...form.shareholders, { name: "", percent: "" }] })}>
            + إضافة مساهم
          </Button>
        </div>
        <div className="space-y-2">
          {form.shareholders.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2 items-center">
              <Input placeholder="اسم المساهم" value={s.name}
                onChange={(e) => updateShareholder(i, { name: e.target.value })} />
              <Input type="number" min={25} max={100} placeholder="نسبة %" value={s.percent}
                onChange={(e) => updateShareholder(i, { percent: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" className="text-destructive h-9 w-9"
                onClick={() => update({ shareholders: form.shareholders.filter((_, idx) => idx !== i) })}
                disabled={form.shareholders.length === 1} aria-label="حذف">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvoiceTab({ form, update, dup, requestedAmount }: TabProps & { dup: DupResult; requestedAmount: number }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="رقم الفاتورة" required>
          <Input value={form.invoiceNo} onChange={(e) => update({ invoiceNo: e.target.value })} />
        </Field>
        <Field label="تاريخ الفاتورة" required>
          <Input type="date" value={form.invoiceDate} onChange={(e) => update({ invoiceDate: e.target.value })} />
        </Field>
        <Field label="مبلغ الفاتورة" required>
          <Input type="number" value={form.invoiceAmount} onChange={(e) => update({ invoiceAmount: e.target.value })} />
        </Field>
        <Field label="العملة" required>
          <Select value={form.currency} onValueChange={(v) => update({ currency: v as ImportRequest["currency"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="اسم المورد" required>
          <Input value={form.supplier} onChange={(e) => update({ supplier: e.target.value })} />
        </Field>
        <Field label="بلد المنشأ" required>
          <Input value={form.originCountry} onChange={(e) => update({ originCountry: e.target.value })} />
        </Field>
        <Field label="نوع الواردات" required>
          <Input value={form.type} onChange={(e) => update({ type: e.target.value })} />
        </Field>
        <Field label="شروط الدفع" required>
          <Select value={form.paymentKind} onValueChange={(v) => {
            const kind = v as "full" | "partial";
            update({ paymentKind: kind, fundingPercent: kind === "full" ? "100" : "50" });
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYMENT_KIND.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="نسبة التمويل %" required
          hint={form.paymentKind === "full" ? "ثابتة 100% للتمويل الكامل" : "بين 5% وأقل من 100% للتمويل الجزئي"}>
          <Input type="number" min={form.paymentKind === "full" ? 100 : 5} max={100}
            disabled={form.paymentKind === "full"}
            value={form.fundingPercent}
            onChange={(e) => update({ fundingPercent: e.target.value })} />
        </Field>
        <Field label="مبلغ التمويل المطلوب (محسوب)">
          <Input value={`${requestedAmount.toLocaleString()} ${form.currency}`} disabled />
        </Field>
      </div>

      {!dup.ok && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <div className="font-semibold text-sm text-destructive">تنبيه تكرار</div>
            <p className="text-xs text-muted-foreground mt-1">{dup.reason}</p>
          </div>
        </div>
      )}
      {dup.ok && dup.usedPercent > 0 && (
        <div className="rounded-lg border border-info/30 bg-info/5 p-4 text-xs">
          هذه الفاتورة ممولة جزئياً مسبقاً بنسبة <b>{dup.usedPercent}%</b> — المتبقي المسموح: <b>{100 - dup.usedPercent}%</b>.
        </div>
      )}
    </div>
  );
}

function ShippingTab({ form, update }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="تاريخ الشحن (اختياري)">
          <Input type="date" value={form.shipmentDate} onChange={(e) => update({ shipmentDate: e.target.value })} />
        </Field>
        <Field label="تاريخ الوصول المتوقع (اختياري)">
          <Input type="date" value={form.arrivalDate} onChange={(e) => update({ arrivalDate: e.target.value })} />
        </Field>
        <Field label="ميناء الشحن" required>
          <Select value={form.shipPort} onValueChange={(v) => update({ shipPort: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PORTS_15.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="ميناء الوصول" required>
          <Select value={form.arrivalPort} onValueChange={(v) => update({ arrivalPort: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PORTS_15.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="شروط التسليم (Incoterms)" required>
          <Select value={form.incoterm} onValueChange={(v) => update({ incoterm: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{INCOTERMS_13.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="الوجهة النهائية" required>
          <Input value={form.finalDestination} onChange={(e) => update({ finalDestination: e.target.value })}
            placeholder="مثل: صنعاء — مخازن التاجر" />
        </Field>
        <Field label="رقم بوليصة الشحن (B/L) — اختياري">
          <Input value={form.bl} onChange={(e) => update({ bl: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function DocsTab({ uploads, setUploads }: { uploads: Record<string, UploadedDoc>; setUploads: React.Dispatch<React.SetStateAction<Record<string, UploadedDoc>>> }) {
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [preview, setPreview] = useState<{ name: string; url: string; type: string } | null>(null);

  function onFile(name: string, file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("حجم الملف يتجاوز 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setUploads((prev) => {
        if (prev[name]) URL.revokeObjectURL(prev[name].url);
        return { ...prev, [name]: { file, url: URL.createObjectURL(file), dataUrl } };
      });
      toast.success(`تم رفع: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }
  function remove(name: string) {
    setUploads((prev) => {
      if (prev[name]) URL.revokeObjectURL(prev[name].url);
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  }

  function renderRow(d: string, required: boolean) {
    const up = uploads[d];
    const uploaded = !!up;
    return (
      <div key={d} className={cn(
        "border-2 border-dashed rounded-xl p-4 transition-colors",
        uploaded ? "border-success/40 bg-success/5" : "border-border hover:border-accent/40",
      )}>
        <input ref={(el) => { inputsRef.current[d] = el; }} type="file"
          accept=".pdf,.jpg,.jpeg,.png" className="hidden"
          onChange={(e) => onFile(d, e.target.files?.[0])} />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("h-10 w-10 rounded-lg grid place-items-center shrink-0",
              uploaded ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {uploaded ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{d}</div>
              <div className="text-xs text-muted-foreground">{required ? "مطلوب" : "اختياري"} · PDF/JPG حتى 10MB</div>
            </div>
          </div>
          {required && <Badge variant="destructive" className="text-[10px] shrink-0">إلزامي</Badge>}
        </div>
        {uploaded ? (
          <div className="mt-3 pt-3 border-t border-success/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-success shrink-0" />
              <span className="font-medium truncate">{up.file.name}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => setPreview({ name: up.file.name, url: up.url, type: up.file.type })}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(d)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => inputsRef.current[d]?.click()}>
            <Upload className="h-4 w-4 ml-1" /> اضغط للرفع
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm mb-3">الوثائق المطلوبة (إلزامية)</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {REQUIRED_DOCS.map((d) => renderRow(d, true))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-3">وثائق اختيارية</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {OPTIONAL_DOCS.map((d) => renderRow(d, false))}
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent dir="rtl" className="sm:max-w-3xl">
          <DialogHeader><DialogTitle className="truncate">{preview?.name}</DialogTitle></DialogHeader>
          {preview && (preview.type.startsWith("image/") ? (
            <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full object-contain rounded-md bg-muted" />
          ) : preview.type === "application/pdf" ? (
            <iframe src={preview.url} title={preview.name} className="w-full h-[70vh] rounded-md border" />
          ) : (
            <div className="text-sm text-muted-foreground p-6 text-center">
              <a href={preview.url} download={preview.name} className="text-primary underline">تنزيل الملف</a>
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkflowTab({ form, requestedAmount }: { form: FormState; requestedAmount: number }) {
  const steps = [
    { n: 1, title: "إنشاء وإدخال البيانات", who: "مدخل البيانات" },
    { n: 2, title: "المراجعة الداخلية", who: "المراجع الداخلي / مدير البنك" },
    { n: 3, title: "مراجعة اللجنة المساندة", who: "اللجنة المساندة (CBY)" },
    { n: 4, title: "تصويت اللجنة التنفيذية", who: "اللجنة التنفيذية (CBY)" },
    { n: 5, title: "رفع وثيقة السويفت", who: "موظف السويفت بالبنك" },
    { n: 6, title: "تأكيد المصارفة الخارجية", who: "مدير اللجنة التنفيذية" },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-muted/30 p-6">
        <h3 className="font-semibold mb-4">ملخص الطلب قبل الإرسال</h3>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[
            ["التاجر", form.traderName || "—"],
            ["الرقم الضريبي", form.taxNo || "—"],
            ["رقم الفاتورة", form.invoiceNo || "—"],
            ["مبلغ الفاتورة", form.invoiceAmount ? `${Number(form.invoiceAmount).toLocaleString()} ${form.currency}` : "—"],
            ["نسبة التمويل", `${form.fundingPercent}%`],
            ["مبلغ التمويل المطلوب", `${requestedAmount.toLocaleString()} ${form.currency}`],
            ["ميناء الشحن", form.shipPort],
            ["ميناء الوصول", form.arrivalPort],
            ["Incoterm", form.incoterm],
            ["الوجهة النهائية", form.finalDestination || "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4">مراحل سير الطلب</h3>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary grid place-items-center font-semibold text-sm shrink-0">{s.n}</div>
              <div>
                <div className="font-medium text-sm">{s.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.who}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <Label>ملاحظات للمراجع الداخلي (اختياري)</Label>
      <Textarea rows={3} value={form.notes} readOnly placeholder="(تُضاف لاحقاً في نسخة قادمة)" />

      <div className="flex items-start gap-3 p-4 rounded-lg bg-info/5 border border-info/20">
        <ShieldCheck className="h-5 w-5 text-info mt-0.5 shrink-0" />
        <div className="text-sm">
          <div className="font-medium">إقرار وتعهد</div>
          <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
            أُقر بأن جميع البيانات والمستندات المقدمة صحيحة وكاملة، وأتحمل المسؤولية القانونية عن أي بيانات غير دقيقة.
            سيتم إخضاع الطلب للتدقيق التلقائي للتحقق من الفواتير المكررة وحدود التمويل.
          </p>
        </div>
      </div>
    </div>
  );
}
