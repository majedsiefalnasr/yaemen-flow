import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter, Download, FilePlus2, AlertTriangle, Lock, Vote } from "lucide-react";
import { DEMO_USERS } from "@/lib/mock";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENTITIES, useAuth, visibleRequestsFor, bucketsFor, displayStatusFor, progressForRole } from "@/lib/mock";
import { requestsCell } from "@/lib/governance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/requests/")({ component: RequestsList });

// Roles that are scoped to a single bank — they must only ever
// see requests from their own entity, with no bank-filter UI.
const ENTITY_SCOPED_ROLES = ["bank_admin", "bank_intake", "bank_reviewer", "bank_swift"] as const;
// CBY-side roles that cannot create new financing requests.
const CBY_ROLES = ["platform_admin", "support_member", "executive_member", "committee_manager"] as const;
// الأدوار التي يحق لها إنشاء طلب تمويل (مدخل البنك ومسؤول البنك فقط).
const CAN_CREATE_ROLES = ["bank_intake", "bank_admin"] as const;

const RISK_COLORS = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/15 text-warning",
  high: "bg-destructive/10 text-destructive",
};
const RISK_LABELS = { low: "منخفضة", medium: "متوسطة", high: "عالية" };

function RequestsList() {
  const { user } = useAuth();
  const isEntityScoped = !!user && (ENTITY_SCOPED_ROLES as readonly string[]).includes(user.role);
  const isCby = !!user && (CBY_ROLES as readonly string[]).includes(user.role);
  const canCreate = !!user && (CAN_CREATE_ROLES as readonly string[]).includes(user.role);
  void isCby;

  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [bankFilter, setBankFilter] = useState<string>("all");

  const ALL_REQUESTS = requestsCell.use();
  // Single source of truth for role-scoped visibility (ownership + workflow stage).
  const scoped = visibleRequestsFor(user, ALL_REQUESTS);

  // Role-aware display buckets — users see business-friendly statuses,
  // not raw internal workflow stages.
  const buckets = user ? bucketsFor(user.role) : [];
  const inBucket = (stage: string, key: string) =>
    buckets.find(b => b.key === key)?.stages.includes(stage as any) ?? false;

  const data = scoped.filter(r =>
    (filter === "all" || inBucket(r.stage, filter)) &&
    (isEntityScoped || bankFilter === "all" || r.entityId === bankFilter) &&
    (!q || r.ref.includes(q) || r.importer.includes(q) || r.invoice.includes(q))
  );

  return (
    <div>
      <PageHeader
        title="طلبات تمويل الواردات"
        subtitle={isEntityScoped ? "طلبات جهتك فقط" : "جميع الطلبات المقدمة عبر المنصة مع حالاتها ومراحل المعالجة"}
        breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "الطلبات" }]}
        actions={
          <>
            <Button variant="outline"><Download className="h-4 w-4 ml-1" /> تصدير</Button>
            {canCreate && (
              <Button asChild><Link to="/requests/new"><FilePlus2 className="h-4 w-4 ml-1" /> طلب جديد</Link></Button>
            )}
          </>
        }
      />

      {/* Stage tabs */}
      <Card className="p-2 mb-4 shadow-card border-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {(() => {
            const visibleBuckets = buckets.filter(b =>
              scoped.some(r => b.stages.includes(r.stage))
            );
            const tabs = [{ key: "all", label: "الكل" }, ...visibleBuckets.map(b => ({ key: b.key, label: b.label }))];
            return tabs.map(t => {
              const count = t.key === "all"
                ? scoped.length
                : scoped.filter(r => inBucket(r.stage, t.key)).length;
              const active = filter === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {t.label}
                  <span className={cn(
                    "px-1.5 rounded-full text-[10px] tabular-nums",
                    active ? "bg-white/20" : "bg-muted",
                  )}>{count}</span>
                </button>
              );
            });
          })()}
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4 mb-4 shadow-card border-0">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الطلب، التاجر، أو رقم الفاتورة..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pr-10"
            />
          </div>
          {!isEntityScoped && (
            <Select value={bankFilter} onValueChange={setBankFilter}>
              <SelectTrigger className="w-56"><SelectValue placeholder="البنك" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع البنوك</SelectItem>
                {ENTITIES.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select defaultValue="all">
            <SelectTrigger className="w-32"><SelectValue placeholder="العملة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع العملات</SelectItem>
              <SelectItem value="usd">USD</SelectItem>
              <SelectItem value="eur">EUR</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Filter className="h-4 w-4 ml-1" /> فلاتر متقدمة</Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="shadow-card border-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px] table-fixed">
            <colgroup>
              <col className="w-[160px]" />
              <col className="w-[200px]" />
              <col className="w-[110px]" />
              <col className="w-[130px]" />
              <col className="w-[90px]" />
              <col className="w-[140px]" />
              <col className="w-[120px]" />
              <col className="w-[90px]" />
            </colgroup>
            <thead className="bg-muted/50">
              <tr className="text-right text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">المرجع</th>
                <th className="px-4 py-3 font-medium">المستورد / البنك</th>
                <th className="px-4 py-3 font-medium">النوع</th>
                <th className="px-4 py-3 font-medium">المبلغ</th>
                <th className="px-4 py-3 font-medium">المخاطر</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">التقدم</th>
                <th className="px-4 py-3 font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to="/requests/$id" params={{ id: r.id }} className="font-mono text-xs font-semibold text-accent hover:underline">{r.ref}</Link>
                      {r.duplicate && (
                        <Badge variant="destructive" className="gap-1 text-[10px] py-0 px-1.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> مكرر
                        </Badge>
                      )}
                      {r.stage === "executive_voting" && (user?.role === "executive_member" || user?.role === "committee_manager") && (
                        <Badge className="gap-1 text-[10px] py-0 px-1.5 bg-chart-5/15 text-chart-5 animate-pulse">
                          <Vote className="h-2.5 w-2.5" /> باب التصويت مفتوح
                        </Badge>
                      )}
                      {r.supportClaimedBy && user?.role === "support_member" && (
                        <Badge className="gap-1 text-[10px] py-0 px-1.5 bg-warning/15 text-warning">
                          <Lock className="h-2.5 w-2.5" />
                          {r.supportClaimedBy === user.id ? "محجوز لك" : `محجوز: ${DEMO_USERS.find(u => u.id === r.supportClaimedBy)?.avatar ?? "—"}`}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.invoice}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium truncate">{r.importer}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.bank}</div>
                  </td>
                  <td className="px-4 py-3 text-xs align-top truncate">{r.type}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums align-top whitespace-nowrap">
                    {r.amount.toLocaleString("en-US")}
                    <span className="text-xs text-muted-foreground mr-1">{r.currency}</span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Badge className={cn("font-normal", RISK_COLORS[r.risk])}>{RISK_LABELS[r.risk]}</Badge>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {(() => {
                      const ds = user ? displayStatusFor(r.stage, user.role) : { label: r.stage, color: "" };
                      return <Badge className={cn("font-normal whitespace-nowrap", ds.color)}>{ds.label}</Badge>;
                    })()}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {(() => {
                      const p = user ? progressForRole(r.stage, user.role) : r.progress;
                      return (<>
                        <Progress value={p} className="h-1.5" />
                        <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">{p}%</div>
                      </>);
                    })()}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/requests/$id" params={{ id: r.id }}>عرض</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div>عرض {data.length} من {scoped.length} طلب</div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7">السابق</Button>
            <Button variant="secondary" size="sm" className="h-7 w-7 p-0">1</Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">2</Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">3</Button>
            <Button variant="ghost" size="sm" className="h-7">التالي</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
