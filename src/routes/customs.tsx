import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageCheck, FileSignature, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth, visibleRequestsFor, displayStatusFor } from "@/lib/mock";
import { requestsCell } from "@/lib/governance";
import { cn } from "@/lib/utils";

import { RoleGuard } from "@/components/workflow/RoleGuard";

export const Route = createFileRoute("/customs")({
  component: () => (
    <RoleGuard allow={["committee_manager"]}>
      <Customs />
    </RoleGuard>
  ),
});

function Customs() {
  const { user } = useAuth();
  const REQUESTS = requestsCell.use();
  const scoped = visibleRequestsFor(user, REQUESTS);
  const ready = scoped.filter((r) => r.stage === "executive_approved");
  const issued = scoped.filter((r) => r.stage === "customs_released" || r.stage === "completed");

  return (
    <div>
      <PageHeader
        title="إصدار إذن إصدار بيان جمركي"
        subtitle="إصدار وطباعة البيانات الجمركية للطلبات المعتمدة من اللجنة التنفيذية"
        breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "إذن إصدار بيان جمركي" }]}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 shadow-card border-0">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-success" />
            طلبات جاهزة للإصدار ({ready.length})
          </h3>
          <div className="space-y-3">
            {ready.length === 0 && <div className="text-sm text-muted-foreground">لا توجد طلبات جاهزة حالياً.</div>}
            {ready.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border hover:border-success/40 transition-colors">
                <div className="h-11 w-11 rounded-lg bg-success/10 text-success grid place-items-center">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-semibold">{r.ref}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.importer} · {r.port}</div>
                </div>
                <Button size="sm" asChild>
                  <Link to="/customs/$id/print" params={{ id: r.id }}>
                    <FileSignature className="h-3.5 w-3.5 ml-1" /> إصدار البيان
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 shadow-card border-0">
          <h3 className="font-semibold mb-4">بيانات صادرة مؤخراً ({issued.length})</h3>
          <div className="space-y-3">
            {issued.length === 0 && <div className="text-sm text-muted-foreground">لم تُصدَر أي بيانات بعد.</div>}
            {issued.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-semibold">{r.customsNo ?? r.ref}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.importer}</div>
                </div>
                {(() => { const ds = displayStatusFor(r.stage, user!.role); return (
                  <Badge className={cn("text-[10px]", ds.color)}>{ds.label}</Badge>
                ); })()}
                <Button size="sm" variant="outline" asChild>
                  <Link to="/customs/$id/print" params={{ id: r.id }}>عرض/طباعة</Link>
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
