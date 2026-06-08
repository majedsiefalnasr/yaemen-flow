import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import {
  FileText, CheckCircle2, XCircle, Clock, TrendingUp, ArrowUpRight,
  AlertTriangle, ShieldCheck, FilePlus2, Inbox, RefreshCw, Send,
  Vote, Upload, ListChecks, Stamp, FileSearch, Users as UsersIcon,
  Building2, BarChart3, Bell,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useAuth, MONTHLY, CATEGORY_DIST, ROLE_LABELS, visibleRequestsFor,
  displayStatusFor, progressForRole, type ImportRequest, type Role, type User,
} from "@/lib/mock";
import { requestsCell } from "@/lib/governance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Dashboard });

const CHART_COLORS = ["oklch(0.28 0.09 255)", "oklch(0.65 0.14 195)", "oklch(0.7 0.15 75)", "oklch(0.6 0.18 25)", "oklch(0.55 0.15 290)", "oklch(0.5 0.1 160)"];

// ---------- shared building blocks ----------

type Kpi = { label: string; value: number | string; icon: any; tone: string; href?: string };

function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className={cn("grid gap-4 grid-cols-2", kpis.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {kpis.map((k) => {
        const Body = (
          <Card className="p-5 shadow-card border-0 hover:shadow-md transition-shadow h-full">
            <div className={cn("h-10 w-10 rounded-xl grid place-items-center", k.tone)}>
              <k.icon className="h-5 w-5" />
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold tracking-tight">
                {typeof k.value === "number" ? k.value.toLocaleString("en-US") : k.value}
              </div>
              <div className="text-sm text-muted-foreground">{k.label}</div>
            </div>
          </Card>
        );
        return k.href ? <Link key={k.label} to={k.href}>{Body}</Link> : <div key={k.label}>{Body}</div>;
      })}
    </div>
  );
}

type Action = { label: string; icon: any; href: string; tone?: string; primary?: boolean; description?: string };

function QuickActions({ actions }: { actions: Action[] }) {
  return (
    <Card className="p-5 shadow-card border-0">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><ListChecks className="h-4 w-4" /> إجراءات سريعة</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.label} to={a.href}>
            <div className={cn(
              "p-4 rounded-lg border transition-all hover:border-accent/60 hover:shadow-sm h-full",
              a.primary && "border-accent/40 bg-accent/5",
            )}>
              <div className="flex items-start gap-3">
                <div className={cn("h-9 w-9 rounded-lg grid place-items-center shrink-0", a.tone ?? "bg-primary/10 text-primary")}>
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{a.label}</div>
                  {a.description && <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function RecentRequests({
  rows, role, title = "أحدث الطلبات", emptyText = "لا توجد طلبات بعد.",
}: { rows: ImportRequest[]; role: Role; title?: string; emptyText?: string }) {
  return (
    <Card className="p-5 shadow-card border-0 min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        <Link to="/requests" className="text-xs text-accent hover:underline flex items-center gap-1">
          عرض الكل <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Inbox className="h-8 w-8 mx-auto opacity-50 mb-2" /> {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px] table-fixed">
            <colgroup>
              <col className="w-[150px]" />
              <col className="w-[160px]" />
              <col className="w-[120px]" />
              <col className="w-[160px]" />
              <col className="w-[110px]" />
              <col className="w-[90px]" />
            </colgroup>
            <thead>
              <tr className="text-right text-xs text-muted-foreground border-b">
                <th className="py-2.5 font-medium">المرجع</th>
                <th className="py-2.5 font-medium">المستورد</th>
                <th className="py-2.5 font-medium">المبلغ</th>
                <th className="py-2.5 font-medium">الحالة</th>
                <th className="py-2.5 font-medium">التقدم</th>
                <th className="py-2.5 font-medium text-left sticky left-0 bg-card z-10 shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12)]">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ds = displayStatusFor(r.stage, role);
                const votingOpen = r.stage === "executive_voting" && (role === "executive_member" || role === "committee_manager");
                return (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-3 align-top">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link to="/requests/$id" params={{ id: r.id }} className="font-mono text-xs text-accent hover:underline">{r.ref}</Link>
                        {votingOpen && (
                          <Badge className="gap-1 text-[10px] py-0 px-1.5 bg-chart-5/15 text-chart-5 animate-pulse">
                            <Vote className="h-2.5 w-2.5" /> تصويت مفتوح
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 truncate align-top">{r.importer}</td>
                    <td className="py-3 font-semibold tabular-nums align-top whitespace-nowrap">
                      {r.amount.toLocaleString("en-US")} <span className="text-xs text-muted-foreground">{r.currency}</span>
                    </td>
                    <td className="py-3 align-top whitespace-nowrap"><Badge className={cn("font-normal whitespace-nowrap", ds.color)}>{ds.label}</Badge></td>
                    <td className="py-3 align-top">
                      {(() => { const p = progressForRole(r.stage, role); return (
                        <>
                          <Progress value={p} className="h-1.5" />
                          <div className="text-[10px] text-muted-foreground mt-1">{p}%</div>
                        </>
                      ); })()}
                    </td>
                    <td className="py-3 text-left align-top sticky left-0 bg-card z-10 shadow-[6px_0_8px_-6px_rgba(0,0,0,0.12)]">
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link to="/requests/$id" params={{ id: r.id }}>عرض</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ---------- helpers ----------

function countStages(list: ImportRequest[], stages: string[]) {
  return list.filter((r) => stages.includes(r.stage)).length;
}

// ---------- Main ----------

function Dashboard() {
  const { user } = useAuth();
  const ALL = requestsCell.use();
  const scoped = useMemo(
    () => (user ? visibleRequestsFor(user, ALL) : []),
    [user, ALL],
  );
  if (!user) return null;

  const greeting = (
    <PageHeader
      title={`أهلاً، ${user.name.split(" ")[0]} 👋`}
      subtitle={`لوحة ${ROLE_LABELS[user.role]}`}
      actions={dashboardHeaderActions(user.role)}
    />
  );

  return (
    <div className="space-y-6">
      {greeting}
      {renderRoleDashboard(user, scoped)}
    </div>
  );
}

function dashboardHeaderActions(role: Role) {
  if (role === "bank_intake" || role === "bank_admin") {
    return (
      <Button asChild>
        <Link to="/requests/new"><FilePlus2 className="h-4 w-4 ml-1" /> طلب جديد</Link>
      </Button>
    );
  }
  return null;
}

function renderRoleDashboard(user: User, scoped: ImportRequest[]) {
  switch (user.role) {
    case "platform_admin": return <PlatformAdminDashboard scoped={scoped} />;
    case "bank_admin": return <BankAdminDashboard scoped={scoped} />;
    case "bank_intake": return <IntakeDashboard scoped={scoped} userId={user.id} />;
    case "bank_reviewer": return <ReviewerDashboard scoped={scoped} />;
    case "bank_swift": return <SwiftDashboard scoped={scoped} />;
    case "support_member": return <SupportDashboard scoped={scoped} userId={user.id} />;
    case "executive_member":
    case "committee_manager":
      return <ExecutiveDashboard scoped={scoped} />;
    default: return null;
  }
}

// ---------- Role dashboards ----------

function IntakeDashboard({ scoped, userId }: { scoped: ImportRequest[]; userId: string }) {
  const drafts = countStages(scoped, ["draft"]);
  const returned = countStages(scoped, ["support_returned"]);
  const inProcess = countStages(scoped, [
    "bank_submitted", "bank_internal_review", "bank_approved", "support_review",
    "support_approved", "swift_attached", "executive_voting", "executive_approved",
  ]);
  const completed = countStages(scoped, ["customs_released", "completed"]);

  const kpis: Kpi[] = [
    { label: "مسودات لم تُقدَّم", value: drafts, icon: FileText, tone: "text-muted-foreground bg-muted" },
    { label: "بحاجة لتعديل", value: returned, icon: RefreshCw, tone: "text-warning bg-warning/10" },
    { label: "قيد المعالجة", value: inProcess, icon: Clock, tone: "text-info bg-info/10" },
    { label: "مكتمل / صدر البيان", value: completed, icon: CheckCircle2, tone: "text-success bg-success/10" },
  ];

  const actions: Action[] = [
    { label: "إنشاء طلب جديد", description: "ابدأ طلب تمويل جديد", icon: FilePlus2, href: "/requests/new", primary: true, tone: "bg-accent/10 text-accent" },
    { label: "متابعة طلباتي", description: "كل ما قمت بإنشائه", icon: FileSearch, href: "/requests", tone: "bg-primary/10 text-primary" },
    { label: "الإشعارات", description: "آخر التحديثات على طلباتك", icon: Bell, href: "/notifications", tone: "bg-info/10 text-info" },
  ];

  const returnedRows = scoped.filter((r) => r.stage === "support_returned").slice(0, 5);
  const myDrafts = scoped.filter((r) => r.stage === "draft").slice(0, 5);

  return (
    <>
      <KpiGrid kpis={kpis} />
      <QuickActions actions={actions} />

      {returned > 0 && (
        <Card className="p-5 shadow-card border-0 border-r-4 border-r-warning">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-semibold">طلبات تتطلب تعديلاً منك ({returned})</h3>
          </div>
          <div className="space-y-2">
            {returnedRows.map((r) => (
              <Link key={r.id} to="/requests/$id" params={{ id: r.id }}
                className="flex items-center justify-between p-3 rounded-lg border hover:border-warning/50 hover:bg-warning/5">
                <div>
                  <div className="font-mono text-xs text-accent">{r.ref}</div>
                  <div className="text-sm">{r.importer}</div>
                </div>
                <div className="text-xs text-muted-foreground">{r.amount.toLocaleString("en-US")} {r.currency}</div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2 min-w-0">
        <div className="min-w-0"><RecentRequests rows={myDrafts} role="bank_intake" title="مسوداتي" emptyText="لا توجد مسودات حالياً." /></div>
        <div className="min-w-0"><RecentRequests rows={scoped.slice(0, 5)} role="bank_intake" title="آخر نشاطي" /></div>
      </div>
    </>
  );
}

function ReviewerDashboard({ scoped }: { scoped: ImportRequest[] }) {
  const pendingReview = countStages(scoped, ["bank_submitted", "bank_internal_review"]);
  const cbyReview = countStages(scoped, ["bank_approved", "support_review"]);
  const returned = countStages(scoped, ["support_returned"]);
  const approved = countStages(scoped, ["executive_approved", "customs_released", "completed"]);

  const kpis: Kpi[] = [
    { label: "بانتظار مراجعتي", value: pendingReview, icon: Inbox, tone: "text-warning bg-warning/10", href: "/requests" },
    { label: "قيد اللجنة الوطنية لتنظيم وتمويل الواردات", value: cbyReview, icon: Clock, tone: "text-info bg-info/10" },
    { label: "مُعاد للتعديل", value: returned, icon: RefreshCw, tone: "text-destructive bg-destructive/10" },
    { label: "مُعتمد / مكتمل", value: approved, icon: CheckCircle2, tone: "text-success bg-success/10" },
  ];

  const actions: Action[] = [
    { label: "طابور المراجعة", description: `${pendingReview} طلب بانتظارك`, icon: ListChecks, href: "/requests", primary: true, tone: "bg-warning/10 text-warning" },
    { label: "كل الطلبات", description: "نطاق بنكي كامل", icon: FileSearch, href: "/requests", tone: "bg-primary/10 text-primary" },
  ];

  const queue = scoped.filter((r) => ["bank_submitted", "bank_internal_review"].includes(r.stage)).slice(0, 6);
  return (
    <>
      <KpiGrid kpis={kpis} />
      <QuickActions actions={actions} />
      <RecentRequests rows={queue} role="bank_reviewer" title="طابور المراجعة الحالي" emptyText="لا توجد طلبات بانتظار مراجعتك." />
    </>
  );
}

function SwiftDashboard({ scoped }: { scoped: ImportRequest[] }) {
  const pendingSwift = countStages(scoped, ["support_approved"]);
  const uploaded = countStages(scoped, ["swift_attached", "executive_voting"]);
  const finalApproved = countStages(scoped, ["executive_approved", "customs_released", "completed"]);
  const rejected = countStages(scoped, ["executive_rejected"]);

  const kpis: Kpi[] = [
    { label: "بانتظار رفع السويفت", value: pendingSwift, icon: Upload, tone: "text-warning bg-warning/10", href: "/requests" },
    { label: "تم رفع السويفت", value: uploaded, icon: Send, tone: "text-info bg-info/10" },
    { label: "مُعتمد نهائياً", value: finalApproved, icon: CheckCircle2, tone: "text-success bg-success/10" },
    { label: "مرفوض نهائياً", value: rejected, icon: XCircle, tone: "text-destructive bg-destructive/10" },
  ];

  const actions: Action[] = [
    { label: "طابور رفع السويفت", description: `${pendingSwift} طلب بانتظار رفع MT103`, icon: Upload, href: "/requests", primary: true, tone: "bg-accent/10 text-accent" },
  ];

  const queue = scoped.filter((r) => r.stage === "support_approved").slice(0, 6);
  return (
    <>
      <KpiGrid kpis={kpis} />
      <QuickActions actions={actions} />
      <RecentRequests rows={queue} role="bank_swift" title="طابور رفع السويفت" emptyText="لا توجد طلبات بانتظار السويفت." />
    </>
  );
}

function SupportDashboard({ scoped, userId }: { scoped: ImportRequest[]; userId: string }) {
  const pending = scoped.filter((r) => r.stage === "bank_approved").length;
  const mine = scoped.filter((r) => r.stage === "support_review" && r.supportClaimedBy === userId).length;
  const claimedByOthers = scoped.filter((r) => r.stage === "support_review" && r.supportClaimedBy && r.supportClaimedBy !== userId).length;
  const approved = countStages(scoped, ["support_approved"]);
  const returned = countStages(scoped, ["support_returned"]);

  const kpis: Kpi[] = [
    { label: "بانتظار المطالبة", value: pending, icon: Inbox, tone: "text-warning bg-warning/10" },
    { label: "أعمل عليها الآن", value: mine, icon: ShieldCheck, tone: "text-accent bg-accent/10" },
    { label: "محجوزة لأعضاء آخرين", value: claimedByOthers, icon: UsersIcon, tone: "text-muted-foreground bg-muted" },
    { label: "اعتمدتُها مؤخراً", value: approved, icon: CheckCircle2, tone: "text-success bg-success/10" },
  ];

  const actions: Action[] = [
    { label: "طابور المساندة", description: `${pending} طلب جاهز للمراجعة`, icon: ListChecks, href: "/requests", primary: true, tone: "bg-warning/10 text-warning" },
    { label: "التقارير والإحصاءات", icon: BarChart3, href: "/reports", tone: "bg-primary/10 text-primary" },
  ];

  const queue = scoped.filter((r) => r.stage === "bank_approved" || (r.stage === "support_review" && r.supportClaimedBy === userId)).slice(0, 6);
  return (
    <>
      <KpiGrid kpis={kpis} />
      <QuickActions actions={actions} />
      <RecentRequests rows={queue} role="support_member" title="طابور عملي" emptyText="لا توجد طلبات حالياً." />
    </>
  );
}

function ExecutiveDashboard({ scoped }: { scoped: ImportRequest[] }) {
  const voting = countStages(scoped, ["swift_attached", "executive_voting"]);
  const approved = countStages(scoped, ["executive_approved", "customs_released", "completed"]);
  const rejected = countStages(scoped, ["executive_rejected"]);

  const kpis: Kpi[] = [
    { label: "طابور التصويت", value: voting, icon: Vote, tone: "text-chart-5 bg-chart-5/10", href: "/requests" },
    { label: "قرارات اعتماد", value: approved, icon: CheckCircle2, tone: "text-success bg-success/10" },
    { label: "قرارات رفض", value: rejected, icon: XCircle, tone: "text-destructive bg-destructive/10" },
  ];

  const actions: Action[] = [
    { label: "طابور التصويت", description: `${voting} طلب بانتظار التصويت`, icon: Vote, href: "/requests", primary: true, tone: "bg-chart-5/10 text-chart-5" },
    { label: "التقارير", icon: BarChart3, href: "/reports", tone: "bg-primary/10 text-primary" },
  ];

  const queue = scoped.filter((r) => ["swift_attached", "executive_voting"].includes(r.stage)).slice(0, 6);
  return (
    <>
      <KpiGrid kpis={kpis} />
      <QuickActions actions={actions} />
      <RecentRequests rows={queue} role="executive_member" title="طلبات بانتظار تصويتك" emptyText="لا توجد طلبات للتصويت." />
    </>
  );
}

function BankAdminDashboard({ scoped }: { scoped: ImportRequest[] }) {
  const total = scoped.length;
  const pendingInternal = countStages(scoped, ["bank_submitted", "bank_internal_review"]);
  const atCBY = countStages(scoped, ["bank_approved", "support_review", "support_approved", "swift_attached", "executive_voting"]);
  const approved = countStages(scoped, ["executive_approved", "customs_released", "completed"]);
  const rejected = countStages(scoped, ["support_rejected", "executive_rejected"]);
  const returned = countStages(scoped, ["support_returned"]);

  const kpis: Kpi[] = [
    { label: "إجمالي طلبات البنك", value: total, icon: FileText, tone: "text-primary bg-primary/10" },
    { label: "مراجعة داخلية معلّقة", value: pendingInternal, icon: Clock, tone: "text-warning bg-warning/10" },
    { label: "قيد اللجنة الوطنية لتنظيم وتمويل الواردات", value: atCBY, icon: Send, tone: "text-info bg-info/10" },
    { label: "مُعتمد", value: approved, icon: CheckCircle2, tone: "text-success bg-success/10" },
  ];

  const actions: Action[] = [
    { label: "طلب جديد", icon: FilePlus2, href: "/requests/new", tone: "bg-accent/10 text-accent", primary: true },
    { label: "إدارة التجار", icon: Building2, href: "/merchants", tone: "bg-info/10 text-info" },
    { label: "مستخدمو البنك", icon: UsersIcon, href: "/bank/users", tone: "bg-primary/10 text-primary" },
    { label: "التقارير", icon: BarChart3, href: "/reports", tone: "bg-chart-5/10 text-chart-5" },
  ];

  return (
    <>
      <KpiGrid kpis={kpis} />
      <QuickActions actions={actions} />

      <Card className="p-5 shadow-card border-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">حركة طلبات البنك الشهرية</h3>
            <p className="text-xs text-muted-foreground">المُقدَّم مقابل المُعتمد</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={MONTHLY}>
            <defs>
              <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.28 0.09 255)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.28 0.09 255)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" />
            <XAxis dataKey="m" stroke="oklch(0.5 0.03 250)" fontSize={12} />
            <YAxis stroke="oklch(0.5 0.03 250)" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Area type="monotone" dataKey="طلبات" stroke="oklch(0.28 0.09 255)" fill="url(#bg1)" strokeWidth={2} />
            <Area type="monotone" dataKey="مُعتمد" stroke="oklch(0.65 0.14 195)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <RecentRequests rows={scoped.slice(0, 6)} role="bank_admin" />
    </>
  );
}

function PlatformAdminDashboard({ scoped }: { scoped: ImportRequest[] }) {
  const APPROVED_STAGES = ["executive_approved", "customs_released", "completed"];
  const REJECTED_STAGES = ["support_rejected", "executive_rejected"];
  const PENDING_STAGES = [
    "draft", "bank_submitted", "bank_internal_review", "bank_approved",
    "support_review", "support_returned", "support_approved",
    "swift_attached", "executive_voting",
  ];

  const kpis: Kpi[] = [
    { label: "إجمالي الطلبات", value: scoped.length, icon: FileText, tone: "text-primary bg-primary/10" },
    { label: "طلبات معتمدة", value: countStages(scoped, APPROVED_STAGES), icon: CheckCircle2, tone: "text-success bg-success/10" },
    { label: "قيد المعالجة", value: countStages(scoped, PENDING_STAGES), icon: Clock, tone: "text-warning bg-warning/10" },
    { label: "طلبات مرفوضة", value: countStages(scoped, REJECTED_STAGES), icon: XCircle, tone: "text-destructive bg-destructive/10" },
  ];

  const actions: Action[] = [
    { label: "سجل التدقيق", icon: FileSearch, href: "/audit", tone: "bg-info/10 text-info", primary: true },
    { label: "التقارير", icon: BarChart3, href: "/reports", tone: "bg-chart-5/10 text-chart-5" },
    { label: "مستخدمي النظام", icon: UsersIcon, href: "/admin/cby-staff", tone: "bg-primary/10 text-primary" },
    { label: "إدارة الجهات", icon: Building2, href: "/admin/entities", tone: "bg-warning/10 text-warning" },
    { label: "الإشعارات", icon: Bell, href: "/notifications", tone: "bg-muted text-muted-foreground" },
  ];

  return (
    <>
      <KpiGrid kpis={kpis} />
      <QuickActions actions={actions} />

      <div className="grid gap-4 lg:grid-cols-3 min-w-0">
        <Card className="p-5 lg:col-span-2 shadow-card border-0 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">حركة الطلبات الشهرية</h3>
              <p className="text-xs text-muted-foreground">المُقدَّم مقابل المُعتمد</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={MONTHLY}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.28 0.09 255)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.28 0.09 255)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.14 195)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.65 0.14 195)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" />
              <XAxis dataKey="m" stroke="oklch(0.5 0.03 250)" fontSize={12} />
              <YAxis stroke="oklch(0.5 0.03 250)" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Area type="monotone" dataKey="طلبات" stroke="oklch(0.28 0.09 255)" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="مُعتمد" stroke="oklch(0.65 0.14 195)" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-card border-0 min-w-0">
          <h3 className="font-semibold mb-1">توزيع فئات الواردات</h3>
          <p className="text-xs text-muted-foreground mb-4">حسب نوع البضاعة</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={CATEGORY_DIST} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {CATEGORY_DIST.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {CATEGORY_DIST.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  {c.name}
                </div>
                <span className="font-semibold">{c.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 min-w-0">
        <div className="lg:col-span-2 min-w-0">
          <RecentRequests rows={scoped.slice(0, 6)} role="platform_admin" />
        </div>
        <Card className="p-5 shadow-card border-0 min-w-0">
          <h3 className="font-semibold mb-4">تنبيهات الامتثال</h3>
          <div className="space-y-3">
            {[
              { icon: AlertTriangle, tone: "text-destructive bg-destructive/10", title: "فاتورة مكررة", body: "INV-2024028 على طلبين", time: "منذ 12 د" },
              { icon: ShieldCheck, tone: "text-warning bg-warning/10", title: "طلب عالي المخاطر", body: "IMP-2025-1031 يستلزم مراجعة", time: "منذ 45 د" },
              { icon: CheckCircle2, tone: "text-success bg-success/10", title: "اعتماد دفعة طلبات", body: "12 طلب اعتُمدت اليوم", time: "اليوم 10:15" },
            ].map((a, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border hover:border-accent/40 transition-colors">
                <div className={cn("h-9 w-9 rounded-lg grid place-items-center shrink-0", a.tone)}>
                  <a.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 shadow-card border-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">أنشط البنوك التجارية</h3>
            <p className="text-xs text-muted-foreground">عدد الطلبات هذا الربع</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={[
            { bank: "اليمني للإنشاء", requests: 184, value: 12.4 },
            { bank: "التضامن", requests: 156, value: 9.8 },
            { bank: "سبأ الإسلامي", requests: 142, value: 8.6 },
            { bank: "اليمن والكويت", requests: 128, value: 7.2 },
            { bank: "القاسمي", requests: 98, value: 5.4 },
            { bank: "الأمل للتمويل", requests: 76, value: 3.8 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" />
            <XAxis dataKey="bank" stroke="oklch(0.5 0.03 250)" fontSize={11} />
            <YAxis stroke="oklch(0.5 0.03 250)" fontSize={11} />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="requests" name="عدد الطلبات" fill="oklch(0.28 0.09 255)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="value" name="القيمة (مليون $)" fill="oklch(0.65 0.14 195)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}
