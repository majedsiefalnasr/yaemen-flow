// Governance layer: persistent votes, doc rules, persistent notifications,
// permissions catalog, finalization, audit appender, duplicate scanner.

import { cell, dbResetAll } from "./db";
import {
  REQUESTS as SEED_REQUESTS,
  DEMO_USERS,
  ENTITIES,
  AUDIT as SEED_AUDIT,
  NOTIFICATIONS as SEED_NOTIFS,
  MERCHANTS as SEED_MERCHANTS,
  type ImportRequest,
  type Role,
  type RequestStage,
  STAGE_LABELS,
  progressFor,
} from "./mock";

// ---------- Persistent collections ----------
export const requestsCell = cell<ImportRequest[]>("requests", SEED_REQUESTS);
export const auditCell = cell<AuditEntry[]>(
  "audit",
  SEED_AUDIT.map((a) => ({
    id: a.id,
    userId: DEMO_USERS[0].id,
    userName: a.user,
    role: "platform_admin" as Role,
    action: a.action,
    ts: a.ts,
    ip: a.ip,
    device: a.device,
    ref: a.ref,
    fromStage: undefined,
    toStage: undefined,
    notes: undefined,
  })),
);
export const notificationsCell = cell<Notif[]>(
  "notifications",
  SEED_NOTIFS.map((n) => ({ ...n, audience: "all" as const })),
);
export const merchantsCell = cell("merchants", SEED_MERCHANTS);
export const entitiesCell = cell("entities", ENTITIES);

// Voting
export type Vote = "approve" | "reject" | "abstain";
export type VoteRecord = {
  requestId: string;
  voterId: string;
  vote: Vote;
  justification?: string;
  ts: string;
};
export type VoteHistory = VoteRecord & { id: string };
export type FinalizationRecord = {
  requestId: string;
  result: "approved" | "rejected";
  finalizedBy: string;
  finalizedAt: string;
  tally: { approve: number; reject: number; abstain: number };
  managerVoteWeighted: boolean;
};

export const votesCell = cell<VoteRecord[]>("votes", []);
export const voteHistoryCell = cell<VoteHistory[]>("voteHistory", []);
export const finalizationsCell = cell<FinalizationRecord[]>("finalizations", []);

// Document rules
export type DocRule = {
  id: string;
  stage: RequestStage;
  name: string;
  required: boolean;
  fileTypes: string[]; // e.g. ['pdf','jpg']
  minCount: number;
};

const DEFAULT_DOC_RULES: DocRule[] = [
  { id: "d1", stage: "draft", name: "السجل التجاري", required: true, fileTypes: ["pdf"], minCount: 1 },
  { id: "d2", stage: "draft", name: "البطاقة الضريبية", required: true, fileTypes: ["pdf"], minCount: 1 },
  { id: "d3", stage: "draft", name: "كشف حساب التاجر", required: true, fileTypes: ["pdf"], minCount: 1 },
  { id: "d4", stage: "draft", name: "الفاتورة التجارية", required: true, fileTypes: ["pdf"], minCount: 1 },
  { id: "d5", stage: "draft", name: "بوليصة الشحن", required: false, fileTypes: ["pdf"], minCount: 0 },
  { id: "d6", stage: "support_approved", name: "وثيقة السويفت (MT103)", required: true, fileTypes: ["pdf"], minCount: 1 },
];

export const docRulesCell = cell<DocRule[]>("docRules", DEFAULT_DOC_RULES);

// Permissions / Roles / SubRoles
export type Permission =
  | "request.create" | "request.review" | "request.approve" | "request.reject"
  | "swift.upload" | "voting.cast" | "voting.finalize"
  | "customs.issue" | "reports.view" | "audit.view"
  | "merchants.manage" | "users.manage" | "entities.manage"
  | "docrules.manage" | "roles.manage";

export const PERMISSION_LABELS: Record<Permission, string> = {
  "request.create": "إنشاء طلب تمويل",
  "request.review": "مراجعة الطلبات",
  "request.approve": "اعتماد الطلبات",
  "request.reject": "رفض الطلبات",
  "swift.upload": "رفع وثيقة السويفت",
  "voting.cast": "التصويت على الطلبات",
  "voting.finalize": "إغلاق التصويت ونشر القرار",
  "customs.issue": "إصدار إذن إصدار بيان جمركي",
  "reports.view": "عرض التقارير",
  "audit.view": "عرض سجل التدقيق",
  "merchants.manage": "إدارة التجار",
  "users.manage": "إدارة المستخدمين",
  "entities.manage": "إدارة البنوك والصرافات",
  "docrules.manage": "إدارة قواعد المستندات",
  "roles.manage": "إدارة الأدوار والصلاحيات",
};

// الصلاحيات التي تخص عمليات البنوك التجارية فقط — ولا تظهر للأدوار التابعة للبنك المركزي.
export const BANK_ONLY_PERMS: Permission[] = [
  "request.create", "request.review", "request.approve", "request.reject", "swift.upload",
];

// الصلاحيات المتاحة لأدوار البنك المركزي (CBY) — تستثني صلاحيات تشغيل البنوك التجارية.
export const CBY_PERMS: Permission[] = (Object.keys(PERMISSION_LABELS) as Permission[])
  .filter((p) => !BANK_ONLY_PERMS.includes(p));

const DEFAULT_ROLE_PERMS: Record<Role, Permission[]> = {
  // مسؤول النظام (CBY)
  platform_admin: [
    "reports.view", "audit.view", "merchants.manage", "users.manage",
    "entities.manage", "docrules.manage", "roles.manage",
  ],
  // مسؤول البنك
  bank_admin: [
    "request.create", "request.review", "swift.upload",
    "reports.view", "audit.view", "merchants.manage", "users.manage", "roles.manage",
  ],
  // موظف إدخال البنك
  bank_intake: ["request.create", "merchants.manage"],
  // مراجع داخلي بالبنك
  bank_reviewer: ["request.review"],
  // موظف السويفت بالبنك
  bank_swift: ["swift.upload"],
  // عضو اللجنة المساندة
  support_member: ["request.approve", "request.reject", "audit.view"],
  // عضو اللجنة التنفيذية
  executive_member: ["voting.cast", "reports.view", "audit.view"],
  // مدير اللجنة التنفيذية — يرث صلاحيات العضو + إغلاق التصويت + إصدار إذن إصدار بيان جمركي
  committee_manager: [
    "voting.cast", "voting.finalize", "customs.issue", "reports.view", "audit.view",
  ],
};

export const rolePermsCell = cell<Record<Role, Permission[]>>("rolePerms", DEFAULT_ROLE_PERMS);

export function can(role: Role, perm: Permission): boolean {
  return rolePermsCell.get()[role]?.includes(perm) ?? false;
}

// Sub-roles (free-form per entity)
export type SubRole = { id: string; entityId: string; name: string; permissions: Permission[] };
export const subRolesCell = cell<SubRole[]>("subRoles", []);

// Executive committee config: 6 members, one is manager.
export type ExecConfig = { memberIds: string[]; managerId: string };
export const execConfigCell = cell<ExecConfig>("execConfig", {
  memberIds: ["u9", "u10", "u11", "u12", "u13", "u14"],
  managerId: "u9",
});

// ---------- Audit ----------
export type AuditEntry = {
  id: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  ts: string;
  ip: string;
  device: string;
  ref: string;
  fromStage?: RequestStage;
  toStage?: RequestStage;
  notes?: string;
};

export function logAudit(entry: Omit<AuditEntry, "id" | "ts" | "ip" | "device">) {
  auditCell.set((prev) => [
    {
      ...entry,
      id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
      ip: "127.0.0.1",
      device: typeof navigator !== "undefined" ? navigator.userAgent.split(") ")[0].slice(0, 40) : "server",
    },
    ...prev,
  ]);
}

// ---------- Notifications ----------
export type Notif = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  audience?: "all" | Role | "cby";
  href?: string;
};

export function notify(n: Omit<Notif, "id" | "time" | "unread">) {
  notificationsCell.set((prev) => [
    { ...n, id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, time: "الآن", unread: true },
    ...prev,
  ]);
}

export function markAllRead() {
  notificationsCell.set((prev) => prev.map((n) => ({ ...n, unread: false })));
}

export function markNotifRead(id: string, unread = false) {
  notificationsCell.set((prev) => prev.map((n) => (n.id === id ? { ...n, unread } : n)));
}

export function deleteNotif(id: string) {
  notificationsCell.set((prev) => prev.filter((n) => n.id !== id));
}

export function clearAllNotifs() {
  notificationsCell.set(() => []);
}

// ---------- Voting engine ----------
export function castVote(req: ImportRequest, voterId: string, vote: Vote, justification?: string) {
  // Cannot vote if already finalized
  if (finalizationsCell.get().some((f) => f.requestId === req.id)) return false;
  const ts = new Date().toISOString();
  const existing = votesCell.get().find((v) => v.requestId === req.id && v.voterId === voterId);
  voteHistoryCell.set((prev) => [
    ...prev,
    { id: `vh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, requestId: req.id, voterId, vote, justification, ts },
  ]);
  votesCell.set((prev) => {
    const without = prev.filter((v) => !(v.requestId === req.id && v.voterId === voterId));
    return [...without, { requestId: req.id, voterId, vote, justification, ts }];
  });
  const voter = DEMO_USERS.find((u) => u.id === voterId);
  logAudit({
    userId: voterId,
    userName: voter?.name ?? voterId,
    role: voter?.role ?? "executive_member",
    action: existing ? "تعديل تصويت" : "تصويت",
    ref: req.ref,
    notes: `${vote}${justification ? " — " + justification : ""}`,
  });
  // No auto-finalization — the committee manager is the sole authority who
  // opens and closes the voting session.
  return true;
}

function commitFinalization(
  req: ImportRequest,
  result: "approved" | "rejected",
  counts: { approve: number; reject: number; abstain: number },
  weighted: boolean,
  managerId: string,
  reason: string,
) {
  const rec: FinalizationRecord = {
    requestId: req.id,
    result,
    finalizedBy: managerId,
    finalizedAt: new Date().toISOString(),
    tally: counts,
    managerVoteWeighted: weighted,
  };
  finalizationsCell.set((prev) => [...prev, rec]);
  requestsCell.set((prev) =>
    prev.map((r) => {
      if (r.id !== req.id) return r;
      const ns: RequestStage = result === "approved" ? "executive_approved" : "executive_rejected";
      return { ...r, stage: ns, progress: progressFor(ns) };
    }),
  );
  logAudit({
    userId: managerId,
    userName: DEMO_USERS.find((u) => u.id === managerId)?.name ?? managerId,
    role: "committee_manager",
    action: reason,
    ref: req.ref,
    fromStage: "executive_voting",
    toStage: result === "approved" ? "executive_approved" : "executive_rejected",
    notes: `${result} (${counts.approve}/${counts.reject}/${counts.abstain})`,
  });
  notify({
    title: "صدر قرار اللجنة التنفيذية",
    body: `${req.ref}: ${result === "approved" ? "اعتماد" : "رفض"}${weighted ? " — بصوت المدير الحاسم" : ""}`,
    audience: "all",
    href: `/requests/${req.id}`,
  });
  return rec;
}

export function tally(requestId: string) {
  const votes = votesCell.get().filter((v) => v.requestId === requestId);
  const counts = { approve: 0, reject: 0, abstain: 0 };
  votes.forEach((v) => counts[v.vote]++);
  return { counts, votes };
}

export function isFinalized(requestId: string): FinalizationRecord | null {
  return finalizationsCell.get().find((f) => f.requestId === requestId) ?? null;
}

/**
 * Close the voting session. Only the executive committee MANAGER can call
 * this. The result is computed from the CURRENT tally regardless of whether
 * all members voted: simple majority wins; on a tie, the manager's vote (if
 * any) is decisive; if the manager hasn't voted on a tie, the request is
 * rejected by default (safe stance).
 */
export function finalizeVoting(req: ImportRequest, managerId: string): FinalizationRecord | { error: string } {
  if (isFinalized(req.id)) return { error: "تم إغلاق التصويت مسبقاً" };
  const cfg = execConfigCell.get();
  if (managerId !== cfg.managerId) return { error: "فقط مدير اللجنة التنفيذية يمكنه إغلاق التصويت" };
  if (req.stage !== "executive_voting") return { error: "باب التصويت غير مفتوح" };

  const { counts } = tally(req.id);
  let result: "approved" | "rejected";
  let weighted = false;

  if (counts.approve > counts.reject) {
    result = "approved";
  } else if (counts.reject > counts.approve) {
    result = "rejected";
  } else {
    // Tie — manager's vote decides; if manager hasn't voted, default to rejection.
    const managerVote = votesCell.get().find((v) => v.requestId === req.id && v.voterId === managerId);
    if (managerVote && managerVote.vote !== "abstain") {
      weighted = true;
      result = managerVote.vote === "approve" ? "approved" : "rejected";
    } else {
      result = "rejected";
    }
  }

  return commitFinalization(req, result, counts, weighted, managerId, "إغلاق باب التصويت");
}

// ---------- Stage transition (persistent) ----------
export function transitionRequest(req: ImportRequest, to: RequestStage, actor: { id: string; name: string; role: Role }, notes?: string) {
  requestsCell.set((prev) => prev.map((r) => (r.id === req.id ? { ...r, stage: to, progress: progressFor(to) } : r)));
  logAudit({
    userId: actor.id,
    userName: actor.name,
    role: actor.role,
    action: "تغيير حالة الطلب",
    ref: req.ref,
    fromStage: req.stage,
    toStage: to,
    notes,
  });
  notify({
    title: `${req.ref}: ${STAGE_LABELS[to]}`,
    body: `بواسطة ${actor.name}`,
    audience: "all",
    href: `/requests/${req.id}`,
  });
}

// ---------- Support Committee Claim (locks request to one reviewer) ----------
export function claimSupportReview(
  req: ImportRequest,
  actor: { id: string; name: string; role: Role },
): { ok: true } | { error: string } {
  if (req.stage !== "bank_approved" && req.stage !== "support_review") {
    return { error: "هذا الطلب ليس في مرحلة المراجعة من المساندة" };
  }
  if (req.supportClaimedBy && req.supportClaimedBy !== actor.id) {
    const other = DEMO_USERS.find((u) => u.id === req.supportClaimedBy);
    return { error: `الطلب مُطالَب به من قبل ${other?.name ?? "عضو آخر"}` };
  }
  if (actor.role !== "support_member" && actor.role !== "platform_admin") {
    return { error: "فقط أعضاء اللجنة المساندة يمكنهم المطالبة بالمراجعة" };
  }
  const ts = new Date().toISOString();
  requestsCell.set((prev) =>
    prev.map((r) =>
      r.id === req.id
        ? { ...r, stage: "support_review", progress: progressFor("support_review"), supportClaimedBy: actor.id, supportClaimedAt: ts }
        : r,
    ),
  );
  logAudit({
    userId: actor.id,
    userName: actor.name,
    role: actor.role,
    action: "بدء مراجعة المساندة (Claim)",
    ref: req.ref,
    fromStage: req.stage,
    toStage: "support_review",
  });
  notify({
    title: `${req.ref}: تم استلام المراجعة`,
    body: `بواسطة ${actor.name}`,
    audience: "cby",
    href: `/requests/${req.id}`,
  });
  return { ok: true };
}

export function releaseSupportClaim(
  req: ImportRequest,
  actor: { id: string; name: string; role: Role },
): { ok: true } | { error: string } {
  if (req.supportClaimedBy !== actor.id && actor.role !== "platform_admin") {
    return { error: "لا يمكن رفع المطالبة إلا من قِبل المُطالِب نفسه أو مسؤول النظام" };
  }
  requestsCell.set((prev) =>
    prev.map((r) =>
      r.id === req.id
        ? { ...r, stage: "bank_approved", progress: progressFor("bank_approved"), supportClaimedBy: undefined, supportClaimedAt: undefined }
        : r,
    ),
  );
  logAudit({
    userId: actor.id,
    userName: actor.name,
    role: actor.role,
    action: "إلغاء المطالبة بالمراجعة",
    ref: req.ref,
    fromStage: "support_review",
    toStage: "bank_approved",
  });
  return { ok: true };
}

export function isClaimedByOther(req: ImportRequest, userId: string): boolean {
  return !!req.supportClaimedBy && req.supportClaimedBy !== userId;
}

// ---------- Document rules ----------
export function missingDocsForStage(stage: RequestStage, uploaded: string[]) {
  const rules = docRulesCell.get().filter((r) => r.stage === stage && r.required);
  return rules.filter((r) => !uploaded.includes(r.name));
}

// ---------- Duplicate detection ----------
export function findDuplicateInvoices(): Array<{ invoice: string; refs: string[] }> {
  const map = new Map<string, string[]>();
  requestsCell.get().forEach((r) => {
    if (!r.invoice) return;
    const arr = map.get(r.invoice) ?? [];
    arr.push(r.ref);
    map.set(r.invoice, arr);
  });
  return [...map.entries()].filter(([, refs]) => refs.length > 1).map(([invoice, refs]) => ({ invoice, refs }));
}

// ---------- Reset demo ----------
export function resetDemoData() {
  dbResetAll();
  if (typeof window !== "undefined") window.location.reload();
}

// ---------- Editable / Locked helpers ----------
export const EDITABLE_STAGES: RequestStage[] = ["draft", "support_returned"];

export function isEditable(req: ImportRequest): boolean {
  return EDITABLE_STAGES.includes(req.stage);
}

export function isLocked(req: ImportRequest): boolean {
  // Once internal review approved (bank_approved) and beyond, request is locked from edits.
  const lockedStages: RequestStage[] = [
    "bank_approved", "support_review", "support_approved", "swift_attached",
    "executive_voting", "executive_approved", "executive_rejected",
    "support_rejected", "customs_released", "completed",
  ];
  return lockedStages.includes(req.stage);
}
