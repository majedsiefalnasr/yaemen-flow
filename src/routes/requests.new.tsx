import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Upload, FileText, ChevronLeft, ChevronRight, Save, Send, Check,
  ShieldCheck, Eye, Trash2, FileCheck2,
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth, ENTITIES, type ImportRequest, type RequestStage } from "@/lib/mock";
import { requestsCell, merchantsCell, logAudit, notify } from "@/lib/governance";

export const Route = createFileRoute("/requests/new")({ component: NewRequest });

const STEPS = ["بيانات الطلب", "بيانات المورد والشحنة", "الوثائق المطلوبة", "المراجعة والإرسال"];

const CONFIRMATION_TEMPLATE_URL = "/templates/نموذج-طلب-وثيقة-تأكيد.pdf";

const TYPE_LABEL: Record<string, string> = {
  food: "مواد غذائية", med: "أدوية ومستلزمات طبية", oil: "مشتقات نفطية", parts: "قطع غيار",
};
const PORT_LABEL: Record<string, string> = {
  aden: "ميناء عدن", hodeidah: "ميناء الحديدة", mukalla: "ميناء المكلا",
};
const COUNTRY_LABEL: Record<string, string> = {
  us: "الولايات المتحدة", cn: "الصين", in: "الهند", sa: "المملكة العربية السعودية",
};

type FormState = {
  type: string; importer: string; amount: string; currency: "USD" | "EUR" | "SAR";
  payment: string; dueDate: string; notes: string;
  supplier: string; country: string; invoice: string; invoiceDate: string;
  shipPort: string; arrivalPort: string; bl: string; customs: string;
  // — بيانات التاجر —
  activity: string; taxNo: string; crNo: string;
  // — بيانات الفاتورة والشحنة —
  invoiceAmount: string; shipmentDate: string;
  // — شرط الدفع المبدئي ونسبة الطلب —
  paymentTerm: "كلي" | "جزئي";
  requestPercent: string;
  // — الملاك ومصادر الأموال والتغطية —
  shareholders: { name: string; percent: string }[];
  yerSources: string; fxSources: string; coverageMethod: string;
};

const INITIAL: FormState = {
  type: "food", importer: "",
  amount: "850000", currency: "USD", payment: "lc", dueDate: "2025-12-15", notes: "",
  supplier: "Cargill Trading Inc.", country: "us", invoice: `INV-2025-${Math.floor(Math.random() * 9000 + 1000)}`,
  invoiceDate: "2025-10-22", shipPort: "Port of Houston, USA", arrivalPort: "aden",
  bl: "BL-CRG-2025-991", customs: "aden_c",
  activity: "تجارة عامة واستيراد",
  taxNo: "", crNo: "",
  invoiceAmount: "850000",
  shipmentDate: "2025-11-05",
  paymentTerm: "كلي",
  requestPercent: "100",
  shareholders: [{ name: "", percent: "" }],
  yerSources: "إيرادات نشاط الشركة بالعملة المحلية",
  fxSources: "تحصيلات تصدير + شراء من السوق المحلي عبر صرّافين معتمدين",
  coverageMethod: "تحويل بنكي خارجي عبر بنك مراسل",
};

function NewRequest() {
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const allMerchants = merchantsCell.use();
  const bankMerchants = useMemo(
    () => allMerchants.filter((m) => m.status === "active" && (!user?.entityId || m.entityId === user.entityId)),
    [allMerchants, user?.entityId],
  );
  const [form, setForm] = useState<FormState>(() => ({ ...INITIAL, importer: bankMerchants[0]?.name ?? "" }));
  const [uploads, setUploads] = useState<Record<string, UploadedDoc>>({});
  const nav = useNavigate();

  // إنشاء الطلبات متاح لمدخل البنك ومسؤول البنك فقط.
  if (user && user.role !== "bank_intake" && user.role !== "bank_admin") {
    return (
      <div className="p-8">
        <PageHeader
          title="غير مصرح بإنشاء طلب"
          subtitle="هذه الصفحة متاحة لمُدخِل البنك أو مسؤول البنك فقط. المراجع الداخلي وأدوار اللجنة الوطنية لتنظيم وتمويل الواردات لا تنشئ الطلبات."
        />
        <Button variant="outline" onClick={() => nav({ to: "/requests" })}>
          ← العودة لقائمة الطلبات
        </Button>
      </div>
    );
  }

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  function buildRequest(stage: RequestStage): ImportRequest {
    const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const entity = ENTITIES.find((e) => e.id === user?.entityId) ?? ENTITIES[0];
    const ref = `IMP-2025-${Math.floor(2000 + Math.random() * 7000)}`;
    const stageOrderLen = 11;
    const progressByStage: Record<RequestStage, number> = {
      draft: 5, bank_submitted: 12, bank_internal_review: 22, bank_approved: 35,
      support_review: 45, support_returned: 30, support_rejected: 100, bank_returned: 18, bank_rejected: 100,
      support_approved: 60, swift_attached: 70, executive_voting: 80,
      executive_rejected: 100, executive_approved: 90, customs_released: 96, completed: 100,
    };
    return {
      id, ref,
      importer: form.importer,
      entityId: user?.entityId ?? entity.id,
      bank: entity.name,
      amount: Number(form.amount) || 0,
      currency: form.currency,
      type: TYPE_LABEL[form.type] ?? form.type,
      supplier: form.supplier,
      invoice: form.invoice,
      port: PORT_LABEL[form.arrivalPort] ?? form.arrivalPort,
      stage,
      createdAt: new Date().toISOString(),
      progress: progressByStage[stage],
      risk: "low",
      duplicate: false,
      intakeUserId: user?.id ?? "u5",
      createdBy: user?.id ?? "u5",
      lastUpdatedBy: user?.id ?? "u5",
      submittedBy: stage === "draft" ? undefined : (user?.id ?? "u5"),
      documents: Object.entries(uploads).map(([name, u]) => ({
        name,
        fileName: u.file.name,
        mime: u.file.type,
        size: u.file.size,
        dataUrl: u.dataUrl,
      })),
      activity: form.activity || undefined,
      taxNo: form.taxNo || undefined,
      crNo: form.crNo || undefined,
      originCountry: COUNTRY_LABEL[form.country] ?? form.country,
      invoiceAmount: Number(form.invoiceAmount) || undefined,
      invoiceDate: form.invoiceDate || undefined,
      paymentTerms: form.payment.toUpperCase(),
      paymentTerm: form.paymentTerm,
      requestPercent: Number(form.requestPercent) || (form.paymentTerm === "كلي" ? 100 : 0),
      shipmentDate: form.shipmentDate || undefined,
      shipPort: form.shipPort || undefined,
      shareholders: form.shareholders
        .filter((s) => s.name.trim() && Number(s.percent) > 0)
        .map((s) => ({ name: s.name.trim(), percent: Number(s.percent) })),
      yerSources: form.yerSources || undefined,
      fxSources: form.fxSources || undefined,
      coverageMethod: form.coverageMethod || undefined,
    };
  }

  function persist(stage: RequestStage, successMsg: string) {
    if (!user) return;
    if (!form.importer || !form.amount || !form.invoice) {
      toast.error("يرجى إكمال البيانات الأساسية");
      setStep(0);
      return;
    }
    // منع التكرار: نفس الرقم الضريبي + رقم الفاتورة لا يُسمح به
    // (مرحلة لاحقة: السماح بالفواتير الجزئية إذا لم يصل المجموع إلى 100%).
    const merchant = allMerchants.find((m) => m.name === form.importer);
    const taxId = (form.taxNo || merchant?.tax || "").trim();
    if (taxId && form.invoice.trim()) {
      const dup = requestsCell.get().some(
        (r) =>
          (r.taxNo ?? "").trim() === taxId &&
          r.invoice.trim() === form.invoice.trim(),
      );
      if (dup) {
        toast.error("يوجد طلب سابق بنفس الرقم الضريبي ورقم الفاتورة — لا يُسمح بالتكرار");
        setStep(0);
        return;
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
        {step === 0 && <Step1 form={form} update={update} />}
        {step === 1 && <Step2 form={form} update={update} />}
        {step === 2 && <Step3 form={form} uploads={uploads} setUploads={setUploads} />}
        {step === 3 && <Step4 form={form} />}

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

function Step1({ form, update }: StepProps) {
  const { user } = useAuth();
  const allMerchants = merchantsCell.use();
  const bankMerchants = useMemo(
    () => allMerchants.filter((m) => m.status === "active" && (!user?.entityId || m.entityId === user.entityId)),
    [allMerchants, user?.entityId],
  );
  function pickMerchant(name: string) {
    const m = bankMerchants.find((x) => x.name === name);
    update({
      importer: name,
      taxNo: m?.tax ?? "",
      crNo: m?.cr ?? "",
      activity: m?.companies?.[0]?.sector ?? form.activity,
    });
  }
  return (
    <div className="space-y-6">
      <h3 className="font-semibold">معلومات الطلب الأساسية</h3>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="نوع الواردات" required>
          <Select value={form.type} onValueChange={(v) => update({ type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="اسم التاجر المستورد" required>
          <Select value={form.importer} onValueChange={pickMerchant}>
            <SelectTrigger><SelectValue placeholder={bankMerchants.length ? "اختر التاجر" : "لا يوجد تجار مسجلون لهذا البنك"} /></SelectTrigger>
            <SelectContent>
              {bankMerchants.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {bankMerchants.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">يجب إضافة تجار للبنك أولاً من شاشة سجل التجار.</p>
          )}
        </Field>
        <Field label="نوع النشاط التجاري" required>
          <Input value={form.activity} onChange={(e) => update({ activity: e.target.value })} placeholder="مثل: تجارة جملة مواد غذائية" />
        </Field>
        <Field label="الرقم الضريبي" required>
          <Input value={form.taxNo} onChange={(e) => update({ taxNo: e.target.value })} placeholder="يُعبأ تلقائياً من بيانات التاجر" />
        </Field>
        <Field label="رقم السجل التجاري" required>
          <Input value={form.crNo} onChange={(e) => update({ crNo: e.target.value })} placeholder="يُعبأ تلقائياً من بيانات التاجر" />
        </Field>
        <Field label="مبلغ العملة الأجنبية المطلوبة" required>
          <Input type="number" value={form.amount} onChange={(e) => update({ amount: e.target.value })} />
        </Field>
        <Field label="العملة" required>
          <Select value={form.currency} onValueChange={(v) => update({ currency: v as FormState["currency"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
              <SelectItem value="EUR">يورو (EUR)</SelectItem>
              <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="شروط الدفع" required>
          <Select value={form.payment} onValueChange={(v) => update({ payment: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lc">اعتماد مستندي L/C</SelectItem>
              <SelectItem value="dp">دفع مقابل مستندات D/P</SelectItem>
              <SelectItem value="tt">حوالة برقية T/T</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="طريقة التغطية خارجياً" required>
          <Input value={form.coverageMethod} onChange={(e) => update({ coverageMethod: e.target.value })} placeholder="مثل: تحويل بنكي عبر بنك مراسل" />
        </Field>
        <Field label="تاريخ الاستحقاق المتوقع">
          <Input type="date" value={form.dueDate} onChange={(e) => update({ dueDate: e.target.value })} />
        </Field>
      </div>
      <Field label="ملاحظات إضافية">
        <Textarea rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })} />
      </Field>
    </div>
  );
}

function Step2({ form, update }: StepProps) {
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
      <h3 className="font-semibold">بيانات المورد والشحنة</h3>
      <div className="grid md:grid-cols-2 gap-5">
        <Field label="اسم المورد" required>
          <Input value={form.supplier} onChange={(e) => update({ supplier: e.target.value })} />
        </Field>
        <Field label="بلد المنشأ" required>
          <Select value={form.country} onValueChange={(v) => update({ country: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(COUNTRY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="مرجع الفاتورة" required>
          <Input value={form.invoice} onChange={(e) => update({ invoice: e.target.value })} />
        </Field>
        <Field label="تاريخ الفاتورة" required>
          <Input type="date" value={form.invoiceDate} onChange={(e) => update({ invoiceDate: e.target.value })} />
        </Field>
        <Field label="مبلغ الفاتورة" required>
          <Input type="number" value={form.invoiceAmount} onChange={(e) => update({ invoiceAmount: e.target.value })} />
        </Field>
        <Field label="تاريخ الشحن" required>
          <Input type="date" value={form.shipmentDate} onChange={(e) => update({ shipmentDate: e.target.value })} />
        </Field>
        <Field label="ميناء الشحن" required>
          <Input value={form.shipPort} onChange={(e) => update({ shipPort: e.target.value })} />
        </Field>
        <Field label="ميناء الوصول" required>
          <Select value={form.arrivalPort} onValueChange={(v) => update({ arrivalPort: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PORT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="رقم بوليصة الشحن">
          <Input value={form.bl} onChange={(e) => update({ bl: e.target.value })} />
        </Field>
        <Field label="الجمارك المختصة">
          <Select value={form.customs} onValueChange={(v) => update({ customs: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="aden_c">جمارك عدن</SelectItem>
              <SelectItem value="hod_c">جمارك الحديدة</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">المساهمون / الملاك (بنسبة 25% فأكثر)</h3>
          <Button type="button" size="sm" variant="outline" onClick={addShareholder}>
            + إضافة مساهم
          </Button>
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

      <div className="grid md:grid-cols-2 gap-5 pt-4 border-t">
        <Field label="مصادر توريدات الريال اليمني" required>
          <Textarea rows={2} value={form.yerSources} onChange={(e) => update({ yerSources: e.target.value })} />
        </Field>
        <Field label="مصادر العملة الأجنبية" required>
          <Textarea rows={2} value={form.fxSources} onChange={(e) => update({ fxSources: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

type UploadedDoc = { file: File; url: string; dataUrl: string };

function Step3({ form, uploads, setUploads }: {
  form: FormState;
  uploads: Record<string, UploadedDoc>;
  setUploads: React.Dispatch<React.SetStateAction<Record<string, UploadedDoc>>>;
}) {
  const licenseRequired = form.type === "oil" || form.type === "med";
  const docNames = useMemo(() => {
    const list = [
      { name: "طلب وثيقة تأكيد (مختوم)", required: true },
      { name: "الفاتورة الأولية (Proforma Invoice)", required: true },
      { name: "السجل التجاري", required: true },
      { name: "البطاقة الضريبية", required: true },
    ];
    if (licenseRequired) list.push({ name: `الترخيص (${TYPE_LABEL[form.type]})`, required: true });
    list.push({ name: "مستندات إضافية", required: false });
    return list;
  }, [licenseRequired, form.type]);

  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [preview, setPreview] = useState<{ name: string; url: string; type: string } | null>(null);

  function pick(name: string) {
    inputsRef.current[name]?.click();
  }

  function onFile(name: string, file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("حجم الملف يتجاوز 10MB");
      return;
    }
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

  return (
    <div className="space-y-6">
      <h3 className="font-semibold">رفع الوثائق المطلوبة</h3>
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm space-y-2">
        <div className="font-semibold text-accent flex items-center gap-2">
          <FileText className="h-4 w-4" /> طلب وثيقة تأكيد
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          نزّل النموذج، املأ بيانات الطلب وأختمه بختم البنك، ثم ارفعه ضمن الوثائق أدناه.
        </p>
        <Button asChild variant="outline" size="sm" className="h-8">
          <a href={CONFIRMATION_TEMPLATE_URL} download>
            <FileText className="h-3.5 w-3.5 ml-1" /> تحميل طلب وثيقة تأكيد
          </a>
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {docNames.map((d) => {
          const up = uploads[d.name];
          const uploaded = !!up;
          return (
            <div key={d.name} className={cn(
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
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => setPreview({ name: up.file.name, url: up.url, type: up.file.type })}
                      aria-label="معاينة"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => remove(d.name)}
                      aria-label="حذف"
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
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.name}</DialogTitle>
          </DialogHeader>
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

function Step4({ form }: { form: FormState }) {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold">مراجعة الطلب قبل الإرسال</h3>
      <div className="rounded-xl border bg-muted/30 p-6 space-y-5">
        <Section title="بيانات الطلب" rows={[
          ["اسم التاجر المستورد", form.importer],
          ["نوع النشاط التجاري", form.activity],
          ["الرقم الضريبي", form.taxNo || "—"],
          ["السجل التجاري", form.crNo || "—"],
          ["نوع الواردات", TYPE_LABEL[form.type] ?? form.type],
          ["مبلغ العملة الأجنبية المطلوبة", `${Number(form.amount).toLocaleString()} ${form.currency}`],
          ["شروط الدفع", form.payment.toUpperCase()],
          ["طريقة التغطية خارجياً", form.coverageMethod || "—"],
        ]} />
        <Section title="بيانات المورد والشحنة" rows={[
          ["المورد", form.supplier],
          ["بلد المنشأ", COUNTRY_LABEL[form.country] ?? form.country],
          ["مرجع الفاتورة", form.invoice],
          ["تاريخ الفاتورة", form.invoiceDate || "—"],
          ["مبلغ الفاتورة", form.invoiceAmount ? `${Number(form.invoiceAmount).toLocaleString()} ${form.currency}` : "—"],
          ["تاريخ الشحن", form.shipmentDate || "—"],
          ["ميناء الشحن", form.shipPort || "—"],
          ["ميناء الوصول", PORT_LABEL[form.arrivalPort] ?? form.arrivalPort],
        ]} />
        <Section title="الملاك والمصادر" rows={[
          [
            "المساهمون (≥25%)",
            form.shareholders.filter((s) => s.name).map((s) => `${s.name} (${s.percent || 0}%)`).join("، ") || "—",
          ],
          ["مصادر توريدات الريال اليمني", form.yerSources || "—"],
          ["مصادر العملة الأجنبية", form.fxSources || "—"],
        ]} />
      </div>
      <div className="flex items-start gap-3 p-4 rounded-lg bg-info/5 border border-info/20">
        <ShieldCheck className="h-5 w-5 text-info mt-0.5 shrink-0" />
        <div className="text-sm">
          <div className="font-medium">إقرار وتعهد</div>
          <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
            أُقر بأن جميع البيانات والمستندات المقدمة صحيحة وكاملة، وأتحمل المسؤولية القانونية عن أي بيانات غير دقيقة.
            سيتم إخضاع الطلب للتدقيق التلقائي للتحقق من الفواتير المكررة والامتثال.
          </p>
        </div>
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
