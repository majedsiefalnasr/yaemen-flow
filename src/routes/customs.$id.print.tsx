import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import {
  Printer, ArrowRight, FileSignature, FileText, Download,
  ZoomIn, ZoomOut, ShieldCheck, AlertTriangle, CheckCircle2, Lock, Stamp,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth, canIssueCustoms, displayStatusFor, DEMO_USERS } from "@/lib/mock";
import { requestsCell, logAudit, notify } from "@/lib/governance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customs/$id/print")({ component: CustomsPrint });

function CustomsPrint() {
  const { id } = useParams({ from: "/customs/$id/print" });
  const { user } = useAuth();
  const nav = useNavigate();
  const reqs = requestsCell.use();
  const req = reqs.find((r) => r.id === id);
  const [zoom, setZoom] = useState(0.85);
  const [issuing, setIssuing] = useState(false);

  if (!user) return null;

  if (!req) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Card className="p-8 border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h2 className="font-bold text-lg mb-1">الطلب غير موجود</h2>
          <p className="text-sm text-muted-foreground mb-4">رقم الطلب {id} غير معروف.</p>
          <Button asChild variant="outline">
            <Link to="/customs"><ArrowRight className="h-4 w-4 ml-1" /> العودة لطابور الجمارك</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const issued = !!req.customsNo;
  const canIssueNow = canIssueCustoms(req, user);
  const canView = canIssueNow || issued || user.role === "platform_admin" || user.role === "executive_member";

  if (!canView) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <Card className="p-8 border-warning/30 bg-warning/5">
          <Lock className="h-10 w-10 text-warning mx-auto mb-3" />
          <h2 className="font-bold text-lg mb-1">غير مصرح بمعاينة البيان</h2>
          <p className="text-sm text-muted-foreground mb-4">
            معاينة وإصدار إذن بيان جمركي متاحة لأعضاء اللجنة التنفيذية أو إدارة المنصة فقط.
          </p>
          <Button asChild variant="outline">
            <Link to="/requests/$id" params={{ id: req.id }}>
              <ArrowRight className="h-4 w-4 ml-1" /> العودة للطلب
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Stage gating message — explain why issuance is blocked even if user has the role
  const stageBlocked = !issued && !canIssueNow;
  const stageStatus = displayStatusFor(req.stage, user.role);

  function performIssue() {
    if (!req || !user) return;
    setIssuing(true);
    const customsNo = `CD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const customsAt = new Date().toISOString();
    requestsCell.set((prev) =>
      prev.map((r) =>
        r.id === req.id
          ? {
              ...r,
              customsNo,
              customsAt,
              customsBy: user.id,
              stage: "completed" as const,
              progress: 100,
              lastUpdatedBy: user.id,
            }
          : r,
      ),
    );
    logAudit({
      userId: user.id, userName: user.name, role: user.role,
      action: "إصدار إذن بيان جمركي وإتمام الطلب",
      ref: req.ref,
      fromStage: "executive_approved",
      toStage: "completed",
      notes: `رقم البيان: ${customsNo}`,
    });
    notify({
      title: `${req.ref}: صدر إذن إصدار بيان جمركي — اكتمل الطلب`,
      body: `رقم البيان ${customsNo} — بواسطة ${user.name}`,
      audience: "all",
      href: `/customs/${req.id}/print`,
    });
    toast.success(`تم إصدار البيان رقم ${customsNo} بنجاح`);
    setIssuing(false);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden in print */}
      <div className="print:hidden">
        <Card className="p-4 shadow-card border-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                {issued ? "إذن إصدار بيان جمركي" : "معاينة إذن إصدار بيان جمركي"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                طلب {req.ref} — {req.importer}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" asChild>
                <Link to="/requests/$id" params={{ id: req.id }}>
                  <ArrowRight className="h-4 w-4 ml-1" /> العودة للطلب
                </Link>
              </Button>
              {issued ? (
                <Button onClick={() => window.print()}>
                  <Printer className="h-4 w-4 ml-1" /> طباعة / تنزيل PDF
                </Button>
              ) : canIssueNow ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={issuing} className="bg-accent hover:bg-accent/90">
                      <FileSignature className="h-4 w-4 ml-1" /> إصدار البيان رسمياً
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Stamp className="h-5 w-5 text-accent" /> تأكيد إصدار إذن بيان جمركي
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2 text-start">
                        <span className="block">
                          سيتم توقيع وإصدار إذن بيان جمركي للطلب <span className="font-mono font-semibold">{req.ref}</span> بشكل نهائي ولن يمكن التراجع.
                        </span>
                        <span className="block text-xs bg-warning/10 text-warning-foreground border border-warning/30 rounded p-2">
                          سيتم إكمال دورة الطلب وإغلاقها فور الإصدار.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={performIssue} className="bg-accent hover:bg-accent/90">
                        <FileSignature className="h-4 w-4 ml-1" /> تأكيد الإصدار
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>

          {/* Status banner */}
          {issued ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-success">تم إصدار البيان بنجاح</div>
                <div className="text-xs text-muted-foreground">
                  رقم البيان <span className="font-mono font-semibold">{req.customsNo}</span>
                  {" · "}
                  بواسطة {DEMO_USERS.find((u) => u.id === req.customsBy)?.name ?? user.name}
                  {" · "}
                  {new Date(req.customsAt!).toLocaleString("ar-EG")}
                </div>
              </div>
            </div>
          ) : stageBlocked ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-semibold">لا يمكن إصدار البيان حالياً</div>
                <div className="text-xs text-muted-foreground">
                  الطلب في مرحلة <span className="font-medium">{stageStatus.label}</span>. يجب اعتماد التصويت التنفيذي أولاً قبل إصدار إذن بيان جمركي.
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-info/30 bg-info/5 p-3">
              <ShieldCheck className="h-5 w-5 text-info shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-semibold">جاهز للإصدار</div>
                <div className="text-xs text-muted-foreground">
                  راجع المعاينة أدناه ثم اضغط "إصدار البيان رسمياً" لتوقيع وإغلاق الطلب نهائياً.
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* PDF-viewer-style frame */}
      <div className="print:hidden rounded-xl overflow-hidden shadow-card border bg-[oklch(0.22_0.02_260)]">
        <div className="flex items-center justify-between px-4 py-2 bg-[oklch(0.18_0.02_260)] text-white text-xs">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-400" />
            <span className="font-mono">{req.customsNo ?? `DRAFT-${req.ref}`}.pdf</span>
            {issued && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-success/20 text-success text-[10px]">
                <ShieldCheck className="h-3 w-3" /> موقّع إلكترونياً
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="tabular-nums w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <span className="mx-2 h-4 w-px bg-white/20" />
            <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/10" onClick={() => window.print()}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="overflow-auto max-h-[80vh] py-6 px-2 grid place-items-start justify-center bg-[oklch(0.25_0.02_260)]">
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
            <PrintablePage req={req} watermark={!issued} />
          </div>
        </div>
      </div>

      {/* Hidden print-only copy at exact A4 size */}
      <div className="hidden print:block">
        <PrintablePage req={req} watermark={false} />
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          aside, header, footer, nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}

function PrintablePage({ req, watermark }: { req: any; watermark: boolean }) {
  const issued = !!req.customsNo;
  return (
    <div
      dir="rtl"
      className={cn("bg-white text-black mx-auto shadow-md print:shadow-none print:m-0 relative")}
      style={{ width: "210mm", minHeight: "297mm", padding: "20mm" }}
    >
      {watermark && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none print:hidden">
          <div className="text-[140px] font-black text-gray-200/70 -rotate-12 select-none tracking-widest">مسودة</div>
        </div>
      )}

      <header className="flex items-start justify-between border-b-2 border-black pb-4 relative">
        <div>
          <div className="text-xs">الجمهورية اليمنية</div>
          <div className="text-lg font-bold">البنك المركزي اليمني</div>
          <div className="text-xs">إدارة تنظيم وتمويل الواردات</div>
        </div>
        <div className="text-center">
          <div className="text-base font-bold">إذن إصدار بيان جمركي</div>
          <div className="text-xs">Customs Declaration Permit</div>
          {issued && (
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] border border-success text-success rounded px-2 py-0.5">
              <ShieldCheck className="h-3 w-3" /> موقّع إلكترونياً
            </div>
          )}
        </div>
        <div className="text-left text-xs">
          <div>رقم البيان: <span className="font-bold">{req.customsNo ?? "—"}</span></div>
          <div>التاريخ: {req.customsAt ? new Date(req.customsAt).toLocaleDateString("ar-EG") : "—"}</div>
          <div>المرجع: {req.ref}</div>
        </div>
      </header>

      <section className="mt-6 relative">
        <h2 className="font-bold text-sm mb-2 bg-black text-white px-2 py-1">بيانات المستورد والجهة الممولة</h2>
        <table className="w-full text-xs border-collapse">
          <tbody>
            <tr>
              <td className="border p-2 bg-gray-100 w-1/4">المستورد</td>
              <td className="border p-2 w-1/4">{req.importer}</td>
              <td className="border p-2 bg-gray-100 w-1/4">البنك / الجهة</td>
              <td className="border p-2 w-1/4">{req.bank}</td>
            </tr>
            <tr>
              <td className="border p-2 bg-gray-100">المبلغ</td>
              <td className="border p-2">{req.amount.toLocaleString("en-US")} {req.currency}</td>
              <td className="border p-2 bg-gray-100">رقم الفاتورة</td>
              <td className="border p-2">{req.invoice}</td>
            </tr>
            <tr>
              <td className="border p-2 bg-gray-100">المورد</td>
              <td className="border p-2">{req.supplier}</td>
              <td className="border p-2 bg-gray-100">ميناء الوصول</td>
              <td className="border p-2">{req.port}</td>
            </tr>
            <tr>
              <td className="border p-2 bg-gray-100">نوع البضاعة</td>
              <td className="border p-2" colSpan={3}>{req.type}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-6 relative">
        <h2 className="font-bold text-sm mb-2 bg-black text-white px-2 py-1">دورة الاعتماد</h2>
        <table className="w-full text-xs border-collapse">
          <tbody>
            <tr>
              <td className="border p-2 bg-gray-100 w-1/4">اعتماد المساندة</td>
              <td className="border p-2">تم</td>
              <td className="border p-2 bg-gray-100 w-1/4">رقم السويفت</td>
              <td className="border p-2">{req.swiftFile?.name ?? "—"}</td>
            </tr>
            <tr>
              <td className="border p-2 bg-gray-100">اعتماد التصويت التنفيذي</td>
              <td className="border p-2">تم</td>
              <td className="border p-2 bg-gray-100">تاريخ الإصدار</td>
              <td className="border p-2">{req.customsAt ? new Date(req.customsAt).toLocaleString("ar-EG") : "—"}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-10 grid grid-cols-3 gap-6 relative">
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-12 text-xs">توقيع عضو اللجنة التنفيذية</div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-12 text-xs">الختم الرسمي</div>
        </div>
        <div className="text-center">
          <div className="border-t border-black pt-2 mt-12 text-xs">تأشيرة الجمارك</div>
        </div>
      </section>

      <footer className="mt-12 text-[10px] text-gray-600 border-t pt-2 text-center relative">
        هذه الوثيقة صادرة إلكترونياً من منصة إدارة الواردات — البنك المركزي اليمني. للتحقق من الصحة، يرجى مراجعة سجل المنصة باستخدام رقم البيان.
      </footer>
    </div>
  );
}
