import { useState } from "react";
import { Check, X, Lock, Crown, Gavel, AlertTriangle, StopCircle } from "lucide-react";
import {
  votesCell, voteHistoryCell, finalizationsCell, execConfigCell,
  castVote, tally, isFinalized, finalizeVoting,
} from "@/lib/governance";
import { DEMO_USERS, useAuth, type ImportRequest } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function VotingPanel({ req }: { req: ImportRequest }) {
  const { user } = useAuth();
  votesCell.use(); voteHistoryCell.use(); finalizationsCell.use();
  const cfg = execConfigCell.use();
  const final = isFinalized(req.id);
  const { counts, votes } = tally(req.id);
  const members = cfg.memberIds.map((id) => DEMO_USERS.find((u) => u.id === id)).filter(Boolean) as typeof DEMO_USERS;
  const [justif, setJustif] = useState("");

  const isMember = !!user && cfg.memberIds.includes(user.id);
  const isManager = !!user && user.id === cfg.managerId;
  const myVote = user ? votes.find((v) => v.voterId === user.id) : undefined;
  const locked = !!final;

  const totalVoted = counts.approve + counts.reject;
  const totalMembers = members.length;
  const pendingVoters = members.filter((m) => !votes.some((v) => v.voterId === m.id));
  const allVoted = pendingVoters.length === 0 && totalMembers > 0;
  const approveProgress = totalMembers ? (counts.approve / totalMembers) * 100 : 0;
  const rejectProgress = totalMembers ? (counts.reject / totalMembers) * 100 : 0;

  function vote(v: "approve" | "reject") {
    if (!user) return;
    const ok = castVote(req, user.id, v, justif || undefined);
    if (!ok) return toast.error("التصويت مغلق");
    toast.success("تم تسجيل تصويتك");
    setJustif("");
  }


  const sessionOpen = req.stage === "executive_voting" && !locked;
  const canControlSession = isManager && !locked;

  function closeSession() {
    if (!user) return;
    if (!allVoted) {
      toast.error("لا يمكن إغلاق التصويت قبل تصويت جميع الأعضاء");
      return;
    }
    if (!confirm("سيتم احتساب نتيجة التصويت ونشر القرار النهائي. متابعة؟")) return;
    const r = finalizeVoting(req, user.id);
    if ("error" in r) toast.error(r.error);
    else toast.success(`تم إغلاق التصويت — ${r.result === "approved" ? "اعتماد" : "غير مستوفي للشروط"}`);
  }

  return (
    <div className="rounded-xl border bg-card divide-y">
      {/* Header */}
      <div className="p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2">
            <Gavel className="h-4 w-4" /> جلسة تصويت اللجنة التنفيذية
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            يجب تصويت جميع الأعضاء قبل إغلاق الجلسة · صوّت {totalVoted} من {totalMembers}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {locked ? (
            <span className={cn(
              "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold",
              final.result === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}>
              <Lock className="h-3.5 w-3.5" />
              تم إغلاق التصويت — {final.result === "approved" ? "مُعتمد" : "غير مستوفي للشروط"}
              {final.managerVoteWeighted && " (بصوت المدير المرجّح)"}
            </span>
          ) : sessionOpen ? (
            <span className="text-xs px-3 py-1.5 rounded-full bg-info/15 text-info font-medium">
              باب التصويت مفتوح (تلقائياً)
            </span>
          ) : (
            <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium">
              باب التصويت مغلق
            </span>
          )}
          {canControlSession && sessionOpen && (
            <Button
              size="sm"
              variant="destructive"
              onClick={closeSession}
              disabled={!allVoted}
              title={
                !allVoted
                  ? `بانتظار: ${pendingVoters.map((m) => m.name).join("، ")}`
                  : undefined
              }
            >
              <StopCircle className="h-4 w-4 ml-1" /> إغلاق باب التصويت
            </Button>
          )}
        </div>
      </div>

      {/* Tally */}
      <div className="p-4 grid sm:grid-cols-2 gap-3">
        <Tally label="موافق" count={counts.approve} pct={approveProgress} cls="bg-success" />
        <Tally label="غير مستوفي للشروط" count={counts.reject} pct={rejectProgress} cls="bg-destructive" />
      </div>

      {/* Member list */}
      <div className="p-4">
        <div className="text-xs font-semibold mb-2 text-muted-foreground">أعضاء اللجنة</div>
        <div className="space-y-1.5">
          {members.map((m) => {
            const v = votes.find((x) => x.voterId === m.id);
            const isMgr = m.id === cfg.managerId;
            return (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {m.name}
                    {isMgr && <Crown className="h-3.5 w-3.5 text-accent" aria-label="مدير اللجنة" />}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{m.email}</div>
                </div>
                {v ? (
                  <span className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full font-medium",
                    v.vote === "approve" && "bg-success/15 text-success",
                    v.vote === "reject" && "bg-destructive/15 text-destructive",
                  )}>
                    {v.vote === "approve" ? "موافق" : "غير مستوفي"}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">لم يصوّت</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cast vote — only when session is open */}
      {isMember && !locked && sessionOpen && (
        <div className="p-4 bg-muted/30">
          <div className="text-xs font-semibold mb-2">
            {myVote ? `تصويتك الحالي: ${myVote.vote === "approve" ? "موافق" : "غير مستوفي للشروط"} — يمكنك تغييره طالما الجلسة مفتوحة` : "صوّت الآن"}
          </div>
          <Textarea
            value={justif}
            onChange={(e) => setJustif(e.target.value)}
            placeholder="مبررات (اختياري)"
            rows={2}
            className="mb-2"
          />
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => vote("approve")} size="sm" className="bg-success hover:bg-success/90 text-success-foreground">
              <Check className="h-4 w-4 ml-1" /> موافق
            </Button>
            <Button onClick={() => vote("reject")} size="sm" variant="destructive">
              <X className="h-4 w-4 ml-1" /> غير مستوفي للشروط
            </Button>
          </div>
        </div>
      )}

      {/* Tie-break notice — appears when all members voted and result is tied */}
      {!locked && totalVoted >= members.length && counts.approve === counts.reject && (
        <div className="p-4 bg-warning/5 border-t-2 border-warning/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">تعادل في التصويت ({counts.approve} مقابل {counts.reject})</div>
              <div className="text-xs text-muted-foreground mt-1">
                {isManager
                  ? "بصفتك مدير اللجنة، صوتك حاسم — اختر موافقة أو غير مستوفي للشروط أعلاه ليُعتمد القرار النهائي تلقائياً."
                  : "بانتظار صوت مدير اللجنة الحاسم لإصدار القرار النهائي."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tally({ label, count, pct, cls }: { label: string; count: number; pct: number; cls: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-bold tabular-nums">{count}</div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", cls)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
