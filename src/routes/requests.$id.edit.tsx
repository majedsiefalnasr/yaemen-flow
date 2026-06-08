import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Save, X } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, canViewRequest } from "@/lib/mock";
import { isEditable, logAudit, requestsCell } from "@/lib/governance";
import { toast } from "sonner";

export const Route = createFileRoute("/requests/$id/edit")({ component: EditRequest });

type Draft = {
  taxNo: string;
  importer: string;
  activity: string;
  taxCardExpiry: string;
  crNo: string;
  crExpiry: string;
  requestType: string;
  coverageMethod: string;
  fxSources: string;
  paymentTerm: "كلي" | "جزئي";
  requestPercent: string;
  requestCurrency: string;
  amount: string;
  invoiceType: string;
  invoice: string;
  invoiceCurrency: string;
  invoiceDate: string;
  quantity: string;
  unit: string;
  invoiceAmount: string;
  type: string;
  supplier: string;
  supplierLocation: string;
  originCountry: string;
  shipmentDate: string;
  shipPort: string;
  arrivalDate: string;
  port: string;
  incoterm: string;
  finalDestination: string;
};

function EditRequest() {
  const { id } = useParams({ from: "/requests/$id/edit" });
  const { user } = useAuth();
  const nav = useNavigate();
  const requests = requestsCell.use();
  const req = requests.find((r) => r.id === id);

  const [draft, setDraft] = useState<Draft>(() => ({
    taxNo: req?.taxNo ?? "",
    importer: req?.importer ?? "",
    activity: req?.activity ?? "",
    taxCardExpiry: req?.taxCardExpiry ?? "",
    crNo: req?.crNo ?? "",
    crExpiry: req?.crExpiry ?? "",
    requestType: req?.requestType ?? req?.type ?? "",
    coverageMethod: req?.coverageMethod ?? req?.paymentTerms ?? "",
    fxSources: req?.fxSources ?? "",
    paymentTerm: req?.paymentTerm ?? "كلي",
    requestPercent: String(req?.requestPercent ?? 100),
    requestCurrency: req?.requestCurrency ?? req?.currency ?? "USD",
    amount: String(req?.amount ?? ""),
    invoiceType: req?.invoiceType ?? "",
    invoice: req?.invoice ?? "",
    invoiceCurrency: req?.invoiceCurrency ?? req?.currency ?? "USD",
    invoiceDate: req?.invoiceDate ?? "",
    quantity: req?.quantity != null ? String(req.quantity) : "",
    unit: req?.unit ?? "",
    invoiceAmount: req?.invoiceAmount != null ? String(req.invoiceAmount) : "",
    type: req?.type ?? "",
    supplier: req?.supplier ?? "",
    supplierLocation: req?.supplierLocation ?? "",
    originCountry: req?.originCountry ?? "",
    shipmentDate: req?.shipmentDate ?? "",
    shipPort: req?.shipPort ?? "",
    arrivalDate: req?.arrivalDate ?? "",
    port: req?.port ?? "",
    incoterm: req?.incoterm ?? "",
    finalDestination: req?.finalDestination ?? "",
  }));

  if (!user || !req) return null;
  if (!canViewRequest(user, req) || !isEditable(req)) {
    return (
      <div>
        <PageHeader title="غير قابل للتعديل" subtitle="هذا الطلب غير متاح للتعديل في مرحلته الحالية." />
        <Button variant="outline" asChild>
          <Link to="/requests/$id" params={{ id }}>العودة للطلب</Link>
        </Button>
      </div>
    );
  }

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function save() {
    if (!draft.taxNo.trim() || !draft.importer.trim() || !draft.invoice.trim()) {
      toast.error("الرقم الضريبي واسم التاجر ورقم الفاتورة حقول مطلوبة");
      return;
    }
    const pct = Number(draft.requestPercent) || 0;
    if (draft.paymentTerm === "كلي" && pct !== 100) {
      toast.error("في حالة الدفع الكلي يجب أن تكون النسبة 100%");
      return;
    }
    if (draft.paymentTerm === "جزئي" && (pct < 5 || pct >= 100)) {
      toast.error("في حالة الدفع الجزئي يجب أن تكون النسبة بين 5% و 99%");
      return;
    }
    const siblings = requestsCell.get().filter(
      (r) =>
        r.id !== req.id &&
        (r.taxNo ?? "").trim() === draft.taxNo.trim() &&
        r.invoice.trim() === draft.invoice.trim() &&
        !["executive_rejected", "support_rejected", "bank_rejected"].includes(r.stage),
    );
    const fullExists = siblings.some(
      (r) => (r.paymentTerm ?? (r.requestPercent === 100 ? "كلي" : undefined)) === "كلي",
    );
    const sumExisting = siblings.reduce((acc, r) => acc + (r.requestPercent ?? 0), 0);
    if (fullExists || sumExisting + pct > 100) {
      toast.error("لا يمكن الحفظ: يوجد طلب كلي مسبق أو مجموع نسب الفاتورة يتجاوز 100%");
      return;
    }

    requestsCell.set((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              importer: draft.importer.trim(),
              amount: Number(draft.amount) || 0,
              type: draft.type.trim() || "—",
              supplier: draft.supplier.trim(),
              invoice: draft.invoice.trim(),
              port: draft.port.trim(),
              lastUpdatedBy: user.id,
              activity: draft.activity.trim() || undefined,
              taxNo: draft.taxNo.trim(),
              taxCardExpiry: draft.taxCardExpiry || undefined,
              crNo: draft.crNo.trim() || undefined,
              crExpiry: draft.crExpiry || undefined,
              requestType: draft.requestType.trim() || undefined,
              requestCurrency: draft.requestCurrency.trim() || undefined,
              invoiceType: draft.invoiceType.trim() || undefined,
              invoiceCurrency: draft.invoiceCurrency.trim() || undefined,
              originCountry: draft.originCountry.trim() || undefined,
              quantity: Number(draft.quantity) || undefined,
              unit: draft.unit.trim() || undefined,
              invoiceAmount: Number(draft.invoiceAmount) || undefined,
              invoiceDate: draft.invoiceDate || undefined,
              supplierLocation: draft.supplierLocation.trim() || undefined,
              paymentTerms: draft.coverageMethod.trim() || undefined,
              paymentTerm: draft.paymentTerm,
              requestPercent: pct,
              shipmentDate: draft.shipmentDate || undefined,
              shipPort: draft.shipPort.trim() || undefined,
              arrivalDate: draft.arrivalDate || undefined,
              incoterm: draft.incoterm.trim() || undefined,
              finalDestination: draft.finalDestination.trim() || undefined,
              fxSources: draft.fxSources.trim() || undefined,
              coverageMethod: draft.coverageMethod.trim() || undefined,
            }
          : r,
      ),
    );
    logAudit({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: "تعديل بيانات طلب",
      ref: req.ref,
      notes: draft.invoice,
    });
    toast.success("تم حفظ تعديلات الطلب");
    nav({ to: "/requests/$id", params: { id: req.id } });
  }

  return (
    <div>
      <PageHeader
        title={`تعديل ${req.ref}`}
        subtitle="تعديل بيانات الطلب في المراحل القابلة للتعديل فقط"
        breadcrumbs={[
          { label: "الرئيسية", to: "/" },
          { label: "الطلبات", to: "/requests" },
          { label: req.ref, to: `/requests/${req.id}` },
          { label: "تعديل" },
        ]}
      />

      <Card className="p-6 shadow-card border-0">
        <Tabs defaultValue="basic">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
            <TabsTrigger value="invoice">بيانات الفاتورة</TabsTrigger>
            <TabsTrigger value="shipping">بيانات الشحن</TabsTrigger>
            <TabsTrigger value="docs">الوثائق المطلوبة</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="الرقم الضريبي"><Input value={draft.taxNo} onChange={(e) => update({ taxNo: e.target.value })} /></Field>
              <Field label="اسم التاجر"><Input value={draft.importer} onChange={(e) => update({ importer: e.target.value })} /></Field>
              <Field label="الشركة المرتبطة"><Input value={draft.activity} onChange={(e) => update({ activity: e.target.value })} /></Field>
              <Field label="انتهاء البطاقة الضريبية"><Input type="date" value={draft.taxCardExpiry} onChange={(e) => update({ taxCardExpiry: e.target.value })} /></Field>
              <Field label="رقم السجل التجاري"><Input value={draft.crNo} onChange={(e) => update({ crNo: e.target.value })} /></Field>
              <Field label="انتهاء السجل التجاري"><Input type="date" value={draft.crExpiry} onChange={(e) => update({ crExpiry: e.target.value })} /></Field>
            </div>
          </TabsContent>

          <TabsContent value="invoice" className="mt-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="نوع الطلب"><Input value={draft.requestType} onChange={(e) => update({ requestType: e.target.value })} /></Field>
              <Field label="نوع التغطية"><Input value={draft.coverageMethod} onChange={(e) => update({ coverageMethod: e.target.value })} /></Field>
              <Field label="مصادر العملة الأجنبية"><Input value={draft.fxSources} onChange={(e) => update({ fxSources: e.target.value })} /></Field>
              <Field label="شروط الدفع"><Input value={draft.paymentTerm} onChange={(e) => update({ paymentTerm: e.target.value === "جزئي" ? "جزئي" : "كلي", requestPercent: e.target.value === "كلي" ? "100" : draft.requestPercent })} /></Field>
              <Field label="نسبة الطلب"><Input type="number" value={draft.requestPercent} onChange={(e) => update({ requestPercent: e.target.value })} /></Field>
              <Field label="عملة الطلب"><Input value={draft.requestCurrency} onChange={(e) => update({ requestCurrency: e.target.value })} /></Field>
              <Field label="إجمالي الطلب"><Input type="number" value={draft.amount} onChange={(e) => update({ amount: e.target.value })} /></Field>
              <Field label="نوع الفاتورة"><Input value={draft.invoiceType} onChange={(e) => update({ invoiceType: e.target.value })} /></Field>
              <Field label="رقم الفاتورة"><Input value={draft.invoice} onChange={(e) => update({ invoice: e.target.value })} /></Field>
              <Field label="عملة الفاتورة"><Input value={draft.invoiceCurrency} onChange={(e) => update({ invoiceCurrency: e.target.value })} /></Field>
              <Field label="تاريخ الفاتورة"><Input type="date" value={draft.invoiceDate} onChange={(e) => update({ invoiceDate: e.target.value })} /></Field>
              <Field label="الكمية"><Input type="number" value={draft.quantity} onChange={(e) => update({ quantity: e.target.value })} /></Field>
              <Field label="وحدة القياس"><Input value={draft.unit} onChange={(e) => update({ unit: e.target.value })} /></Field>
              <Field label="إجمالي الفاتورة"><Input type="number" value={draft.invoiceAmount} onChange={(e) => update({ invoiceAmount: e.target.value })} /></Field>
              <Field label="السلعة"><Input value={draft.type} onChange={(e) => update({ type: e.target.value })} /></Field>
              <Field label="اسم الشركة المصدرة"><Input value={draft.supplier} onChange={(e) => update({ supplier: e.target.value })} /></Field>
              <Field label="موقع الشركة المصدرة"><Input value={draft.supplierLocation} onChange={(e) => update({ supplierLocation: e.target.value })} /></Field>
              <Field label="بلد المنشأ"><Input value={draft.originCountry} onChange={(e) => update({ originCountry: e.target.value })} /></Field>
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="mt-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="تاريخ الشحن"><Input type="date" value={draft.shipmentDate} onChange={(e) => update({ shipmentDate: e.target.value })} /></Field>
              <Field label="ميناء الشحن"><Input value={draft.shipPort} onChange={(e) => update({ shipPort: e.target.value })} /></Field>
              <Field label="تاريخ الوصول"><Input type="date" value={draft.arrivalDate} onChange={(e) => update({ arrivalDate: e.target.value })} /></Field>
              <Field label="ميناء الوصول"><Input value={draft.port} onChange={(e) => update({ port: e.target.value })} /></Field>
              <Field label="شروط التسليم"><Input value={draft.incoterm} onChange={(e) => update({ incoterm: e.target.value })} /></Field>
              <Field label="الوجهة النهائية"><Input value={draft.finalDestination} onChange={(e) => update({ finalDestination: e.target.value })} /></Field>
            </div>
          </TabsContent>

          <TabsContent value="docs" className="mt-5">
            <div className="space-y-2">
              {(req.documents ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">لا توجد مرفقات محفوظة لهذا الطلب.</div>
              ) : (
                req.documents!.map((d) => (
                  <div key={d.name + d.fileName} className="flex justify-between rounded-lg border p-3 text-sm">
                    <span>{d.name}</span>
                    <span className="text-muted-foreground">{d.fileName}</span>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-2 border-t pt-5">
          <Button variant="outline" asChild>
            <Link to="/requests/$id" params={{ id: req.id }}>
              <X className="h-4 w-4 ml-1" /> إلغاء
            </Link>
          </Button>
          <Button onClick={save}>
            <Save className="h-4 w-4 ml-1" /> حفظ التعديلات
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
