import { useEffect, useState } from "react";
import { Check, CheckCircle2, Download, Eye, FileSignature, XCircle } from "lucide-react";
import {
  BANK_ROLES,
  STAGE_LABELS,
  STAGE_ORDER,
  bucketsFor,
  useAuth,
  type RequestStage,
  type ImportRequest,
  type DisplayBucket,
} from "@/lib/mock";
import { getLocalFile } from "@/lib/local-files";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RETURN_STAGES: RequestStage[] = ["support_returned", "bank_returned"];
const REJECT_STAGES: RequestStage[] = ["support_rejected", "executive_rejected", "bank_rejected"];
const TERMINAL_DONE: RequestStage[] = ["completed", "customs_released"];

// Simplified 3-step view used for every bank-side role.
const SIMPLIFIED_BANK_STEPS: { key: string; label: string; stages: RequestStage[] }[] = [
  {
    key: "draft",
    label: "مسودة",
    stages: ["draft", "bank_submitted", "bank_internal_review", "bank_returned", "support_returned"],
  },
  {
    key: "cby_processing",
    label: "قيد معالجة اللجنة الوطنية",
    stages: [
      "bank_approved",
      "support_review",
      "support_approved",
      "executive_voting",
      "executive_approved",
      "swift_attached",
    ],
  },
  {
    key: "completed",
    label: "مكتمل",
    stages: ["customs_released", "completed", "bank_rejected", "support_rejected", "executive_rejected"],
  },
];

export function WorkflowProgress({ req, compact = false }: { req: ImportRequest; compact?: boolean }) {
  const { user } = useAuth();
  const role = user?.role ?? null;

  const isReturn = RETURN_STAGES.includes(req.stage);
  const isReject = REJECT_STAGES.includes(req.stage);
  const isApproved = TERMINAL_DONE.includes(req.stage);
  const isBankRole = !!role && BANK_ROLES.includes(role);

  // For bank members, when the request reaches a terminal outcome
  // (approved OR not-meeting-requirements), replace the timeline with a clear
  // completion message + action to view/download the external remittance.
  if (isBankRole && (isApproved || isReject)) {
    return <CompletionPanel req={req} kind={isApproved ? "approved" : "rejected"} />;
  }

  const useBuckets = role && role !== "platform_admin" && !isBankRole;
  const buckets: DisplayBucket[] = useBuckets ? bucketsFor(role!) : [];

  type Step = { key: string; label: string; stages: RequestStage[] };
  const steps: Step[] = isBankRole
    ? SIMPLIFIED_BANK_STEPS
    : useBuckets
      ? buckets
          .filter((b) => !b.stages.every((s) => REJECT_STAGES.includes(s) || RETURN_STAGES.includes(s)))
          .map((b) => ({ key: b.key, label: b.label, stages: b.stages }))
      : STAGE_ORDER.filter((s) => !REJECT_STAGES.includes(s) && !RETURN_STAGES.includes(s)).map((s) => ({
          key: s,
          label: STAGE_LABELS[s],
          stages: [s],
        }));

  const currentIdx = steps.findIndex((s) => s.stages.includes(req.stage));
  const atLastStep = currentIdx >= 0 && currentIdx === steps.length - 1;
  const completedAll =
    TERMINAL_DONE.includes(req.stage) || (atLastStep && !isReject && !isReturn);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">سير العملية التنظيمية</div>
        {(isReturn || isReject) && (
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              isReturn && "bg-warning/15 text-warning",
              isReject && "bg-destructive/15 text-destructive",
            )}
          >
            {isReturn ? "مُعاد للتعديل" : "غير مستوفٍ للشروط"}
          </span>
        )}
      </div>

      <ol className="relative">
        {steps.map((step, i) => {
          const done = completedAll || (currentIdx >= 0 && i < currentIdx);
          const current = !completedAll && i === currentIdx;
          const isLast = i === steps.length - 1;
          const rejectHere = isReject && current;

          return (
            <li key={step.key} className={cn("relative flex items-start gap-3", !isLast && "pb-5")}>
              {/* connector line — RTL: anchor to right edge of circle */}
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-7 right-[11px] w-px h-[calc(100%-1.25rem)]",
                    done ? "bg-foreground/80" : "bg-border",
                  )}
                />
              )}

              {/* node */}
              <div className="relative z-10 shrink-0 w-[22px] h-[22px] flex items-center justify-center">
                {done ? (
                  <span className="w-[22px] h-[22px] rounded-full bg-foreground text-background grid place-items-center">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : current ? (
                  <span
                    className={cn(
                      "w-[22px] h-[22px] rounded-full grid place-items-center",
                      rejectHere
                        ? "bg-destructive/15 ring-2 ring-destructive"
                        : "bg-foreground ring-4 ring-foreground/15",
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        rejectHere ? "bg-destructive" : "bg-background",
                      )}
                    />
                  </span>
                ) : (
                  <span className="w-[22px] h-[22px] rounded-full border-2 border-border bg-muted/40" />
                )}
              </div>

              {/* text */}
              <div className="flex-1 -mt-0.5">
                <div
                  className={cn(
                    "text-sm leading-snug",
                    current ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </div>
                {!compact && (
                  <div
                    className={cn(
                      "text-[11px] mt-0.5 leading-tight",
                      current
                        ? rejectHere
                          ? "text-destructive"
                          : "text-primary"
                        : done
                          ? "text-success"
                          : "text-muted-foreground/70",
                    )}
                  >
                    {current
                      ? rejectHere
                      ? "غير مستوفٍ للشروط في هذه المرحلة"
                        : "المرحلة الحالية"
                      : done
                        ? "مكتملة"
                        : "بانتظار"}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CompletionPanel({ req, kind }: { req: ImportRequest; kind: "approved" | "rejected" }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const storageKey = req.customsStampedFile?.storageKey;
  const publicUrl = req.customsStampedFile?.publicUrl ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!storageKey) {
        setDataUrl(publicUrl);
        return;
      }
      try {
        const stored = await getLocalFile(storageKey);
        if (!cancelled) setDataUrl(stored?.dataUrl ?? publicUrl);
      } catch {
        if (!cancelled) setDataUrl(publicUrl);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [storageKey, publicUrl]);

  const approved = kind === "approved";
  const Icon = approved ? CheckCircle2 : XCircle;
  const fileName = req.customsStampedFile?.name ?? "external-remittance-confirmation.pdf";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-card",
        approved
          ? "bg-gradient-to-br from-success/10 to-success/5 border-success/30"
          : "bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30",
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">سير العملية التنظيمية</div>
        <span
          className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-semibold",
            approved ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive",
          )}
        >
          100% — مكتمل
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-11 w-11 rounded-xl grid place-items-center shrink-0",
            approved ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn("font-semibold", approved ? "text-success" : "text-destructive")}>
            {approved ? "الطلب مستوفٍ للشروط" : "الطلب غير مستوفٍ للشروط"}
          </div>
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {approved
              ? "اكتملت دورة الطلب باعتماد جميع الأطراف وصدر تأكيد المصارفة الخارجية."
              : "تم إغلاق الطلب لعدم استيفاء أحد الشروط المطلوبة. لا يمكن متابعة هذا الطلب ضمن مساره."}
          </div>
        </div>
      </div>

      {approved && (
        <div className="mt-4 pt-4 border-t border-success/20 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileSignature className="h-3.5 w-3.5" />
            <span>تأكيد المصارفة الخارجية</span>
            {req.customsNo && (
              <span className="font-mono font-semibold text-foreground">· {req.customsNo}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {dataUrl ? (
              <>
                <Button asChild size="sm" className="h-8">
                  <a href={dataUrl} target="_blank" rel="noreferrer">
                    <Eye className="h-3.5 w-3.5 ml-1.5" /> مشاهدة التأكيد
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8">
                  <a href={dataUrl} download={fileName}>
                    <Download className="h-3.5 w-3.5 ml-1.5" /> تحميل التأكيد
                  </a>
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                النسخة الإلكترونية لتأكيد المصارفة غير متاحة على هذا المتصفح.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
