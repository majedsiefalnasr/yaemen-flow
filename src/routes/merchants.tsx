import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Edit, Trash2, Building2, Eye, Users, Briefcase } from "lucide-react";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth, ENTITIES, type Merchant, type Role } from "@/lib/mock";
import { merchantsCell, logAudit } from "@/lib/governance";
import { toast } from "sonner";
import { RoleGuard } from "@/components/workflow/RoleGuard";

// Roles allowed to manage merchants per spec.
const MERCHANT_MANAGE_ROLES: Role[] = ["bank_intake", "bank_reviewer", "bank_admin"];

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

function formatDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("ar-EG"); } catch { return d; }
}

function Merchants() {
  const { user } = useAuth();
  const merchants = merchantsCell.use();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [viewing, setViewing] = useState<Merchant | null>(null);

  const isPlatform = user?.role === "platform_admin";
  const canManage = !!user && MERCHANT_MANAGE_ROLES.includes(user.role);

  const scoped = useMemo(
    () => (!isPlatform && user?.entityId ? merchants.filter((m) => m.entityId === user.entityId) : merchants),
    [merchants, isPlatform, user?.entityId],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return scoped.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!s) return true;
      return (
        m.name.toLowerCase().includes(s) ||
        m.cr.toLowerCase().includes(s) ||
        m.tax.toLowerCase().includes(s)
      );
    });
  }, [scoped, q, statusFilter]);

  const stats = useMemo(() => ({
    total: scoped.length,
    active: scoped.filter((m) => m.status === "active").length,
    suspended: scoped.filter((m) => m.status === "suspended").length,
  }), [scoped]);

  return (
    <div>
      <PageHeader
        title="إدارة التجار"
        subtitle="تسجيل ومتابعة التجار والمستوردين مع شركاتهم المرتبطة"
        breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "التجار" }]}
        actions={
          canManage && (
            <Button asChild>
              <Link to="/merchants/new"><Plus className="h-4 w-4 ml-1" /> تاجر جديد</Link>
            </Button>
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
            placeholder="بحث بالرقم الضريبي، السجل التجاري، أو الاسم..."
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "suspended")}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشط فقط</SelectItem>
            <SelectItem value="suspended">موقوف فقط</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <Card key={m.id} className="p-5 shadow-card border-0 hover:shadow-soft transition-shadow flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-hero text-white grid place-items-center">
                <Building2 className="h-6 w-6" />
              </div>
              <Badge className={m.status === "active" ? "bg-success/15 text-success border-0" : "bg-destructive/15 text-destructive border-0"}>
                {m.status === "active" ? "نشط" : "موقوف"}
              </Badge>
            </div>
            <div className="font-semibold text-base">{m.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">الرقم الضريبي: {m.tax}</div>
            <div className="mt-4 space-y-1.5 text-xs">
              <Row k="السجل التجاري" v={m.cr} />
              <Row k="انتهاء البطاقة الضريبية" v={formatDate(m.taxCardExpiry)} />
              <Row k="انتهاء السجل التجاري" v={formatDate(m.crExpiry)} />
              <Row k="البنك" v={entityName(m.entityId)} />
              <div className="flex items-center gap-1.5 pt-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">الملاك:</span>
                <span className="font-medium tabular-nums">{m.owners?.length ?? 0}</span>
                <Briefcase className="h-3 w-3 text-muted-foreground mr-2" />
                <span className="text-muted-foreground">الشركات:</span>
                <span className="font-medium tabular-nums">{m.companies?.length ?? 0}</span>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t flex items-center justify-between">
              <div className="text-xs">
                <span className="text-muted-foreground">المعاملات: </span>
                <span className="font-bold tabular-nums">{m.transactions}</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewing(m)} aria-label="عرض التفاصيل">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {canManage && (
                  <>
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                      <Link to="/merchants/$id/edit" params={{ id: m.id }} aria-label="تعديل">
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-8 px-2"
                      onClick={() => merchantsCell.set((prev) => prev.map((x) => x.id === m.id ? { ...x, status: x.status === "active" ? "suspended" : "active" } : x))}
                    >
                      {m.status === "active" ? "إيقاف" : "تفعيل"}
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (!confirm(`حذف التاجر "${m.name}"؟`)) return;
                        merchantsCell.set((prev) => prev.filter((x) => x.id !== m.id));
                        logAudit({ userId: user!.id, userName: user!.name, role: user!.role, action: "حذف تاجر", ref: m.cr, notes: m.name });
                        toast.success("تم حذف التاجر");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-8 col-span-full text-center text-sm text-muted-foreground border-0 shadow-card">
            لا توجد نتائج مطابقة.
          </Card>
        )}
      </div>

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        {viewing && (
          <DialogContent dir="rtl" className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> {viewing.name}
              </DialogTitle>
              <DialogDescription>تفاصيل التاجر — عرض فقط</DialogDescription>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-3 py-2 text-sm">
              <DetailRow k="الرقم الضريبي" v={viewing.tax} />
              <DetailRow k="رقم السجل التجاري" v={viewing.cr} />
              <DetailRow k="انتهاء البطاقة الضريبية" v={formatDate(viewing.taxCardExpiry)} />
              <DetailRow k="انتهاء السجل التجاري" v={formatDate(viewing.crExpiry)} />
              <DetailRow k="الحالة" v={viewing.status === "active" ? "نشط" : "موقوف"} />
              <DetailRow k="البنك التابع له" v={entityName(viewing.entityId)} />
              <DetailRow k="عدد المعاملات" v={String(viewing.transactions)} />
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="font-semibold mb-2 flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> الملاك والمساهمون (25% فأكثر)</div>
              {(viewing.owners ?? []).length === 0 ? (
                <div className="text-xs text-muted-foreground">لا يوجد</div>
              ) : (
                <ul className="text-sm space-y-1">
                  {viewing.owners!.map((o, i) => (
                    <li key={i} className="flex justify-between border-b pb-1">
                      <span>{o.name}</span><span className="tabular-nums font-medium">{o.percent}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="font-semibold mb-2 flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4" /> الشركات المرتبطة</div>
              {(viewing.companies ?? []).length === 0 ? (
                <div className="text-xs text-muted-foreground">لا يوجد</div>
              ) : (
                <ul className="text-sm space-y-1">
                  {viewing.companies!.map((c, i) => (
                    <li key={i} className="flex justify-between border-b pb-1">
                      <span>{c.name}</span><span className="text-muted-foreground">{c.sector}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="font-medium text-end truncate">{v}</span>
    </div>
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