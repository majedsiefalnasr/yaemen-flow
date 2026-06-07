import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { CheckCircle2, Download, FileSignature, FileText, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth, canIssueCustoms, progressFor } from "@/lib/mock";
import { requestsCell, logAudit, notify } from "@/lib/governance";
import { getLocalFile, readFileAsDataUrl, saveLocalFile } from "@/lib/local-files";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const CUSTOMS_TEMPLATE_URL = "/templates/نموذج-تأكيد-مصارفة-خارجية.docx";

type Props = {
  requestId: string;
  onIssued?: () => void;
};

export function CustomsConfirmForm({ requestId, onIssued }: Props) {
  const { user } = useAuth();
  const requests = requestsCell.use();
  const req = requests.find((r) => r.id === requestId);
  const [stampedFile, setStampedFile] = useState<File | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [storedUrl, setStoredUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const key = req?.customsStampedFile?.storageKey;
      try {
        const stored = key ? await getLocalFile(key) : null;
        if (!cancelled) {
          setStoredUrl(stored?.dataUrl ?? null);
        }
      } catch {
        if (!cancelled) {
          setStoredUrl(null);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [req?.customsStampedFile?.storageKey]);

  if (!req || !user) return null;

  const issued = !!req.customsStampedFile;
  const allowed = canIssueCustoms(req, user);

  if (!allowed && !issued) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        لا تملك صلاحية إصدار تأكيد المصارفة الخارجية لهذا الطلب في هذه المرحلة.
      </p>
    );
  }

  function onFileChange(next: File | null) {
    if (!next) {
      setStampedFile(null);
      return;
    }
    const isPdf =
      next.type === "application/pdf" || next.name.toLowerCase().endsWith(".pdf");
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
      const customsNo = `CR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
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
        userId: user.id,
        userName: user.name,
        role: user.role,
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
        href: `/requests/${req.id}`,
      });
      setStoredUrl(dataUrl);
      setStampedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("تم إصدار تأكيد المصارفة الخارجية بنجاح.");
      onIssued?.();
    } catch (error) {
      console.error("Failed to upload stamped customs confirmation.", error);
      toast.error("تعذر حفظ الملف. حاول مرة أخرى.");
    } finally {
      setIssuing(false);
    }
  }

  if (issued) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
          <div className="text-sm flex-1 min-w-0">
            <div className="font-semibold text-success">تأكيد المصارفة الخارجية المختوم</div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {req.customsStampedFile?.name} ·{" "}
              {((req.customsStampedFile?.size ?? 0) / 1024).toFixed(1)} KB
              {req.customsNo && (
                <>
                  {" · مرجع "}
                  <span className="font-mono font-semibold">{req.customsNo}</span>
                </>
              )}
            </div>
            {storedUrl && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <a href={storedUrl} target="_blank" rel="noreferrer">
                    معاينة
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <a href={storedUrl} download={req.customsStampedFile?.name}>
                    <Download className="h-3.5 w-3.5 ml-1" /> تنزيل
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          تم إصدار التأكيد — اكتمل إجراء اللجنة الوطنية لتنظيم وتمويل الواردات على هذا الطلب.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs space-y-2">
        <div className="font-semibold text-accent flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> وثيقة تأكيد المصارفة الخارجية
        </div>
        <p className="text-muted-foreground leading-relaxed">
          نزّل النموذج، اطبعه واختمه بختم اللجنة الوطنية لتنظيم وتمويل الواردات ووقّعه، ثم ارفع النسخة الممسوحة ضوئياً
          أدناه بصيغة PDF.
        </p>
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <a href={CUSTOMS_TEMPLATE_URL} download>
            <Download className="h-3.5 w-3.5 ml-1" /> تحميل وثيقة تأكيد المصارفة
          </a>
        </Button>
      </div>

      <UploadField
        id={inputId}
        ref={fileRef}
        label="وثيقة تأكيد المصارفة (موقّعة ومختومة — PDF)"
        file={stampedFile}
        onChange={onFileChange}
      />

      <Button
        onClick={performIssue}
        className="w-full"
        size="lg"
        disabled={!stampedFile || issuing}
      >
        <FileSignature className="h-4 w-4 ml-2" />
        {issuing ? "جارٍ الإصدار..." : "إصدار تأكيد المصارفة الخارجية"}
      </Button>
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> سيُسجَّل الإصدار في سجل التدقيق غير القابل للتعديل.
      </p>
    </div>
  );
}

const UploadField = ({
  id,
  ref,
  label,
  file,
  onChange,
}: {
  id: string;
  ref: RefObject<HTMLInputElement | null>;
  label: string;
  file: File | null;
  onChange: (next: File | null) => void;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-colors text-center"
    >
      <Upload className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm font-medium">
        {file ? "تغيير الملف" : "اضغط هنا لاختيار ملف PDF"}
      </span>
      <span className="text-xs text-muted-foreground">
        {file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB` : "PDF — الحد الأقصى 10MB"}
      </span>
    </button>
    <input
      id={id}
      ref={ref}
      type="file"
      accept="application/pdf,.pdf"
      onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      className="sr-only"
    />
    {file && (
      <div className="flex items-center gap-2 text-xs text-success">
        <FileText className="h-4 w-4" /> تم اختيار: {file.name}
      </div>
    )}
  </div>
);