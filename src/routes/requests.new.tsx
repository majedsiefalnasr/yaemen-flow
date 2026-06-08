import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Upload, FileText, ChevronLeft, ChevronRight, Save, Send, Check,
  ShieldCheck, Eye, Trash2, FileCheck2, Search, ChevronsUpDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, ENTITIES, type ImportRequest, type RequestStage, type Merchant } from "@/lib/mock";
import { requestsCell, merchantsCell, logAudit, notify } from "@/lib/governance";

export const Route = createFileRoute("/requests/new")({ component: NewRequest });

const STEPS = [
  "المعلومات الأساسية",
  "بيانات الفاتورة",
  "بيانات الشحن",
  "الوثائق المطلوبة",
  "المراجعة والإرسال",
];

// ───────── قوائم ثابتة وفقاً للمواصفات ─────────
const REQUEST_TYPES = [
  "طلب مصارفة وتحويل خارجي",
  "طلب مصارفة آجلة - تسميح جمركي",
  "طلب فتح اعتماد",
];
const COVERAGE_TYPES = ["حوالة", "اعتماد", "تحصيل مستندي"];
const FX_SOURCES = ["التاجر", "تمويل من البنك"];
const PAYMENT_TERMS = ["كلي", "جزئي"] as const;
const REQUEST_CURRENCIES = ["دولار أمريكي", "ريال سعودي"];
const INVOICE_TYPES = [
  "عقد", "فاتورة أولية", "فاتورة تجارية", "فاتورة تصديرية",
  "فاتورة ضريبية", "فاتورة مبيعات", "فاتورة نهائية", "أخرى",
];
const COMMODITIES = [
  "مواد غذائية", "أدوية ومستلزمات طبية", "مشتقات نفطية",
  "قطع غيار", "مواد بناء", "إلكترونيات", "ملابس ومنسوجات", "أخرى",
];
const COUNTRIES = [
  "الولايات المتحدة", "الصين", "الهند", "المملكة العربية السعودية",
  "الإمارات العربية المتحدة", "ألمانيا", "تركيا", "مصر", "بريطانيا", "اليابان", "كوريا الجنوبية",
];
const ARRIVAL_PORTS = [
  "ميناء عدن (المنطقة الحرة)",
  "ميناء عدن (المعلا)",
  "ميناء عدن (ميناء الزيت)",
  "مطار عدن",
  "ميناء المكلا",
  "ميناء سقطرى",
  "منفذ الوديعة",
  "منفذ شحن",
  "منفذ حوف",
  "منفذ الطوال",
  "منفذ نشطون",
  "منفذ صرفيت",
  "ميناء الحديدة",
  "مطار سيئون",
  "ميناء رأس عيسى",
  "ميناء الصليف",
];
const INCOTERMS = ["CIF", "CNF", "C&F", "FOB", "CFR", "EXW", "CPT", "CIP", "DAP", "FCA", "DDP", "DPU", "FAS"];

const REQUIRED_DOCS = [
  { key: "ksy_yer", name: "كشف حساب بالريال اليمني (مناطق الشرعية)", required: true },
  { key: "ksy_sar", name: "كشف حساب بالريال السعودي (مناطق الشرعية)", required: true },
  { key: "ksy_usd", name: "كشف حساب بالدولار الأمريكي (مناطق الشرعية)", required: true },
  { key: "ksy_opt1", name: "كشف اختياري 1", required: false },
  { key: "ksy_opt2", name: "كشف اختياري 2", required: false },
  { key: "other_yer", name: "كشف حساب بالريال اليمني (منطقة أخرى)", required: false },
  { key: "other_sar", name: "كشف حساب بالريال السعودي (منطقة أخرى)", required: false },
  { key: "other_usd", name: "كشف حساب بالدولار الأمريكي (منطقة أخرى)", required: false },
  { key: "other_opt1", name: "كشف اختياري (منطقة أخرى) 1", required: false },
  { key: "other_opt2", name: "كشف اختياري (منطقة أخرى) 2", required: false },
  { key: "tax_cr", name: "البطاقة الضريبية والسجل التجاري", required: true },
  { key: "invoice", name: "الفاتورة", required: true },
  { key: "licenses", name: "التراخيص المطلوبة لبعض السلع", required: false },
  { key: "extras", name: "مستندات إضافية", required: false },
];

type FormState = {
  // المعلومات الأساسية
  taxNo: string;
  importer: string;
  linkedCompany: string;
  taxCardExpiry: string;
  crNo: string;
  crExpiry: string;
  shareholders: { name: string; percent: string }[];
  // بيانات الفاتورة
  requestType: string;
  coverageType: string;
  fxSource: string;
  paymentTerm: (typeof PAYMENT_TERMS)[number];
  requestPercent: string;
  requestCurrency: string;
  requestTotal: string;
  invoiceType: string;
  invoiceNo: string;
  invoiceCurrency: string;
  invoiceDate: string;
  quantity: string;
  unit: string;
  invoiceTotal: string;
  commodity: string;
  supplierName: string;
  supplierLocation: string;
  originCountry: string;
  // بيانات الشحن
  shipmentDate: string;
  shipPort: string;
  arrivalDate: string;
  arrivalPort: string;
  incoterm: string;
  finalDestination: string;
};

const INITIAL: FormState = {
  taxNo: "", importer: "", linkedCompany: "",
  taxCardExpiry: "", crNo: "", crExpiry: "",
  shareholders: [{ name: "", percent: "" }],
  requestType: REQUEST_TYPES[0],
  coverageType: "",
  fxSource: "",
  paymentTerm: "كلي",
  requestPercent: "100",
  requestCurrency: "دولار أمريكي",
  requestTotal: "",
  invoiceType: "",
  invoiceNo: `INV-2025-${Math.floor(Math.random() * 9000 + 1000)}`,
  invoiceCurrency: "دولار أمريكي",
  invoiceDate: "",
  quantity: "",
  unit: "",
  invoiceTotal: "",
  commodity: "",
  supplierName: "",
  supplierLocation: "",
  originCountry: "",
  shipmentDate: "",
  shipPort: "",
  arrivalDate: "",
  arrivalPort: "",
  incoterm: "",
  finalDestination: "",
};

const CURRENCY_CODE: Record<string, "USD" | "SAR" | "EUR"> = {
  "دولار أمريكي": "USD",
  "ريال سعودي": "SAR",
};

function NewRequest() {
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const allMerchants = merchantsCell.use();
  const bankMerchants = useMemo(
    () => allMerchants.filter((m) => m.status === "active" && (!user?.entityId || m.entityId === user.entityId)),
    [allMerchants, user?.entityId],
  );
  const [form, setForm] = useState<FormState>(INITIAL);
  const [uploads, setUploads] = useState<Record<string, UploadedDoc>>({});
  const nav = useNavigate();

  if (user && user.role !== "bank_intake" && user.role !== "bank_admin") {
    return (
      <div className="p-8">
        <PageHeader
          title="غير مصرح بإنشاء طلب"
          subtitle="هذه الصفحة متاحة لمُدخِل البنك أو مسؤول البنك فقط."
        />
        <Button variant="outline" onClick={() => nav({ to: "/requests" })}>← العودة لقائمة الطلبات</Button>
      </div>
    );
  }

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  function buildRequest(stage: RequestStage): ImportRequest {
    const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const entity = ENTITIES.find((e) => e.id === user?.entityId) ?? ENTITIES[0];
    const ref = `IMP-2025-${Math.floor(2000 + Math.random() * 7000)}`;
    const progressByStage: Record<RequestStage, number> = {
      draft: 5, bank_submitted: 12, bank_internal_review: 22, bank_approved: 35,
      support_review: 45, support_returned: 30, support_rejected: 100, bank_returned: 18, bank_rejected: 100,
      support_approved: 60, swift_attached: 70, executive_voting: 80,
      executive_rejected: 100, executive_approved: 90, customs_released: 96, completed: 100,
    };
    const cur = CURRENCY_CODE[form.requestCurrency] ?? "USD";
    return {
      id, ref,
      importer: form.importer,
      entityId: user?.entityId ?? entity.id,
      bank: entity.name,
      amount: Number(form.requestTotal) || 0,
      currency: cur,
      type: form.commodity || "—",
      supplier: form.supplierName,
      invoice: form.invoiceNo,
      port: form.arrivalPort,
      stage,
      createdAt: new Date().toISOString(),
      progress: progressByStage[stage],
      duplicate: false,
      intakeUserId: user?.id ?? "u5",
      createdBy: user?.id ?? "u5",
      lastUpdatedBy: user?.id ?? "u5",
      submittedBy: stage === "draft" ? undefined : (user?.id ?? "u5"),
      documents: Object.entries(uploads).map(([name, u]) => ({
        name, fileName: u.file.name, mime: u.file.type, size: u.file.size, dataUrl: u.dataUrl,
      })),
      activity: form.linkedCompany || undefined,
      taxNo: form.taxNo || undefined,
      taxCardExpiry: form.taxCardExpiry || undefined,
      crNo: form.crNo || undefined,
      crExpiry: form.crExpiry || undefined,
      requestType: form.requestType || undefined,
      requestCurrency: form.requestCurrency || undefined,
      invoiceType: form.invoiceType || undefined,
      invoiceCurrency: form.invoiceCurrency || undefined,
      originCountry: form.originCountry || undefined,
      quantity: Number(form.quantity) || undefined,
      unit: form.unit || undefined,
      invoiceAmount: Number(form.invoiceTotal) || undefined,
      invoiceDate: form.invoiceDate || undefined,
      supplierLocation: form.supplierLocation || undefined,
      paymentTerms: form.coverageType || undefined,
      paymentTerm: form.paymentTerm,
      requestPercent: Number(form.requestPercent) || (form.paymentTerm === "كلي" ? 100 : 0),
      shipmentDate: form.shipmentDate || undefined,
      shipPort: form.shipPort || undefined,
      arrivalDate: form.arrivalDate || undefined,
      incoterm: form.incoterm || undefined,
      finalDestination: form.finalDestination || undefined,
      shareholders: form.shareholders
        .filter((s) => s.name.trim() && Number(s.percent) > 0)
        .map((s) => ({ name: s.name.trim(), percent: Number(s.percent) })),
      fxSources: form.fxSource || undefined,
      coverageMethod: form.coverageType || undefined,
    };
  }

  function persist(stage: RequestStage, successMsg: string) {
    if (!user) return;
    if (!form.importer || !form.taxNo || !form.invoiceNo) {
      toast.error("يرجى إكمال البيانات الأساسية وبيانات الفاتورة");
      setStep(0);
      return;
    }
    const pct = Number(form.requestPercent) || 0;
    if (form.paymentTerm === "كلي" && pct !== 100) {
      toast.error("في حالة الدفع الكلي يجب أن تكون النسبة 100%");
      setStep(1); return;
    }
    if (form.paymentTerm === "جزئي" && (pct < 5 || pct >= 100)) {
      toast.error("في حالة الدفع الجزئي يجب أن تكون النسبة بين 5% و 99%");
      setStep(1); return;
    }
    const taxId = form.taxNo.trim();
    if (taxId && form.invoiceNo.trim()) {
      const siblings = requestsCell.get().filter(
        (r) =>
          (r.taxNo ?? "").trim() === taxId &&
          r.invoice.trim() === form.invoiceNo.trim() &&
          r.stage !== "executive_rejected" &&
          r.stage !== "support_rejected" &&
          r.stage !== "bank_rejected",
      );
      const fullExists = siblings.some(
        (r) => (r.paymentTerm ?? (r.requestPercent === 100 ? "كلي" : undefined)) === "كلي",
      );
      const sumExisting = siblings.reduce((acc, r) => acc + (r.requestPercent ?? 0), 0);
      if (fullExists || sumExisting + pct > 100) {
        toast.error(
          `لا يمكن الحفظ: مجموع نسب الطلبات الحالية لهذه الفاتورة ${sumExisting}% وإضافة ${pct}% يتجاوز 100% أو يوجد طلب كلي مسبق.`,
        );
        setStep(1); return;
      }
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
    toast.success(successMsg);
    nav({ to: "/requests" });
  }

  return (
    <div>
      <PageHeader
        title="تقديم طلب تمويل واردات جديد"
        subtitle="املأ البيانات بدقة وأرفق المستندات المطلوبة"
        breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "الطلبات", to: "/requests" }, { label: "طلب جديد" }]}
      />

      <Card className="p-6 mb-6 shadow-card border-0">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center text-center">
                <div className={cn(
                  "h-10 w-10 rounded-full grid place-items-center font-semibold text-sm transition-colors",
                  i < step ? "bg-success text-white" : i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/15" : "bg-muted text-muted-foreground",
                )}>
                  {i < step ? <Check className="h-5 w-5" /> : i + 1}
                </div>
                <div className={cn("text-xs mt-2 max-w-[100px]", i === step ? "text-foreground font-semibold" : "text-muted-foreground")}>{s}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 mx-2 transition-colors", i < step ? "bg-success" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6 shadow-card border-0">
        {step === 0 && <Step1 form={form} update={update} merchants={bankMerchants} />}
        {step === 1 && <Step2 form={form} update={update} />}
        {step === 2 && <Step3 form={form} update={update} />}
        {step === 3 && <Step4 uploads={uploads} setUploads={setUploads} />}
        {step === 4 && <Step5 form={form} />}

        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronRight className="h-4 w-4 ml-1" /> السابق
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => persist("draft", "تم حفظ المسودة")}>
              <Save className="h-4 w-4 ml-1" /> حفظ كمسودة
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>
                التالي <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            ) : (
              <Button onClick={() => persist("bank_submitted", "تم إرسال الطلب بنجاح للمراجعة الداخلية")}>
                <Send className="h-4 w-4 ml-1" /> إرسال للمراجعة
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      {children}
    </div>
  );
}

type StepProps = { form: FormState; update: (p: Partial<FormState>) => void };

// ─────────────────────────── Step 1 ───────────────────────────
function Step1({ form, update, merchants }: StepProps & { merchants: Merchant[] }) {
  const [openCombo, setOpenCombo] = useState(false);

  function applyMerchant(m: Merchant) {
    update({
      importer: m.name,
      taxNo: m.tax,
      crNo: m.cr,
      taxCardExpiry: m.taxCardExpiry ?? "",
      crExpiry: m.crExpiry ?? "",
      linkedCompany: m.companies?.[0]?.name ?? "",
      shareholders: m.owners?.length
        ? m.owners.map((o) => ({ name: o.name, percent: String(o.percent) }))
        : [{ name: "", percent: "" }],
    });
  }

  function searchByTax() {
    const q = form.taxNo.trim();
    if (!q) return toast.error("أدخل الرقم الضريبي للبحث");
    const m = merchants.find((x) => x.tax === q);
    if (!m) return toast.error("لم يتم العثور على تاجر بهذا الرقم الضريبي");
    applyMerchant(m);
    toast.success(`تم جلب بيانات: ${m.name}`);
  }

  const selectedMerchant = merchants.find((m) => m.name === form.importer);
  const companyOptions = selectedMerchant?.companies ?? [];

  function updateShareholder(i: number, patch: Partial<{ name: string; percent: string }>) {
    const next = form.shareholders.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    update({ shareholders: next });
  }
  function addShareholder() {
    update({ shareholders: [...form.shareholders, { name: "", percent: "" }] });
  }
  function removeShareholder(i: number) {
    update({ shareholders: form.shareholders.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold">المعلومات الأساسية</h3>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="الرقم الضريبي" required>
          <div className="flex gap-2">
            <Input
              value={form.taxNo}
              onChange={(e) => update({ taxNo: e.target.value })}
              placeholder="أدخل الرقم الضريبي ثم اضغط بحث"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchByTax(); } }}
            />
            <Button type="button" variant="outline" size="icon" onClick={searchByTax} aria-label="بحث">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </Field>

        <Field label="اسم التاجر" required>
          <Popover open={openCombo} onOpenChange={setOpenCombo}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                {form.importer || "اختر أو ابحث عن تاجر"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width] pointer-events-auto" align="start">
              <Command>
                <CommandInput placeholder="ابحث بالاسم..." />
                <CommandList>
                  <CommandEmpty>لا توجد نتائج.</CommandEmpty>
                  <CommandGroup>
                    {merchants.map((m) => (
                      <CommandItem
                        key={m.id}
                        value={`${m.name} ${m.tax}`}
                        onSelect={() => { applyMerchant(m); setOpenCombo(false); }}
                      >
                        <Check className={cn("ml-2 h-4 w-4", form.importer === m.name ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col text-right">
                          <span>{m.name}</span>
                          <span className="text-xs text-muted-foreground">رقم ضريبي: {m.tax}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </Field>

        <Field label="الشركة المرتبطة" required>
          <Select
            value={form.linkedCompany}
            onValueChange={(v) => update({ linkedCompany: v })}
            disabled={companyOptions.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={companyOptions.length ? "اختر شركة" : "اختر التاجر أولاً"} />
            </SelectTrigger>
            <SelectContent>
              {companyOptions.map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="تاريخ انتهاء البطاقة الضريبية" required>
          <Input type="date" value={form.taxCardExpiry} onChange={(e) => update({ taxCardExpiry: e.target.value })} />
        </Field>

        <Field label="رقم السجل التجاري" required>
          <Input value={form.crNo} onChange={(e) => update({ crNo: e.target.value })} />
        </Field>

        <Field label="تاريخ انتهاء السجل التجاري" required>
          <Input type="date" value={form.crExpiry} onChange={(e) => update({ crExpiry: e.target.value })} />
        </Field>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">الملاك والمساهمون (25% فأكثر) <span className="text-destructive">*</span></h3>
          <Button type="button" size="sm" variant="outline" onClick={addShareholder}>+ إضافة مساهم</Button>
        </div>
        <div className="space-y-2">
          {form.shareholders.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-2 items-center">
              <Input
                placeholder="اسم المساهم / المالك"
                value={s.name}
                onChange={(e) => updateShareholder(i, { name: e.target.value })}
              />
              <Input
                type="number" min={25} max={100}
                placeholder="نسبة المساهمة %"
                value={s.percent}
                onChange={(e) => updateShareholder(i, { percent: e.target.value })}
              />
              <Button
                type="button" variant="ghost" size="icon"
                className="text-destructive h-9 w-9"
                onClick={() => removeShareholder(i)}
                disabled={form.shareholders.length === 1}
                aria-label="حذف"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Step 2 ───────────────────────────
function Step2({ form, update }: StepProps) {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold">بيانات الفاتورة</h3>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="نوع الطلب" required>
          <Select value={form.requestType} onValueChange={(v) => update({ requestType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="نوع التغطية" required>
          <Select value={form.coverageType} onValueChange={(v) => update({ coverageType: v })}>
            <SelectTrigger><SelectValue placeholder="اختر نوع التغطية" /></SelectTrigger>
            <SelectContent>
              {COVERAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="مصادر العملة الأجنبية" required>
          <Select value={form.fxSource} onValueChange={(v) => update({ fxSource: v })}>
            <SelectTrigger><SelectValue placeholder="اختر المصدر" /></SelectTrigger>
            <SelectContent>
              {FX_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="شروط الدفع" required>
          <Select
            value={form.paymentTerm}
            onValueChange={(v) =>
              update({
                paymentTerm: v as FormState["paymentTerm"],
                requestPercent: v === "كلي" ? "100" : form.requestPercent === "100" ? "" : form.requestPercent,
              })
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="كلي">كلي</SelectItem>
              <SelectItem value="جزئي">جزئي</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="نسبة الطلب %" required>
          <Input
            type="number"
            min={form.paymentTerm === "كلي" ? 100 : 5}
            max={form.paymentTerm === "كلي" ? 100 : 99}
            disabled={form.paymentTerm === "كلي"}
            value={form.requestPercent}
            onChange={(e) => update({ requestPercent: e.target.value })}
            placeholder={form.paymentTerm === "كلي" ? "100" : "5 إلى 99"}
          />
        </Field>

        <Field label="عملة الطلب" required>
          <Select value={form.requestCurrency} onValueChange={(v) => update({ requestCurrency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REQUEST_CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="إجمالي الطلب" required>
          <Input type="number" value={form.requestTotal} onChange={(e) => update({ requestTotal: e.target.value })} />
        </Field>

        <Field label="نوع الفاتورة" required>
          <Select value={form.invoiceType} onValueChange={(v) => update({ invoiceType: v })}>
            <SelectTrigger><SelectValue placeholder="اختر نوع الفاتورة" /></SelectTrigger>
            <SelectContent>
              {INVOICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="رقم الفاتورة" required>
          <Input value={form.invoiceNo} onChange={(e) => update({ invoiceNo: e.target.value })} />
        </Field>

        <Field label="عملة الفاتورة" required>
          <Input
            value={form.invoiceCurrency}
            onChange={(e) => update({ invoiceCurrency: e.target.value })}
            placeholder="مثال: USD / SAR / EUR"
          />
        </Field>

        <Field label="تاريخ الفاتورة" required>
          <Input type="date" value={form.invoiceDate} onChange={(e) => update({ invoiceDate: e.target.value })} />
        </Field>

        <Field label="الكمية" required>
          <Input type="number" value={form.quantity} onChange={(e) => update({ quantity: e.target.value })} />
        </Field>

        <Field label="وحدة القياس" required>
          <Input value={form.unit} onChange={(e) => update({ unit: e.target.value })} placeholder="طن / كرتون / لتر ..." />
        </Field>

        <Field label="إجمالي الفاتورة" required>
          <Input type="number" value={form.invoiceTotal} onChange={(e) => update({ invoiceTotal: e.target.value })} />
        </Field>

        <Field label="السلعة" required>
          <Select value={form.commodity} onValueChange={(v) => update({ commodity: v })}>
            <SelectTrigger><SelectValue placeholder="اختر السلعة" /></SelectTrigger>
            <SelectContent>
              {COMMODITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="اسم الشركة المصدرة" required>
          <Input value={form.supplierName} onChange={(e) => update({ supplierName: e.target.value })} />
        </Field>

        <Field label="موقع الشركة المصدرة" required>
          <Input value={form.supplierLocation} onChange={(e) => update({ supplierLocation: e.target.value })} placeholder="المدينة / الدولة" />
        </Field>

        <Field label="بلد المنشأ" required>
          <Select value={form.originCountry} onValueChange={(v) => update({ originCountry: v })}>
            <SelectTrigger><SelectValue placeholder="اختر بلد المنشأ" /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

// ─────────────────────────── Step 3 ───────────────────────────
function Step3({ form, update }: StepProps) {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold">بيانات الشحن</h3>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="تاريخ الشحن">
          <Input type="date" value={form.shipmentDate} onChange={(e) => update({ shipmentDate: e.target.value })} />
        </Field>
        <Field label="ميناء الشحن" required>
          <Input value={form.shipPort} onChange={(e) => update({ shipPort: e.target.value })} />
        </Field>
        <Field label="تاريخ الوصول">
          <Input type="date" value={form.arrivalDate} onChange={(e) => update({ arrivalDate: e.target.value })} />
        </Field>
        <Field label="ميناء الوصول" required>
          <Select value={form.arrivalPort} onValueChange={(v) => update({ arrivalPort: v })}>
            <SelectTrigger><SelectValue placeholder="اختر ميناء الوصول" /></SelectTrigger>
            <SelectContent>
              {ARRIVAL_PORTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="شروط التسليم" required>
          <Select value={form.incoterm} onValueChange={(v) => update({ incoterm: v })}>
            <SelectTrigger><SelectValue placeholder="اختر شرط التسليم" /></SelectTrigger>
            <SelectContent>
              {INCOTERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="الوجهة النهائية" required>
          <Input value={form.finalDestination} onChange={(e) => update({ finalDestination: e.target.value })} placeholder="المدينة / المخزن الوجهة" />
        </Field>
      </div>
    </div>
  );
}

// ─────────────────────────── Step 4 (Docs) ───────────────────────────
type UploadedDoc = { file: File; url: string; dataUrl: string };

function Step4({ uploads, setUploads }: {
  uploads: Record<string, UploadedDoc>;
  setUploads: React.Dispatch<React.SetStateAction<Record<string, UploadedDoc>>>;
}) {
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [preview, setPreview] = useState<{ name: string; url: string; type: string } | null>(null);

  function pick(name: string) { inputsRef.current[name]?.click(); }

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
      const { [name]: _omit, ...rest } = prev;
      return rest;
    });
  }

  return (
    <div className="space-y-6">
      <h3 className="font-semibold">رفع الوثائق المطلوبة</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {REQUIRED_DOCS.map((d) => {
          const up = uploads[d.name];
          const uploaded = !!up;
          return (
            <div key={d.key} className={cn(
              "border-2 border-dashed rounded-xl p-5 transition-colors",
              uploaded ? "border-success/40 bg-success/5" : "border-border hover:border-accent/40",
            )}>
              <input
                ref={(el) => { inputsRef.current[d.name] = el; }}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => onFile(d.name, e.target.files?.[0])}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-11 w-11 rounded-lg grid place-items-center",
                    uploaded ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                  )}>
                    {uploaded ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.required ? "مطلوب" : "اختياري"} · PDF, JPG (حد أقصى 10MB)
                    </div>
                  </div>
                </div>
                {d.required && <Badge variant="destructive" className="text-[10px]">إلزامي</Badge>}
              </div>
              {uploaded ? (
                <div className="mt-4 pt-4 border-t border-success/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-success shrink-0" />
                    <span className="font-medium truncate">{up.file.name}</span>
                    <Badge variant="secondary" className="gap-1 text-[10px] shrink-0"><ShieldCheck className="h-3 w-3" /> آمن</Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setPreview({ name: up.file.name, url: up.url, type: up.file.type })}
                      aria-label="معاينة"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => remove(d.name)} aria-label="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => pick(d.name)}>
                  <Upload className="h-4 w-4 ml-1" /> اضغط للرفع
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent dir="rtl" className="sm:max-w-3xl">
          <DialogHeader><DialogTitle className="truncate">{preview?.name}</DialogTitle></DialogHeader>
          {preview && (
            preview.type.startsWith("image/") ? (
              <img src={preview.url} alt={preview.name} className="max-h-[70vh] w-full object-contain rounded-md bg-muted" />
            ) : preview.type === "application/pdf" ? (
              <iframe src={preview.url} title={preview.name} className="w-full h-[70vh] rounded-md border" />
            ) : (
              <div className="text-sm text-muted-foreground p-6 text-center">
                لا يمكن المعاينة داخل المتصفح.{" "}
                <a href={preview.url} download={preview.name} className="text-primary underline">تنزيل الملف</a>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────── Step 5 (Review) ───────────────────────────
function Step5({ form }: { form: FormState }) {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold">مراجعة الطلب قبل الإرسال</h3>
      <div className="rounded-xl border bg-muted/30 p-6 space-y-5">
        <Section title="المعلومات الأساسية" rows={[
          ["الرقم الضريبي", form.taxNo || "—"],
          ["اسم التاجر", form.importer || "—"],
          ["الشركة المرتبطة", form.linkedCompany || "—"],
          ["انتهاء البطاقة الضريبية", form.taxCardExpiry || "—"],
          ["السجل التجاري", form.crNo || "—"],
          ["انتهاء السجل التجاري", form.crExpiry || "—"],
          [
            "المساهمون (≥25%)",
            form.shareholders.filter((s) => s.name).map((s) => `${s.name} (${s.percent || 0}%)`).join("، ") || "—",
          ],
        ]} />
        <Section title="بيانات الفاتورة" rows={[
          ["نوع الطلب", form.requestType || "—"],
          ["نوع التغطية", form.coverageType || "—"],
          ["مصادر العملة الأجنبية", form.fxSource || "—"],
          ["شروط الدفع", `${form.paymentTerm} (${form.requestPercent || 0}%)`],
          ["عملة الطلب / إجمالي الطلب", `${Number(form.requestTotal || 0).toLocaleString()} ${form.requestCurrency}`],
          ["نوع الفاتورة / رقمها", `${form.invoiceType || "—"} — ${form.invoiceNo || "—"}`],
          ["تاريخ الفاتورة", form.invoiceDate || "—"],
          ["الكمية / الوحدة", `${form.quantity || "—"} ${form.unit || ""}`],
          ["إجمالي الفاتورة", form.invoiceTotal ? `${Number(form.invoiceTotal).toLocaleString()} ${form.invoiceCurrency}` : "—"],
          ["السلعة", form.commodity || "—"],
          ["الشركة المصدرة", form.supplierName || "—"],
          ["موقع الشركة المصدرة", form.supplierLocation || "—"],
          ["بلد المنشأ", form.originCountry || "—"],
        ]} />
        <Section title="بيانات الشحن" rows={[
          ["تاريخ الشحن", form.shipmentDate || "—"],
          ["ميناء الشحن", form.shipPort || "—"],
          ["تاريخ الوصول", form.arrivalDate || "—"],
          ["ميناء الوصول", form.arrivalPort || "—"],
          ["شروط التسليم", form.incoterm || "—"],
          ["الوجهة النهائية", form.finalDestination || "—"],
        ]} />
      </div>
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <div className="font-medium text-sm mb-3 pb-2 border-b">{title}</div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
