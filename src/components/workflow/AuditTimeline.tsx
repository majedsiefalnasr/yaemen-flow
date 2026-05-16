import { Clock } from "lucide-react";
import { auditCell } from "@/lib/governance";
import { STAGE_LABELS } from "@/lib/mock";

export function AuditTimeline({ ref: requestRef, limit = 25 }: { ref?: string; limit?: number }) {
  const entries = auditCell.use().filter((e) => !requestRef || e.ref === requestRef).slice(0, limit);
  if (entries.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">لا توجد إجراءات مسجلة بعد.</div>;
  }
  return (
    <ol className="relative border-r-2 border-border pr-6 space-y-4">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -right-[31px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm font-semibold">{e.action}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {new Date(e.ts).toLocaleString("ar-EG")}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {e.userName} {e.fromStage && e.toStage && (
                <span> — من «{STAGE_LABELS[e.fromStage]}» إلى «{STAGE_LABELS[e.toStage]}»</span>
              )}
            </div>
            {e.notes && <div className="text-xs mt-1.5 bg-muted/40 rounded px-2 py-1">{e.notes}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
