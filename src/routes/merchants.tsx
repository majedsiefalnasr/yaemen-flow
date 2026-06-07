import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Edit, Trash2, Building2, Eye, Users, X } from "lucide-react";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth, ENTITIES, type Merchant } from "@/lib/mock";
import { merchantsCell, logAudit } from "@/lib/governance";
import { toast } from "sonner";
import { RoleGuard } from "@/components/workflow/RoleGuard";

const CATEGORIES = ["مواد غذائية", "أدوية ومستلزمات طبية", "مشتقات نفطية", "قطع غيار", "مواد بناء", "إلكترونيات"];

export const Route = createFileRoute("/merchants")({
  component: () => (
    <RoleGuard allow={["platform_admin", "bank_admin", "bank_intake", "bank_reviewer"]}>
      <Merchants />
    </RoleGuard>
  ),
});

function entityName(id?: string) {
  return ENTITIES.find((e) => e.id === id)?.name ?? "—";
}

function Merchants() {
  const { user } = useAuth();
  const merchants = merchantsCell.use();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Merchant | null>(null);
  const [viewing, setViewing] = useState<Merchant | null>(null);

  const isPlatform = user?.role === "platform_admin";
  // مدخل البيانات / المراجع الداخلي / مدير البنك: لهم صلاحية الإنشاء والتعديل.
  const canManage = !!user && ["bank_admin", "bank_intake", "bank_reviewer"].includes(user.role);

  // Bank users see only their own bank's merchants
  const scoped = useMemo(
    () => (user?.entityId ? merchants.filter((m) => m.entityId === user.entityId) : merchants),
    [merchants, user?.entityId],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return scoped.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (isPlatform && bankFilter !== "all" && m.entityId !== bankFilter) return false;
      if (!s) return true;
      return (
        (m.traderName ?? "").toLowerCase().includes(s) ||
        m.cr.toLowerCase().includes(s) ||
        m.tax.toLowerCase().includes(s) ||
        entityName(m.entityId).toLowerCase().includes(s)
      );
    });
  }, [scoped, q, statusFilter, bankFilter, isPlatform]);

  const stats = useMemo(() => ({
    total: scoped.length,
    active: scoped.filter((m) => m.status === "active").length,
    suspended: scoped.filter((m) => m.status === "suspended").length,
  }), [scoped]);

  function saveNew(m: Merchant) {
    // الرقم الضريبي مفتاح رئيسي — تحقق عدم التكرار
    if (merchants.some((x) => x.tax === m.tax)) {
      toast.error(`الرقم الضريبي ${m.tax} مُسجَّل لتاجر آخر.`);
      return false;
    }
    merchantsCell.set((prev) => [m, ...prev]);
    logAudit({
      userId: user!.id, userName: user!.name, role: user!.role,
      action: "إضافة تاجر جديد", ref: m.cr, notes: m.traderName ?? m.name,
    });
    toast.success(`تم تسجيل التاجر "${m.traderName ?? m.name}"`);
    return true;
  }

  function saveEdit(original: Merchant, m: Merchant) {
    if (merchants.some((x) => x.id !== original.id && x.tax === m.tax)) {
      toast.error(`الرقم الضريبي ${m.tax} مُستخدم في تاجر آخر.`);
      return false;
    }
    merchantsCell.set((prev) =>
      prev.map((x) => (x.id === original.id ? { ...m, id: original.id, transactions: original.transactions } : x)),
    );
    logAudit({ userId: user!.id, userName: user!.name, role: user!.role, action: "تعديل بيانات تاجر", ref: m.cr, notes: m.traderName ?? m.name });
    toast.success("تم تحديث بيانات التاجر");
    return true;
  }

  return (
    <div>
      <PageHeader
        title="إدارة التجار"
        subtitle={isPlatform
          ? "عرض جميع التجار المسجّلين على المنصّة مع البنوك التابعة لها"
          : "تسجيل ومتابعة التجار والمستوردين المرتبطين بالبنك"}
        breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "التجار" }]}
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-1" /> تاجر جديد
                </Button>
              </DialogTrigger>
              <MerchantDialog
                title="تسجيل تاجر جديد"
                defaultEntityId={user?.entityId ?? undefined}
                onSave={(m) => {
                  if (saveNew(m)) setOpen(false);
                }}
              />
            </Dialog>
          )
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard label="إجمالي" value={stats.total} tone="bg-primary/10 text-primary" />
        <StatCard label="نشط" value={stats.active} tone="bg-success/10 text-success" />
        <StatCard label="موقوف" value={stats.suspended} tone="bg-destructive/10 text-destructive" />
      </div>

      <Card className="p-4 mb-4 shadow-card border-0 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-10"
            placeholder="بحث بالاسم، التاجر، الرقم الضريبي، السجل، أو البنك..."
          />
        </div>
        {isPlatform && (
          <Select value={bankFilter} onValueChange={setBankFilter}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="البنك" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل البنوك</SelectItem>
              {ENTITIES.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشط فقط</SelectItem>
            <SelectItem value="suspended">موقوف فقط</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="shadow-card border-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr className="text-right">
                <th className="p-3 font-semibold">التاجر</th>
                <th className="p-3 font-semibold">الرقم الضريبي</th>
                <th className="p-3 font-semibold">السجل التجاري</th>
                <th className="p-3 font-semibold">القطاع</th>
                <th className="p-3 font-semibold">الشركات المرتبطة</th>
                {isPlatform && <th className="p-3 font-semibold">البنك</th>}
                <th className="p-3 font-semibold">الحالة</th>
                <th className="p-3 font-semibold tabular-nums">المعاملات</th>
                <th className="p-3 font-semibold w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{m.traderName ?? m.name}</td>
                  <td className="p-3 text-muted-foreground tabular-nums">{m.tax}</td>
                  <td className="p-3 text-muted-foreground">{m.cr}</td>
                  <td className="p-3 text-muted-foreground">{m.category}</td>
                  <td className="p-3 text-muted-foreground tabular-nums">{m.companies?.length ?? 0}</td>
                  {isPlatform && (
                    <td className="p-3">
                      <Badge variant="outline" className="font-normal">
                        <Building2 className="h-3 w-3 ml-1" />
                        {entityName(m.entityId)}
                      </Badge>
                    </td>
                  )}
                  <td className="p-3">
                    <Badge className={m.status === "active" ? "bg-success/15 text-success border-0" : "bg-destructive/15 text-destructive border-0"}>
                      {m.status === "active" ? "نشط" : "موقوف"}
                    </Badge>
                  </td>
                  <td className="p-3 tabular-nums font-semibold">{m.transactions}</td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(m)} aria-label="عرض">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(m)} aria-label="تعديل">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => {
                              if (!confirm(`حذف التاجر "${m.traderName ?? m.name}"؟`)) return;
                              merchantsCell.set((prev) => prev.filter((x) => x.id !== m.id));
                              logAudit({ userId: user!.id, userName: user!.name, role: user!.role, action: "حذف تاجر", ref: m.cr, notes: m.traderName ?? m.name });
                              toast.success("تم حذف التاجر");
                            }}
                            aria-label="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={isPlatform ? 9 : 8} className="p-8 text-center text-muted-foreground">لا توجد نتائج مطابقة.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        {editing && (
          <MerchantDialog
            title="تعديل بيانات التاجر"
            initial={editing}
            defaultEntityId={user?.entityId ?? undefined}
            onSave={(m) => {
              if (saveEdit(editing, m)) setEditing(null);
            }}
          />
        )}
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        {viewing && (
          <DialogContent dir="rtl" className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> {viewing.traderName ?? viewing.name}
              </DialogTitle>
              <DialogDescription>تفاصيل التاجر — عرض فقط</DialogDescription>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3 py-2 text-sm">
              <DetailRow k="اسم التاجر" v={viewing.traderName ?? "—"} />
              <DetailRow k="الرقم الضريبي" v={viewing.tax} />
              <DetailRow k="انتهاء البطاقة الضريبية" v={viewing.taxExpiry ?? "—"} />
              <DetailRow k="السجل التجاري" v={viewing.cr} />
              <DetailRow k="انتهاء السجل التجاري" v={viewing.crExpiry ?? "—"} />
              <DetailRow k="القطاع" v={viewing.category} />
              <DetailRow k="الحالة" v={viewing.status === "active" ? "نشط" : "موقوف"} />
              <DetailRow k="البنك" v={entityName(viewing.entityId)} />
              <DetailRow k="عدد المعاملات" v={String(viewing.transactions)} />
              <div className="sm:col-span-2"><DetailRow k="العنوان" v={viewing.address} /></div>
              <div className="sm:col-span-2"><DetailRow k="هاتف التواصل" v={viewing.contact} /></div>
            </div>

            {(viewing.companies?.length ?? 0) > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> الشركات المرتبطة</div>
                <div className="rounded-lg border divide-y">
                  {viewing.companies!.map((c) => (
                    <div key={c.id} className="p-2.5 text-sm">
                      <span className="font-medium">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(viewing.shareholders?.length ?? 0) > 0 && (
              <div className="pt-2">
                <div className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> الملاك والمساهمون (≥ 25%)</div>
                <div className="rounded-lg border divide-y">
                  {viewing.shareholders!.map((s) => (
                    <div key={s.id} className="p-2.5 text-sm flex justify-between gap-2">
                      <span className="font-medium">{s.name}</span>
                      <Badge variant="outline" className="font-mono">{s.percent}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-4 shadow-card border-0">
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${tone}`}>
        <Building2 className="h-4 w-4" />
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function DetailRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="font-medium">{v}</div>
    </div>
  );
}

type Company = { id: string; name: string };
type Shareholder = { id: string; name: string; percent: number };

function MerchantDialog({ title, initial, defaultEntityId, onSave }: { title: string; initial?: Merchant; defaultEntityId?: string; onSave: (m: Merchant) => void }) {
  const [traderName, setTraderName] = useState(initial?.traderName ?? "");
  const [tax, setTax] = useState(initial?.tax ?? "");
  const [taxExpiry, setTaxExpiry] = useState(initial?.taxExpiry ?? "");
  const [cr, setCr] = useState(initial?.cr ?? "");
  const [crExpiry, setCrExpiry] = useState(initial?.crExpiry ?? "");
  const [address, setAddress] = useState(initial?.address === "—" ? "" : initial?.address ?? "");
  const [contact, setContact] = useState(initial?.contact === "—" ? "" : initial?.contact ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [status, setStatus] = useState<"active" | "suspended">(initial?.status ?? "active");
  const [entityId, setEntityId] = useState<string>(initial?.entityId ?? defaultEntityId ?? ENTITIES[0].id);
  const [companies, setCompanies] = useState<Company[]>(
    (initial?.companies ?? []).map((c) => ({ id: c.id, name: c.name })),
  );
  const [shareholders, setShareholders] = useState<Shareholder[]>(initial?.shareholders ?? []);

  const totalShares = shareholders.reduce((s, x) => s + (Number.isFinite(x.percent) ? x.percent : 0), 0);
  const sharesValid = shareholders.every((s) => s.name.trim() && s.percent >= 25 && s.percent <= 100);

  const valid =
    traderName.trim() && tax.trim() && taxExpiry && cr.trim() && crExpiry && entityId &&
    (shareholders.length === 0 || (sharesValid && totalShares <= 100));

  function submit() {
    if (!valid) return;
    onSave({
      id: initial?.id ?? `m_${Date.now()}`,
      name: traderName.trim(),
      traderName: traderName.trim(),
      tax: tax.trim(),
      taxExpiry,
      cr: cr.trim(),
      crExpiry,
      companies,
      shareholders,
      address: address.trim() || "—",
      contact: contact.trim() || "—",
      category, status, entityId,
      transactions: initial?.transactions ?? 0,
    });
  }

  return (
    <DialogContent dir="rtl" className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>الحقول المعلّمة بـ * إلزامية. الرقم الضريبي مفتاح رئيسي ولا يجوز تكراره.</DialogDescription>
      </DialogHeader>

      <div className="grid sm:grid-cols-2 gap-3 py-2">
        <Field label="اسم التاجر *">
          <Input value={traderName} onChange={(e) => setTraderName(e.target.value)} placeholder="الاسم الكامل" />
        </Field>
        <Field label="الرقم الضريبي *">
          <Input
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            placeholder="4123456"
            disabled={!!initial}
            inputMode="numeric"
          />
        </Field>
        <Field label="انتهاء البطاقة الضريبية *">
          <Input type="date" value={taxExpiry} onChange={(e) => setTaxExpiry(e.target.value)} />
        </Field>
        <Field label="رقم السجل التجاري *">
          <Input value={cr} onChange={(e) => setCr(e.target.value)} placeholder="CR-12345" />
        </Field>
        <Field label="انتهاء السجل التجاري *">
          <Input type="date" value={crExpiry} onChange={(e) => setCrExpiry(e.target.value)} />
        </Field>
        <Field label="هاتف التواصل">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+9677…" />
        </Field>
        <Field label="القطاع / النشاط">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
        <Field label="البنك التابع له *">
          <Select value={entityId} onValueChange={setEntityId} disabled={!!defaultEntityId && !initial}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTITIES.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="العنوان">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="المدينة – الشارع" />
          </Field>
        </div>
      </div>

      {/* Companies */}
      <div className="border rounded-xl p-3 mt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Building2 className="h-4 w-4" /> الشركات المرتبطة بالتاجر
          </div>
          <Button
            type="button" size="sm" variant="outline"
            onClick={() => setCompanies((p) => [...p, { id: `c_${Date.now()}`, name: "" }])}
          >
            <Plus className="h-3.5 w-3.5 ml-1" /> إضافة شركة
          </Button>
        </div>
        {companies.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد شركات مضافة بعد.</p>
        ) : (
          <div className="space-y-2">
            {companies.map((c, i) => (
              <div key={c.id} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                <Input
                  placeholder="اسم الشركة"
                  value={c.name}
                  onChange={(e) => setCompanies((p) => p.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                />
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive"
                  onClick={() => setCompanies((p) => p.filter((_, idx) => idx !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shareholders */}
      <div className="border rounded-xl p-3 mt-2">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm font-semibold flex items-center gap-1.5">
              <Users className="h-4 w-4" /> الملاك والمساهمون (نسبة ≥ 25%)
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              إجمالي النسب: <span className={totalShares > 100 ? "text-destructive font-bold" : "font-bold"}>{totalShares}%</span>
            </div>
          </div>
          <Button
            type="button" size="sm" variant="outline"
            onClick={() => setShareholders((p) => [...p, { id: `sh_${Date.now()}`, name: "", percent: 25 }])}
          >
            <Plus className="h-3.5 w-3.5 ml-1" /> إضافة مالك / مساهم
          </Button>
        </div>
        {shareholders.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد إضافات بعد — أضف الملاك بنسبة 25% فأكثر.</p>
        ) : (
          <div className="space-y-2">
            {shareholders.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                <Input
                  placeholder="اسم المالك / المساهم"
                  value={s.name}
                  onChange={(e) => setShareholders((p) => p.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                />
                <div className="relative">
                  <Input
                    type="number"
                    min={25}
                    max={100}
                    step={1}
                    value={Number.isFinite(s.percent) ? s.percent : ""}
                    onChange={(e) => setShareholders((p) => p.map((x, idx) => idx === i ? { ...x, percent: Number(e.target.value) } : x))}
                    className="pl-7"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-destructive"
                  onClick={() => setShareholders((p) => p.filter((_, idx) => idx !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {totalShares > 100 && (
              <p className="text-xs text-destructive">إجمالي النسب يتجاوز 100%.</p>
            )}
            {!shareholders.every((s) => s.percent >= 25) && (
              <p className="text-xs text-destructive">يجب أن تكون نسبة كل مالك ≥ 25%.</p>
            )}
          </div>
        )}
      </div>

      <DialogFooter className="mt-3">
        <Button onClick={submit} disabled={!valid}>{initial ? "حفظ التعديلات" : "حفظ التاجر"}</Button>
      </DialogFooter>
    </DialogContent>
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
