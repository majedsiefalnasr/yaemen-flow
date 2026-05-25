import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { CheckCircle2, Download, FileSignature, FileText, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, canIssueCustoms, progressFor } from "@/lib/mock";
import { requestsCell, logAudit, notify } from "@/lib/governance";
import { getLocalFile, readFileAsDataUrl, saveLocalFile } from "@/lib/local-files";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const CUSTOMS_TEMPLATE_URL = "/templates/نموذج-تأكيد-مصارفة-خارجية.docx";
const REMITTANCE_TEMPLATE_URL = "/templates/نموذج-طلب-تأكيد-مصارفة.docx";

type Props = {
  requestId: string;
  onIssued?: () => void;
};

export function CustomsConfirmForm({ requestId, onIssued }: Props) {
  const { user } = useAuth();
  const requests = requestsCell.use();
  const req = requests.find((r) => r.id === requestId);
  const [stampedFile, setStampedFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [storedUrl, setStoredUrl] = useState<string | null>(null);
  const [remittanceFile, setRemittanceFile] = useState<File | null>(null);
  const [storedRemittanceUrl, setStoredRemittanceUrl] = useState<string | null>(null);
  const [savingRemittance, setSavingRemittance] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const remittanceRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const remittanceId = useId();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const key = req?.customsStampedFile?.storageKey;
      const remKey = req?.remittanceRequestFile?.storageKey;
      try {
        const [stored, remStored] = await Promise.all([
          key ? getLocalFile(key) : Promise.resolve(null),
          remKey ? getLocalFile(remKey) : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setStoredUrl(stored?.dataUrl ?? null);
          setStoredRemittanceUrl(remStored?.dataUrl ?? null);
        }
      } catch {
        if (!cancelled) {
          setStoredUrl(null);
          setStoredRemittanceUrl(null);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [req?.customsStampedFile?.storageKey, req?.remittanceRequestFile?.storageKey]);

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

  const hasRemittance = !!req.remittanceRequestFile;

  function onRemittanceChange(next: File | null) {
    if (!next) {
      setRemittanceFile(null);
      return;
    }
    const isPdf =
      next.type === "application/pdf" || next.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("يجب رفع ملف PDF فقط.");
      if (remittanceRef.current) remittanceRef.current.value = "";
      return;
    }
    if (next.size > MAX_FILE_SIZE) {
      toast.error("حجم الملف يتجاوز 10MB.");
      if (remittanceRef.current) remittanceRef.current.value = "";
      return;
    }
    setRemittanceFile(next);
  }

  async function uploadRemittance() {
    if (!req || !user || !remittanceFile) return;
    setSavingRemittance(true);
    try {
      const dataUrl = await readFileAsDataUrl(remittanceFile);
      const uploadedAt = new Date().toISOString();
      const storageKey = `remittance:${req.id}`;
      await saveLocalFile({
        id: storageKey,
        name: remittanceFile.name,
        type: remittanceFile.type || "application/pdf",
        size: remittanceFile.size,
        dataUrl,
        storedAt: uploadedAt,
      });
      requestsCell.set((prev) =>
        prev.map((r) =>
          r.id === req.id
            ? {
                ...r,
                remittanceRequestFile: {
                  name: remittanceFile.name,
                  size: remittanceFile.size,
                  uploadedAt,
                  uploadedBy: user.id,
                  mime: remittanceFile.type || "application/pdf",
                  storageKey,
                },
                lastUpdatedBy: user.id,
              }
            : r,
        ),
      );
      logAudit({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: "إرفاق نموذج طلب تأكيد المصارفة المختوم",
        ref: req.ref,
      });
      setStoredRemittanceUrl(dataUrl);
      setRemittanceFile(null);
      if (remittanceRef.current) remittanceRef.current.value = "";
      toast.success("تم رفع نموذج طلب تأكيد المصارفة.");
    } catch (error) {
      console.error("Failed to upload remittance request form.", error);
      toast.error("تعذر حفظ الملف. حاول مرة أخرى.");
    } finally {
      setSavingRemittance(false);
    }
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
    if (!req.remittanceRequestFile) {
      toast.error("يجب أولاً رفع نموذج طلب تأكيد المصارفة المختوم.");
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
      const customsNo =
        reference.trim() ||
        `CR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
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
          تم إصدار التأكيد — اكتمل إجراء البنك المركزي على هذا الطلب.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-2">
        <div className="font-semibold text-primary flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> نموذج طلب تأكيد المصارفة (إلزامي قبل الإصدار)
        </div>
        <p className="text-muted-foreground leading-relaxed">
          بصفتك مدير اللجنة التنفيذية: نزّل النموذج، اختمه ووقّعه، ثم ارفع النسخة المختومة بصيغة PDF.
        </p>
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <a href={REMITTANCE_TEMPLATE_URL} download>
            <Download className="h-3.5 w-3.5 ml-1" /> تحميل نموذج طلب تأكيد المصارفة
          </a>
        </Button>
        {hasRemittance ? (
          <div className="rounded-lg border border-success/30 bg-success/5 p-2 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <div className="text-xs flex-1 min-w-0">
              <div className="font-semibold text-success truncate">
                {req.remittanceRequestFile?.name}
              </div>
              {storedRemittanceUrl && (
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="h-6 text-[11px]">
                    <a href={storedRemittanceUrl} target="_blank" rel="noreferrer">معاينة</a>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="h-6 text-[11px]">
                    <a href={storedRemittanceUrl} download={req.remittanceRequestFile?.name}>
                      <Download className="h-3 w-3 ml-1" /> تنزيل
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <UploadField
              id={remittanceId}
              ref={remittanceRef}
              label="نموذج طلب تأكيد المصارفة (مختوم — PDF)"
              file={remittanceFile}
              onChange={onRemittanceChange}
            />
            <Button
              onClick={uploadRemittance}
              size="sm"
              className="w-full"
              disabled={!remittanceFile || savingRemittance}
            >
              <Upload className="h-3.5 w-3.5 ml-1" />
              {savingRemittance ? "جارٍ الرفع..." : "رفع نموذج طلب تأكيد المصارفة"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs space-y-2">
        <div className="font-semibold text-accent flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> وثيقة تأكيد المصارفة الخارجية
        </div>
        <p className="text-muted-foreground leading-relaxed">
          نزّل النموذج، اطبعه واختمه بختم البنك المركزي ووقّعه، ثم ارفع النسخة الممسوحة ضوئياً
          أدناه بصيغة PDF.
        </p>
        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
          <a href={CUSTOMS_TEMPLATE_URL} download>
            <Download className="h-3.5 w-3.5 ml-1" /> تحميل وثيقة تأكيد المصارفة
          </a>
        </Button>
      </div>

      <div className="space-y-2">
        <Label>المرجع الداخلي (اختياري)</Label>
        <Input
          placeholder="مثل: CR-2026-1024"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
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
        disabled={!stampedFile || issuing || !hasRemittance}
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