import { Check } from "lucide-react";
import {
  useAuth,
  type RequestStage,
  type ImportRequest,
  type Role,
} from "@/lib/mock";
import { cn } from "@/lib/utils";

/**
 * مراحل سير العملية التنظيمية — مرئية موحدة بترتيب صارم.
 * كل خطوة تربط بمجموعة من الـ stages الداخلية التي تعتبر "الخطوة الحالية".
 * doneness للخطوات التالية يُستنتج من الترتيب.
 *
 * عند الرفض من اللجنة التنفيذية:
 *   - الخطوة التي تم فيها الرفض (التصويت/المراجعة الوطنية) تُعتبر مكتملة (تمت).
 *   - الخطوات التالية (سويفت، تأكيد مصارفة، مكتمل) تظهر "غير مكتمل" باللون الأحمر.
 */

type Step = { key: string; label: string; stages: RequestStage[] };

// خطوات البنك التجاري (مدخل/مراجع/سويفت/مسؤول)
const BANK_STEPS: Step[] = [
  { key: "draft", label: "مسودة", stages: ["draft", "bank_returned", "support_returned"] },
  { key: "internal_review", label: "مراجعة داخلية", stages: ["bank_submitted", "bank_internal_review", "bank_rejected"] },
  { key: "cby_review", label: "مراجعة اللجنة الوطنية", stages: ["bank_approved", "support_review", "support_approved", "executive_voting", "support_rejected", "executive_rejected"] },
  { key: "swift", label: "سويفت", stages: ["executive_approved"] },
  { key: "customs", label: "تأكيد مصارفة", stages: ["swift_attached"] },
  { key: "completed", label: "مكتمل", stages: ["customs_released", "completed"] },
];

// خطوات اللجنة الوطنية (المركزي): المساندة → التنفيذية → الإصدار → مكتمل
const CBY_STEPS: Step[] = [
  { key: "support", label: "مراجعة اللجنة المساندة", stages: ["bank_approved", "support_review", "support_approved", "support_rejected"] },
  { key: "executive", label: "تصويت اللجنة التنفيذية", stages: ["executive_voting", "executive_rejected"] },
  { key: "issue", label: "إصدار تأكيد المصارفة", stages: ["executive_approved", "swift_attached"] },
  { key: "completed", label: "مكتمل", stages: ["customs_released", "completed"] },
];

const BANK_ROLES: Role[] = ["bank_intake", "bank_reviewer", "bank_admin", "bank_swift"];
const CBY_ROLES: Role[] = ["support_member", "executive_member", "committee_manager"];

const REJECT_STAGES: RequestStage[] = ["executive_rejected", "support_rejected", "bank_rejected"];
const TERMINAL_DONE: RequestStage[] = ["completed", "customs_released"];

function stepsForRole(role: Role | null): Step[] {
  if (role && BANK_ROLES.includes(role)) return BANK_STEPS;
  if (role && CBY_ROLES.includes(role)) return CBY_STEPS;
  // platform_admin / null: عرض كامل (البنك ثم اللجنة الوطنية مدمجين بشكل مبسط)
  return BANK_STEPS;
}

export function WorkflowProgress({ req, compact = false }: { req: ImportRequest; compact?: boolean }) {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const steps = stepsForRole(role);

  const isReject = REJECT_STAGES.includes(req.stage);
  const currentIdx = steps.findIndex((s) => s.stages.includes(req.stage));
  const completedAll = TERMINAL_DONE.includes(req.stage);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">سير العملية التنظيمية</div>
      </div>

      <ol className="relative">
        {steps.map((step, i) => {
          // في حالة الرفض النهائي: الخطوة الحالية (مكان الرفض) تُعتبر "تمت"،
          // والخطوات التالية تظهر "غير مكتمل" باللون الأحمر.
          const done = completedAll
            ? true
            : isReject
              ? currentIdx >= 0 && i <= currentIdx
              : currentIdx >= 0 && i < currentIdx;
          const current = !completedAll && !isReject && i === currentIdx;
          const failedAhead = isReject && currentIdx >= 0 && i > currentIdx;
          const isLast = i === steps.length - 1;

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
                    className="w-[22px] h-[22px] rounded-full grid place-items-center bg-foreground ring-4 ring-foreground/15"
                  >
                    <span className="w-2 h-2 rounded-full bg-background" />
                  </span>
                ) : failedAhead ? (
                  <span className="w-[22px] h-[22px] rounded-full border-2 border-destructive bg-destructive/10" />
                ) : (
                  <span className="w-[22px] h-[22px] rounded-full border-2 border-border bg-muted/40" />
                )}
              </div>

              {/* text */}
              <div className="flex-1 -mt-0.5">
                <div
                  className={cn(
                    "text-sm leading-snug",
                    current
                      ? "font-semibold text-foreground"
                      : done
                        ? "text-foreground"
                        : failedAhead
                          ? "text-destructive font-medium"
                          : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </div>
                {!compact && (
                  <div
                    className={cn(
                      "text-[11px] mt-0.5 leading-tight",
                      current
                        ? "text-primary"
                        : done
                          ? "text-success"
                          : failedAhead
                            ? "text-destructive"
                            : "text-muted-foreground/70",
                    )}
                  >
                    {current
                      ? "المرحلة الحالية"
                      : done
                        ? "مكتملة"
                        : failedAhead
                          ? "غير مكتمل"
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
