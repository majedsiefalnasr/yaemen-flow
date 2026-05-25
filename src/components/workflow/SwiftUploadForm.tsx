import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FileText, Send, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth, canAttachSwift, progressFor } from "@/lib/mock";
import { requestsCell, transitionRequest, logAudit } from "@/lib/governance";
import { getLocalFile, readFileAsDataUrl, saveLocalFile } from "@/lib/local-files";
import { toast } from "sonner";

type SwiftUploadFormProps = {
  requestId: string;
  mode?: "page" | "dialog";
  onSent?: () => void;
};

const MAX_SWIFT_FILE_SIZE = 10 * 1024 * 1024;

export function SwiftUploadForm({ requestId, mode = "page", onSent }: SwiftUploadFormProps) {
  const { user } = useAuth();
  const nav = useNavigate();
  const requests = requestsCell.use();
  const req = requests.find((item) => item.id === requestId);
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [storedFileUrl, setStoredFileUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  useEffect(() => {
    let cancelled = false;

    async function loadStoredSwiftFile() {
      if (!req?.swiftFile?.storageKey) {
        setStoredFileUrl(null);
        return;
      }

      try {
        const stored = await getLocalFile(req.swiftFile.storageKey);
        if (!cancelled) setStoredFileUrl(stored?.dataUrl ?? null);
      } catch (error) {
        console.error("Failed to load the stored SWIFT file.", error);
        if (!cancelled) setStoredFileUrl(null);
      }
    }

    void loadStoredSwiftFile();

    return () => {
      cancelled = true;
    };
  }, [req?.swiftFile?.storageKey]);

  if (!req || !user) return null;

  const currentReq = req;
  const currentUser = user;
  const allowed = canAttachSwift(currentReq, currentUser) || currentReq.stage === "swift_attached";
  const hasSwift = !!currentReq.swiftFile;
  const canSend = hasSwift && currentReq.stage === "swift_attached";

  if (!allowed) {
    return (
      <Card className="p-6 text-center shadow-card border-0">
        <h3 className="font-semibold">غير مصرح</h3>
        <p className="text-sm text-muted-foreground mt-2">
          لا تملك صلاحية رفع السويفت لهذا الطلب، أو الطلب ليس في مرحلة اعتماد المساندة.
        </p>
      </Card>
    );
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function onFileChange(nextFile: File | null) {
    if (!nextFile) {
      setFile(null);
      return;
    }

    const isPdf =
      nextFile.type === "application/pdf" || nextFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      toast.error("يجب اختيار ملف PDF فقط.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
      return;
    }

    if (nextFile.size > MAX_SWIFT_FILE_SIZE) {
      toast.error("حجم ملف السويفت يتجاوز 10MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFile(null);
      return;
    }

    setFile(nextFile);
  }

  async function attachSwift() {
    if (!file) {
      toast.error("يجب اختيار ملف PDF حقيقي لإرفاق السويفت.");
      return;
    }

    const storageKey = `swift:${currentReq.id}`;
    setIsSaving(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploadedAt = new Date().toISOString();

      await saveLocalFile({
        id: storageKey,
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        dataUrl,
        storedAt: uploadedAt,
      });

      requestsCell.set((prev) =>
        prev.map((item) =>
          item.id === currentReq.id
            ? {
                ...item,
                swiftFile: {
                  name: file.name,
                  size: file.size,
                  uploadedAt,
                  uploadedBy: currentUser.id,
                  mime: file.type || "application/pdf",
                  storageKey,
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

      setStoredFileUrl(dataUrl);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("تم حفظ ملف السويفت محلياً وإرفاقه بالطلب.");
    } catch (error) {
      console.error("Failed to store the SWIFT file locally.", error);
      toast.error("تعذر حفظ ملف السويفت محلياً. حاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  function sendToVoting() {
    transitionRequest(
      currentReq,
      "executive_voting",
      { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      "إرسال الطلب للتصويت التنفيذي بعد إرفاق السويفت",
    );
    toast.success("تم إرسال الطلب للجنة التنفيذية للتصويت.");
    onSent?.();
    if (mode === "page") {
      nav({ to: "/requests/$id", params: { id: currentReq.id } });
    }
  }

  return (
    <div className="space-y-4">
      {hasSwift ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-success">تم إرفاق وثيقة السويفت</div>
            <div className="text-xs text-muted-foreground mt-1">
              {req.swiftFile!.name} · {(req.swiftFile!.size / 1024).toFixed(1)} KB
            </div>
            {storedFileUrl ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={storedFileUrl} target="_blank" rel="noreferrer">
                    معاينة الملف
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <a href={storedFileUrl} download={req.swiftFile!.name}>
                    تنزيل الملف
                  </a>
                </Button>
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-muted-foreground">
                لم يتم العثور على النسخة المحلية من الملف في هذا المتصفح.
              </div>
            )}
          </div>
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

          <div className="space-y-2">
            <Label htmlFor={fileInputId}>ملف السويفت (PDF, حد أقصى 10MB)</Label>
            <button
              type="button"
              onClick={openFilePicker}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-colors text-center"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? "تغيير الملف" : "اضغط هنا لاختيار ملف PDF"}
              </span>
              <span className="text-xs text-muted-foreground">
                {file ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB` : "الحد الأقصى 10MB"}
              </span>
            </button>
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            {file && (
              <div className="flex items-center gap-2 text-xs text-success">
                <FileText className="h-4 w-4" /> تم اختيار: {file.name}
              </div>
            )}
          </div>

          <Button onClick={attachSwift} className="w-full" size="lg" disabled={!file || isSaving}>
            <Upload className="h-4 w-4 ml-2" />
            {isSaving ? "جارٍ حفظ ملف السويفت..." : "إرفاق وثيقة السويفت"}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            اختر ملف PDF حقيقي ثم اضغط إرفاق. سيظهر زر "إرسال" بعدها لتحويل الطلب للتصويت.
          </p>
        </>
      )}

      {canSend && (
        <div className="pt-4 border-t space-y-3">
          <p className="text-sm text-muted-foreground">
            بعد التأكد من صحة وثيقة السويفت، اضغط "إرسال" لتحويل الطلب إلى مرحلة{" "}
            <b>تصويت اللجنة التنفيذية</b>.
          </p>
          <Button onClick={sendToVoting} className="w-full" size="lg">
            <Send className="h-4 w-4 ml-2" /> إرسال الطلب للتصويت التنفيذي
            <ArrowRight className="h-4 w-4 mr-2" />
          </Button>
        </div>
      )}

      {mode === "page" && (
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
      )}
    </div>
  );
}
