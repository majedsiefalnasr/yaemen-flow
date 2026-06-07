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
    label: "قيد معالجة البنك المركزي",
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
            {isReturn ? "مُعاد للتعديل" : "مرفوض"}
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
                        ? "مرفوض في هذه المرحلة"
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
