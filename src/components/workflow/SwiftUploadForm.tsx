import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  Download,
  FileText,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth, canAttachSwift, progressFor } from "@/lib/mock";
import { requestsCell, logAudit } from "@/lib/governance";
import { getLocalFile, readFileAsDataUrl, saveLocalFile } from "@/lib/local-files";
import { toast } from "sonner";

type SwiftUploadFormProps = {
  requestId: string;
  mode?: "page" | "dialog";
  onSent?: () => void;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function SwiftUploadForm({ requestId, mode = "page", onSent }: SwiftUploadFormProps) {
  const { user } = useAuth();
  const nav = useNavigate();
  const requests = requestsCell.use();
  const req = requests.find((item) => item.id === requestId);
  const [swiftFile, setSwiftFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [storedSwiftUrl, setStoredSwiftUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const swiftInputRef = useRef<HTMLInputElement>(null);
  const swiftInputId = useId();

  useEffect(() => {
    let cancelled = false;

    async function loadStoredFiles() {
      try {
        const swiftKey = req?.swiftFile?.storageKey;
        const swiftStored = swiftKey ? await getLocalFile(swiftKey) : null;
        if (!cancelled) {
          setStoredSwiftUrl(swiftStored?.dataUrl ?? null);
        }
      } catch (error) {
        console.error("Failed to load stored SWIFT files.", error);
        if (!cancelled) {
          setStoredSwiftUrl(null);
        }
      }
    }

    void loadStoredFiles();

    return () => {
      cancelled = true;
    };
  }, [req?.swiftFile?.storageKey]);

  if (!req || !user) return null;

  const currentReq = req;
  const currentUser = user;
  const allowed = canAttachSwift(currentReq, currentUser) || currentReq.stage === "swift_attached";
  const hasAttached = !!currentReq.swiftFile;

  if (!allowed) {
    return (
      <Card className="p-6 text-center shadow-card border-0">
        <h3 className="font-semibold">غير مصرح</h3>
        <p className="text-sm text-muted-foreground mt-2">
          لا تملك صلاحية رفع السويفت لهذا الطلب، أو الطلب ليس في مرحلة اعتماد اللجنة التنفيذية.
        </p>
      </Card>
    );
  }

  function validatePdf(nextFile: File | null, label: string): File | null {
    if (!nextFile) return null;
    const isPdf =
      nextFile.type === "application/pdf" || nextFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error(`${label}: يجب اختيار ملف PDF فقط.`);
      return null;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      toast.error(`${label}: حجم الملف يتجاوز 10MB.`);
      return null;
    }
    return nextFile;
  }

  function onSwiftChange(next: File | null) {
    const ok = validatePdf(next, "وثيقة السويفت");
    if (!ok && swiftInputRef.current) swiftInputRef.current.value = "";
    setSwiftFile(ok);
  }

  async function attachBoth() {
    if (!swiftFile) {
      toast.error("يجب رفع وثيقة السويفت.");
      return;
    }

    const swiftKey = `swift:${currentReq.id}`;
    setIsSaving(true);

    try {
      const swiftDataUrl = await readFileAsDataUrl(swiftFile);
      const uploadedAt = new Date().toISOString();

      await saveLocalFile({
        id: swiftKey,
        name: swiftFile.name,
        type: swiftFile.type || "application/pdf",
        size: swiftFile.size,
        dataUrl: swiftDataUrl,
        storedAt: uploadedAt,
      });

      requestsCell.set((prev) =>
        prev.map((item) =>
          item.id === currentReq.id
            ? {
                ...item,
                swiftFile: {
                  name: swiftFile.name,
                  size: swiftFile.size,
                  uploadedAt,
                  uploadedBy: currentUser.id,
                  mime: swiftFile.type || "application/pdf",
                  storageKey: swiftKey,
                },
                stage: "swift_attached" as const,
                progress: progressFor("swift_attached"),
                lastUpdatedBy: currentUser.id,
              }
            : item,
        ),
      );

      logAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        action: "إرفاق وثيقة السويفت",
        ref: currentReq.ref,
        fromStage: currentReq.stage,
        toStage: "swift_attached",
        notes: reference ? `مرجع: ${reference}` : undefined,
      });

      setStoredSwiftUrl(swiftDataUrl);
      setSwiftFile(null);
      if (swiftInputRef.current) swiftInputRef.current.value = "";
      toast.success("تم رفع السويفت وأُحيل الطلب لمدير اللجنة التنفيذية.");
      onSent?.();
      if (mode === "page") {
        nav({ to: "/requests/$id", params: { id: currentReq.id } });
      }
    } catch (error) {
      console.error("Failed to store SWIFT files locally.", error);
      toast.error("تعذر حفظ الملفات محلياً. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {hasAttached ? (
        <div className="space-y-3">
          <AttachedFileCard
            title="وثيقة السويفت"
            name={currentReq.swiftFile!.name}
            size={currentReq.swiftFile!.size}
            dataUrl={storedSwiftUrl}
          />
          <p className="text-xs text-muted-foreground text-center">
            تم إرفاق السويفت — الطلب الآن مع مدير اللجنة التنفيذية لإصدار تأكيد المصارفة الخارجية.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>رقم مرجع السويفت (MT103/MT202)</Label>
            <Input
              placeholder="مثل: 25CBY2025XX"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <UploadField
            id={swiftInputId}
            ref={swiftInputRef}
            label="ملف السويفت (MT103/MT202)"
            file={swiftFile}
            onChange={onSwiftChange}
          />

          <Button
            onClick={attachBoth}
            className="w-full"
            size="lg"
            disabled={!swiftFile || isSaving}
          >
            <Upload className="h-4 w-4 ml-2" />
            {isSaving ? "جارٍ رفع السويفت..." : "إرفاق السويفت وإحالة الطلب"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            بعد الإرفاق، يُحال الطلب تلقائياً لمدير اللجنة التنفيذية لإصدار تأكيد المصارفة الخارجية.
          </p>
        </>
      )}

      {mode === "page" && (
        <Card className="p-5 shadow-card border-0 h-fit">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> ضوابط هذه المرحلة
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed list-disc pr-4">
            <li>لا يُسمح بتعديل أي بيانات سابقة للطلب.</li>
            <li>الإجراء متاح فقط لموظفي السويفت أو مسؤول البنك ضمن نفس الجهة.</li>
            <li>يكفي رفع وثيقة السويفت في هذه المرحلة.</li>
            <li>نموذج طلب تأكيد المصارفة يتولى تحميله وختمه مدير اللجنة التنفيذية لاحقاً.</li>
            <li>سيُسجَّل كل إجراء في سجل التدقيق غير القابل للتعديل.</li>
          </ul>
        </Card>
      )}
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

const AttachedFileCard = ({
  title,
  name,
  size,
  dataUrl,
}: {
  title: string;
  name: string;
  size: number;
  dataUrl: string | null;
}) => (
  <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
    <div className="text-sm flex-1 min-w-0">
      <div className="font-semibold text-success">{title}</div>
      <div className="text-xs text-muted-foreground mt-1 truncate">
        {name} · {(size / 1024).toFixed(1)} KB
      </div>
      {dataUrl ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="h-7 text-xs">
            <a href={dataUrl} target="_blank" rel="noreferrer">
              معاينة
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <a href={dataUrl} download={name}>
              <Download className="h-3.5 w-3.5 ml-1" /> تنزيل
            </a>
          </Button>
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-muted-foreground">
          النسخة المحلية غير متاحة في هذا المتصفح.
        </div>
      )}
    </div>
  </div>
);
