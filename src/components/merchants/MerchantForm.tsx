import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Save, X, Users, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth, ENTITIES, type Merchant } from "@/lib/mock";
import { merchantsCell, logAudit } from "@/lib/governance";
import { COMPANY_SECTORS } from "@/lib/constants";
import { toast } from "sonner";

type Owner = { name: string; percent: number };
type Company = { name: string; sector: string };

export function MerchantForm({ initial, mode }: { initial?: Merchant; mode: "create" | "edit" }) {
  const { user } = useAuth();
  const nav = useNavigate();

  const [tax, setTax] = useState(initial?.tax ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [taxCardExpiry, setTaxCardExpiry] = useState(initial?.taxCardExpiry ?? "");
  const [cr, setCr] = useState(initial?.cr ?? "");
  const [crExpiry, setCrExpiry] = useState(initial?.crExpiry ?? "");
  const [status, setStatus] = useState<"active" | "suspended">(initial?.status ?? "active");
  const [entityId, setEntityId] = useState<string>(
    initial?.entityId ?? user?.entityId ?? ENTITIES[0].id,
  );
  const [owners, setOwners] = useState<Owner[]>(
    initial?.owners?.length ? initial.owners : [{ name: "", percent: 25 }],
  );
  const [companies, setCompanies] = useState<Company[]>(
    initial?.companies?.length ? initial.companies : [{ name: "", sector: COMPANY_SECTORS[0] }],
  );

  const updateOwner = (i: number, patch: Partial<Owner>) =>
    setOwners((arr) => arr.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const updateCompany = (i: number, patch: Partial<Company>) =>
    setCompanies((arr) => arr.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const ownerTotal = owners.reduce((s, o) => s + (Number(o.percent) || 0), 0);

  const errors: string[] = [];
  if (!tax.trim()) errors.push("الرقم الضريبي مطلوب");
  if (!name.trim()) errors.push("اسم التاجر مطلوب");
  if (!taxCardExpiry) errors.push("تاريخ انتهاء البطاقة الضريبية مطلوب");
  if (!cr.trim()) errors.push("رقم السجل التجاري مطلوب");
  if (!crExpiry) errors.push("تاريخ انتهاء السجل التجاري مطلوب");
  const cleanOwners = owners.filter((o) => o.name.trim() && Number(o.percent) > 0);
  if (cleanOwners.length === 0) errors.push("يجب إضافة مالك واحد على الأقل");
  if (cleanOwners.some((o) => o.percent < 25))
    errors.push("جميع الملاك يجب أن يكونوا بنسبة 25% فأكثر");
  if (ownerTotal > 100) errors.push("مجموع نسب الملاك لا يجوز أن يتجاوز 100%");
  const cleanCompanies = companies.filter((c) => c.name.trim() && c.sector.trim());
  if (cleanCompanies.length === 0) errors.push("يجب إضافة شركة واحدة على الأقل");

  function submit() {
    if (errors.length || !user) {
      toast.error(errors[0] ?? "بيانات غير مكتملة");
      return;
    }
    // PK is tax number — check duplicates (except own row in edit mode)
    const all = merchantsCell.get();
    const dup = all.find((m) => m.tax.trim() === tax.trim() && m.id !== initial?.id);
    if (dup) {
      toast.error(`الرقم الضريبي ${tax} مسجّل مسبقاً للتاجر "${dup.name}"`);
      return;
    }
    const record: Merchant = {
      id: initial?.id ?? `m_${Date.now()}`,
      tax: tax.trim(),
      name: name.trim(),
      taxCardExpiry,
      cr: cr.trim(),
      crExpiry,
      owners: cleanOwners,
      companies: cleanCompanies,
      status,
      entityId,
      transactions: initial?.transactions ?? 0,
    };
    if (mode === "create") {
      merchantsCell.set((prev) => [record, ...prev]);
      logAudit({ userId: user.id, userName: user.name, role: user.role, action: "إضافة تاجر جديد", ref: record.cr, notes: record.name });
      toast.success(`تم تسجيل التاجر "${record.name}"`);
    } else {
      merchantsCell.set((prev) => prev.map((m) => (m.id === record.id ? record : m)));
      logAudit({ userId: user.id, userName: user.name, role: user.role, action: "تعديل بيانات تاجر", ref: record.cr, notes: record.name });
      toast.success("تم تحديث بيانات التاجر");
    }
    nav({ to: "/merchants" });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="p-6 shadow-card border-0 space-y-5">
        <h3 className="font-semibold">البيانات الأساسية</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="الرقم الضريبي *">
            <Input value={tax} onChange={(e) => setTax(e.target.value)} placeholder="4123456" disabled={mode === "edit"} />
          </Field>
          <Field label="اسم التاجر *">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم التاجر/الشركة" />
          </Field>
          <Field label="تاريخ انتهاء البطاقة الضريبية *">
            <Input type="date" value={taxCardExpiry} onChange={(e) => setTaxCardExpiry(e.target.value)} />
          </Field>
          <Field label="رقم السجل التجاري *">
            <Input value={cr} onChange={(e) => setCr(e.target.value)} placeholder="CR-12345" />
          </Field>
          <Field label="تاريخ انتهاء السجل التجاري *">
            <Input type="date" value={crExpiry} onChange={(e) => setCrExpiry(e.target.value)} />
          </Field>
          <Field label="البنك التابع له *">
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITIES.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="الحالة">
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "suspended")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="suspended">موقوف</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-6 shadow-card border-0 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> الملاك والمساهمون (25% فأكثر)</h3>
          <div className="text-xs text-muted-foreground tabular-nums">إجمالي: {ownerTotal}%</div>
        </div>
        <div className="space-y-3">
          {owners.map((o, i) => (
            <div key={i} className="grid grid-cols-[1fr_140px_auto] gap-3">
              <Input value={o.name} onChange={(e) => updateOwner(i, { name: e.target.value })} placeholder="اسم المالك / المساهم" />
              <div className="relative">
                <Input type="number" min={25} max={100} value={o.percent} onChange={(e) => updateOwner(i, { percent: Number(e.target.value) })} className="pl-8" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setOwners(owners.filter((_, idx) => idx !== i))} disabled={owners.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setOwners([...owners, { name: "", percent: 25 }])}>
          <Plus className="h-4 w-4 ml-1" /> إضافة مالك
        </Button>
      </Card>

      <Card className="p-6 shadow-card border-0 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4" /> الشركات المرتبطة</h3>
        <div className="space-y-3">
          {companies.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_220px_auto] gap-3">
              <Input value={c.name} onChange={(e) => updateCompany(i, { name: e.target.value })} placeholder="اسم الشركة" />
              <Select value={c.sector} onValueChange={(v) => updateCompany(i, { sector: v })}>
                <SelectTrigger><SelectValue placeholder="القطاع" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setCompanies(companies.filter((_, idx) => idx !== i))} disabled={companies.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setCompanies([...companies, { name: "", sector: COMPANY_SECTORS[0] }])}>
          <Plus className="h-4 w-4 ml-1" /> إضافة شركة
        </Button>
      </Card>

      {errors.length > 0 && (
        <Card className="p-4 border-destructive/30 border bg-destructive/5 text-destructive text-sm">
          <div className="font-semibold mb-1">يرجى استكمال الحقول التالية:</div>
          <ul className="list-disc pr-5 space-y-0.5">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => nav({ to: "/merchants" })}>
          <X className="h-4 w-4 ml-1" /> إلغاء
        </Button>
        <Button onClick={submit} disabled={errors.length > 0}>
          <Save className="h-4 w-4 ml-1" /> {mode === "create" ? "حفظ التاجر" : "حفظ التعديلات"}
        </Button>
      </div>
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