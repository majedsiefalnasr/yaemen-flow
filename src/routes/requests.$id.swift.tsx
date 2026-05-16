import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Lock, Upload, ShieldCheck, FileText, ArrowRight, Send, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, canAttachSwift, displayStatusFor } from "@/lib/mock";
import { requestsCell, transitionRequest, logAudit } from "@/lib/governance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/requests/$id/swift")({ component: SwiftUpload });

function SwiftUpload() {
  const { id } = useParams({ from: "/requests/$id/swift" });
  const { user } = useAuth();
  const nav = useNavigate();
  const requests = requestsCell.use();
  const req = requests.find((r) => r.id === id);
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!req || !user) return null;

  const allowed = canAttachSwift(req, user) || req.stage === "swift_attached";
  const hasSwift = !!req.swiftFile;
  const canSend = hasSwift && req.stage === "swift_attached";

  if (!allowed) {
    return (
      <Card className="p-8 text-center shadow-card border-0">
        <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
        <h2 className="mt-4 font-bold text-lg">غير مصرح</h2>
        <p className="text-sm text-muted-foreground mt-1">
          لا تملك صلاحية رفع السويفت لهذا الطلب، أو الطلب ليس في مرحلة "اعتماد المساندة".
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/requests/$id" params={{ id: req.id }}>العودة للطلب</Link>
        </Button>
      </Card>
    );
  }

  function attachSwift() {
    const swiftFile = file
      ? {
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user!.id,
        }
      : {
          name: `SWIFT_${req!.ref}_${Date.now()}.pdf`,
          size: 184320,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user!.id,
        };
    requestsCell.set((prev) =>
      prev.map((r) => (r.id === req!.id ? { ...r, swiftFile, stage: "executive_voting" as const } : r)),
    );
    logAudit({
      userId: user!.id,
      userName: user!.name,
      role: user!.role,
      action: "إرفاق وثيقة السويفت وإرسال للتصويت التنفيذي",
      ref: req!.ref,
      fromStage: req!.stage,
      toStage: "executive_voting",
      notes: reference ? `مرجع: ${reference}` : undefined,
    });
    toast.success("تم إرفاق السويفت وإرسال الطلب للجنة التنفيذية للتصويت.");
    nav({ to: "/requests/$id", params: { id: req!.id } });
  }

  function sendToVoting() {
    transitionRequest(
      req!,
      "executive_voting",
      { id: user!.id, name: user!.name, role: user!.role },
      "إرسال الطلب للتصويت التنفيذي بعد إرفاق السويفت",
    );
    toast.success("تم إرسال الطلب للجنة التنفيذية للتصويت.");
    nav({ to: "/requests/$id", params: { id: req!.id } });
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
        actions={(() => { const ds = displayStatusFor(req.stage, user!.role); return (
          <Badge className={cn("text-sm py-1.5 px-3", ds.color)}>{ds.label}</Badge>
        ); })()}
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
            <h3 className="font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4 text-accent" /> رفع وثيقة السويفت
            </h3>

            {hasSwift ? (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold text-success">تم إرفاق وثيقة السويفت</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {req.swiftFile!.name} · {(req.swiftFile!.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>رقم مرجع السويفت (MT103/MT202)</Label>
                  <Input placeholder="مثل: 25CBY2025XX" value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="swift-file-input">ملف السويفت (PDF, حد أقصى 10MB)</Label>
                  <label
                    htmlFor="swift-file-input"
                    className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-colors text-center"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {file ? "تغيير الملف" : "اضغط هنا لاختيار ملف PDF"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB` : "الحد الأقصى 10MB"}
                    </span>
                  </label>
                  <input
                    id="swift-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  {file && (
                    <div className="flex items-center gap-2 text-xs text-success">
                      <FileText className="h-4 w-4" /> تم اختيار: {file.name}
                    </div>
                  )}
                </div>

                <Button onClick={attachSwift} className="w-full" size="lg">
                  <Upload className="h-4 w-4 ml-2" />
                  إرفاق وثيقة السويفت
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  اختيار الملف اختياري — سيتم اعتبار الوثيقة مرفقة عند الضغط.
                </p>
              </>
            )}

            {canSend && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm text-muted-foreground">
                  بعد التأكد من صحة وثيقة السويفت، اضغط "إرسال" لتحويل الطلب إلى مرحلة <b>تصويت اللجنة التنفيذية</b>.
                </p>
                <Button onClick={sendToVoting} className="w-full" size="lg">
                  <Send className="h-4 w-4 ml-2" /> إرسال الطلب للتصويت التنفيذي
                  <ArrowRight className="h-4 w-4 mr-2" />
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 shadow-card border-0 h-fit">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> ضوابط هذه المرحلة
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed list-disc pr-4">
            <li>لا يُسمح بتعديل أي بيانات سابقة للطلب.</li>
            <li>الإجراء متاح فقط لموظفي السويفت أو مسؤول البنك ضمن نفس الجهة.</li>
            <li>يجب الضغط على "إرسال" بعد الإرفاق لتحويل الطلب للجنة التنفيذية.</li>
            <li>سيُسجَّل كل إجراء في سجل التدقيق غير القابل للتعديل.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
