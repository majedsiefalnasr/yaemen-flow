import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, canAttachSwift, displayStatusFor } from "@/lib/mock";
import { requestsCell } from "@/lib/governance";
import { SwiftUploadForm } from "@/components/workflow/SwiftUploadForm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/requests/$id/swift")({ component: SwiftUpload });

function SwiftUpload() {
  const { id } = useParams({ from: "/requests/$id/swift" });
  const { user } = useAuth();
  const requests = requestsCell.use();
  const req = requests.find((r) => r.id === id);

  if (!req || !user) return null;

  const allowed = canAttachSwift(req, user) || req.stage === "swift_attached";

  if (!allowed) {
    return (
      <Card className="p-8 text-center shadow-card border-0">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
        <h2 className="mt-4 font-bold text-lg">غير مصرح</h2>
        <p className="text-sm text-muted-foreground mt-1">
          لا تملك صلاحية رفع السويفت لهذا الطلب، أو الطلب ليس في مرحلة "اعتماد المساندة".
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/requests/$id" params={{ id: req.id }}>
            العودة للطلب
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="إرفاق وثيقة السويفت"
        subtitle={`الطلب ${req.ref} · بيانات الطلب مقفلة — يُسمح فقط برفع وثيقة السويفت`}
        breadcrumbs={[
          { label: "الرئيسية", to: "/" },
          { label: "الطلبات", to: "/requests" },
          { label: req.ref, to: "/requests/$id" },
          { label: "السويفت" },
        ]}
        actions={(() => {
          const ds = displayStatusFor(req.stage, user!.role);
          return <Badge className={cn("text-sm py-1.5 px-3", ds.color)}>{ds.label}</Badge>;
        })()}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 shadow-card border-0">
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            البيانات أدناه للاطلاع فقط ولا يمكن تعديلها في هذه المرحلة
          </div>
          <fieldset disabled className="space-y-4 opacity-90">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                ["المستورد", req.importer],
                ["البنك", req.bank],
                ["المبلغ", `${req.amount.toLocaleString("en-US")} ${req.currency}`],
                ["نوع البضاعة", req.type],
                ["المورد", req.supplier],
                ["رقم الفاتورة", req.invoice],
                ["الميناء", req.port],
              ].map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{k}</Label>
                  <Input value={v} readOnly className="bg-muted/40" />
                </div>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 pt-6 border-t space-y-4">
            <h3 className="font-semibold flex items-center gap-2">رفع وثيقة السويفت</h3>
            <SwiftUploadForm requestId={req.id} mode="page" />
          </div>
        </Card>
      </div>
    </div>
  );
}
