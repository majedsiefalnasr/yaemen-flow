import { Check, AlertCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { docRulesCell } from "@/lib/governance";
import { STAGE_LABELS, type RequestStage } from "@/lib/mock";
import { cn } from "@/lib/utils";

export function DocumentChecklist({
  stage,
  uploaded,
}: {
  stage: RequestStage;
  uploaded: string[];
}) {
  const rules = docRulesCell.use().filter((r) => r.stage === stage);
  if (rules.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-3 border rounded-md">
        لا توجد قواعد مستندات معرّفة لمرحلة {STAGE_LABELS[stage]}.
      </div>
    );
  }
  const missingRequired = rules.filter((r) => r.required && !uploaded.includes(r.name)).length;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">قواعد المستندات لمرحلة {STAGE_LABELS[stage]}</span>
        {missingRequired > 0 ? (
          <Badge className="bg-destructive/15 text-destructive border-0">
            <AlertCircle className="h-3 w-3 ml-1" /> ينقص {missingRequired} مستند مطلوب
          </Badge>
        ) : (
          <Badge className="bg-success/15 text-success border-0">
            <Check className="h-3 w-3 ml-1" /> مكتمل
          </Badge>
        )}
      </div>
      <div className="space-y-1.5">
        {rules.map((r) => {
          const ok = uploaded.includes(r.name);
          return (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-md border text-sm",
                ok && "border-success/30 bg-success/5",
                !ok && r.required && "border-destructive/30 bg-destructive/5",
                !ok && !r.required && "border-border bg-muted/20",
              )}
            >
              <div
                className={cn(
                  "h-7 w-7 rounded grid place-items-center",
                  ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {ok ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs">{r.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {r.fileTypes.join(", ")} · حد أدنى {r.minCount}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {r.required ? "مطلوب" : "اختياري"}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
