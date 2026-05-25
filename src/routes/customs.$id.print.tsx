import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import {
  ArrowRight, FileSignature, FileText, Download, Upload,
  ShieldCheck, AlertTriangle, CheckCircle2, Lock, Stamp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth, canIssueCustoms, displayStatusFor, DEMO_USERS, progressFor } from "@/lib/mock";
import { requestsCell, logAudit, notify } from "@/lib/governance";
import { getLocalFile, readFileAsDataUrl, saveLocalFile } from "@/lib/local-files";
import { toast } from "sonner";

const CUSTOMS_TEMPLATE_URL = "/templates/نموذج-تأكيد-مصارفة-خارجية.docx";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const Route = createFileRoute("/customs/$id/print")({ component: CustomsPrint });

function CustomsPrint() {
  const { id } = useParams({ from: "/customs/$id/print" });
  const { user } = useAuth();
  const reqs = requestsCell.use();
  const req = reqs.find((r) => r.id === id);
  const [stampedFile, setStampedFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [storedUrl, setStoredUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const key = req?.customsStampedFile?.storageKey;
      if (!key) {
        if (!cancelled) setStoredUrl(null);
        return;
      }
      try {
        const stored = await getLocalFile(key);
        if (!cancelled) setStoredUrl(stored?.dataUrl ?? null);
      } catch {
        if (!cancelled) setStoredUrl(null);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [req?.customsStampedFile?.storageKey]);

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

  const issued = !!req.customsStampedFile;
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

  function onFileChange(next: File | null) {
    if (!next) { setStampedFile(null); return; }
    const isPdf = next.type === "application/pdf" || next.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("يجب رفع ملف PDF فقط.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (next.size > MAX_FILE_SIZE) {
      toast.error("حجم الملف يتجاوز 10MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setStampedFile(next);
  }

  async function performIssue() {
    if (!req || !user || !stampedFile) {
      toast.error("يجب رفع نسخة تأكيد المصارفة المختومة أولاً.");
      return;
    }
    setIssuing(true);
    try {
      const dataUrl = await readFileAsDataUrl(stampedFile);
      const uploadedAt = new Date().toISOString();
      const storageKey = `customs-stamped:${req.id}`;
      await saveLocalFile({
        id: storageKey,
        name: stampedFile.name,
        type: stampedFile.type || "application/pdf",
        size: stampedFile.size,
        dataUrl,
        storedAt: uploadedAt,
      });
      const customsNo = reference.trim() || `CR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      requestsCell.set((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? {
                ...r,
                customsStampedFile: {
                  name: stampedFile.name,
                  size: stampedFile.size,
                  uploadedAt,
                  uploadedBy: user.id,
                  mime: stampedFile.type || "application/pdf",
                  storageKey,
                },
                customsNo,
                customsAt: uploadedAt,
                customsBy: user.id,
                stage: "customs_released" as const,
                progress: progressFor("customs_released"),
                lastUpdatedBy: user.id,
              }
            : r,
        ),
      );
      logAudit({
        userId: user.id, userName: user.name, role: user.role,
        action: "إصدار تأكيد المصارفة الخارجية المختوم",
        ref: req.ref,
        fromStage: "swift_attached",
        toStage: "customs_released",
        notes: `مرجع: ${customsNo}`,
      });
      notify({
        title: `${req.ref}: صدر تأكيد المصارفة الخارجية`,
        body: `بواسطة ${user.name} — مرجع ${customsNo}`,
        audience: "all",
        href: `/customs/${req.id}/print`,
      });
      setStoredUrl(dataUrl);
      setStampedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("تم إصدار تأكيد المصارفة الخارجية بنجاح.");
    } catch (error) {
      console.error("Failed to upload stamped customs confirmation.", error);
      toast.error("تعذر حفظ الملف. حاول مرة أخرى.");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-card border-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              إصدار تأكيد المصارفة الخارجية
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              طلب {req.ref} — {req.importer}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/requests/$id" params={{ id: req.id }}>
              <ArrowRight className="h-4 w-4 ml-1" /> العودة للطلب
            </Link>
          </Button>
        </div>

        {issued ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-success">صدر تأكيد المصارفة الخارجية بنجاح</div>
              <div className="text-xs text-muted-foreground">
                {req.customsNo && <>المرجع <span className="font-mono font-semibold">{req.customsNo}</span> · </>}
                بواسطة {DEMO_USERS.find((u) => u.id === req.customsBy)?.name ?? user.name}
                {req.customsAt && <> · {new Date(req.customsAt).toLocaleString("ar-EG")}</>}
              </div>
            </div>
          </div>
        ) : stageBlocked ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">لا يمكن إصدار تأكيد المصارفة حالياً</div>
              <div className="text-xs text-muted-foreground">
                الطلب في مرحلة <span className="font-medium">{stageStatus.label}</span>. يجب إرفاق السويفت أولاً.
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-info/30 bg-info/5 p-3">
            <ShieldCheck className="h-5 w-5 text-info shrink-0" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">جاهز للإصدار</div>
              <div className="text-xs text-muted-foreground">
                نزّل النموذج، اطبعه واختمه بختم البنك المركزي، ثم ارفع النسخة الممسوحة ضوئياً.
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 shadow-card border-0 space-y-5">
          <section className="space-y-2">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Download className="h-4 w-4 text-accent" /> 1) تحميل نموذج تأكيد المصارفة الخارجية
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              نموذج بصيغة Word يحتوي على بيانات الطلب الأساسية. حمّله، أكمل ما يلزم، اطبعه واختمه بختم البنك المركزي ووقّعه.
            </p>
            <Button asChild variant="outline" size="sm">
              <a href={CUSTOMS_TEMPLATE_URL} download>
                <Download className="h-4 w-4 ml-1" /> تحميل نموذج تأكيد المصارفة الخارجية
              </a>
            </Button>
          </section>

          <div className="h-px bg-border" />

          <section className="space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Stamp className="h-4 w-4 text-accent" /> 2) رفع النسخة المختومة (PDF)
            </h2>

            {issued && storedUrl ? (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                <div className="text-sm flex-1 min-w-0">
                  <div className="font-semibold text-success">تأكيد المصارفة المختوم</div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {req.customsStampedFile?.name} · {((req.customsStampedFile?.size ?? 0) / 1024).toFixed(1)} KB
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                      <a href={storedUrl} target="_blank" rel="noreferrer">معاينة</a>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                      <a href={storedUrl} download={req.customsStampedFile?.name}>
                        <Download className="h-3.5 w-3.5 ml-1" /> تنزيل
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ) : canIssueNow ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">المرجع الداخلي (اختياري)</Label>
                  <Input
                    placeholder="مثل: CR-2026-1024"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-colors text-center"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {stampedFile ? "تغيير الملف" : "اضغط لاختيار ملف PDF المختوم"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stampedFile
                      ? `${stampedFile.name} · ${(stampedFile.size / 1024).toFixed(1)} KB`
                      : "PDF — الحد الأقصى 10MB"}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={!stampedFile || issuing}
                      className="w-full bg-accent hover:bg-accent/90"
                      size="lg"
                    >
                      <FileSignature className="h-4 w-4 ml-1" />
                      {issuing ? "جارٍ الإصدار..." : "إصدار تأكيد المصارفة الخارجية"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Stamp className="h-5 w-5 text-accent" /> تأكيد الإصدار
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2 text-start">
                        <span className="block">
                          سيتم اعتبار النسخة المرفوعة هي التأكيد الرسمي لطلب{" "}
                          <span className="font-mono font-semibold">{req.ref}</span> ولن يمكن التراجع عن هذا الإجراء.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={performIssue}
                        className="bg-accent hover:bg-accent/90"
                      >
                        <FileSignature className="h-4 w-4 ml-1" /> تأكيد الإصدار
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                لا تملك صلاحية رفع نسخة التأكيد المختومة في هذه المرحلة.
              </p>
            )}
          </section>
        </Card>

        <Card className="p-5 shadow-card border-0 h-fit">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-accent" /> ملخص الطلب
          </h3>
          <dl className="text-xs space-y-2">
            <Row k="المستورد" v={req.importer} />
            <Row k="البنك" v={req.bank} />
            <Row k="المبلغ" v={`${req.amount.toLocaleString("en-US")} ${req.currency}`} />
            <Row k="المورد" v={req.supplier} />
            <Row k="الفاتورة" v={req.invoice} />
            <Row k="الميناء" v={req.port} />
            <Row k="نوع البضاعة" v={req.type} />
            <Row k="السويفت" v={req.swiftFile?.name ?? "—"} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-dashed border-border/60 pb-1.5">
      <dt className="text-muted-foreground shrink-0">{k}</dt>
      <dd className="font-medium text-end truncate">{v}</dd>
    </div>
  );
}
