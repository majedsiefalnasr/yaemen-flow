import { useSyncExternalStore } from "react";

// ============================================================
// ROLES (revised RBAC)
// ============================================================

export type Role =
  | "platform_admin" // CBY system admin: manages entities + CBY staff
  | "bank_admin" // entity admin: manages bank internal users
  | "bank_intake" // creates/submits requests on behalf of merchants
  | "bank_reviewer" // performs the bank's internal review (step 2)
  | "bank_swift" // attaches the SWIFT document after CBY support approval
  | "support_member" // CBY support committee reviewer
  | "executive_member" // CBY executive committee voter
  | "committee_manager"; // CBY executive committee MANAGER (opens/closes voting + issues customs)

export const ROLE_LABELS: Record<Role, string> = {
  platform_admin: "مسؤول النظام (CBY)",
  bank_admin: "مسؤول البنك التجاري",
  bank_intake: "موظف إدخال البنك التجاري",
  bank_reviewer: "مراجع داخلي بالبنك التجاري",
  bank_swift: "موظف السويفت بالبنك التجاري",
  support_member: "عضو اللجنة المساندة",
  executive_member: "عضو اللجنة التنفيذية",
  committee_manager: "مدير اللجنة التنفيذية",
};

// helper groups
export const BANK_ROLES: Role[] = ["bank_admin", "bank_intake", "bank_reviewer", "bank_swift"];
export const ORIGIN_ROLES: Role[] = ["bank_admin", "bank_intake"];

// ============================================================
// ENTITIES (banks + exchange houses)
// ============================================================

export type Entity = {
  id: string;
  type: "bank";
  name: string;
  swiftCode?: string;
  licenseNo: string;
  status: "active" | "suspended";
  adminName?: string;
  adminEmail?: string;
};

export const ENTITIES: Entity[] = [
  {
    id: "e1",
    type: "bank",
    name: "البنك اليمني للإنشاء والتعمير",
    swiftCode: "YBRDYESA",
    licenseNo: "BNK-001",
    status: "active",
  },
  {
    id: "e2",
    type: "bank",
    name: "بنك التضامن الإسلامي",
    swiftCode: "TSIBYESA",
    licenseNo: "BNK-002",
    status: "active",
  },
  {
    id: "e3",
    type: "bank",
    name: "بنك سبأ الإسلامي",
    swiftCode: "SBAIYESA",
    licenseNo: "BNK-003",
    status: "active",
  },
];

// ============================================================
// USERS
// ============================================================

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  entityId: string | null; // null for CBY/platform users
  org: string;
  avatar: string;
  active?: boolean; // defaults to true
  phone?: string;
};

export const DEMO_USERS: User[] = [
  // 1) مسؤول النظام
  {
    id: "u1",
    name: "ياسر الحضرمي",
    email: "admin@cby.gov.ye",
    role: "platform_admin",
    entityId: null,
    org: "البنك المركزي – إدارة الأنظمة",
    avatar: "يح",
  },
  // 2) مسؤول البنك التجاري
  {
    id: "u4",
    name: "أحمد المقطري",
    email: "admin@ybank.ye",
    role: "bank_admin",
    entityId: "e1",
    org: "البنك اليمني للإنشاء والتعمير",
    avatar: "أم",
  },
  // 3) موظف ادخال البنك التجاري
  {
    id: "u5",
    name: "علي القاضي",
    email: "intake@ybank.ye",
    role: "bank_intake",
    entityId: "e1",
    org: "البنك اليمني – إدخال",
    avatar: "عق",
  },
  // 4) مراجع داخلي بالبنك التجاري
  {
    id: "u6",
    name: "نوال الحاج",
    email: "reviewer@ybank.ye",
    role: "bank_reviewer",
    entityId: "e1",
    org: "البنك اليمني – مراجعة داخلية",
    avatar: "نح",
  },
  // 5) عضو اللجنة المساندة
  {
    id: "u2",
    name: "محمد الشامي",
    email: "m.shami@cby.gov.ye",
    role: "support_member",
    entityId: null,
    org: "البنك المركزي – لجنة مساندة",
    avatar: "مش",
  },
  {
    id: "u3",
    name: "إيمان الصبري",
    email: "e.sabri@cby.gov.ye",
    role: "support_member",
    entityId: null,
    org: "البنك المركزي – لجنة مساندة",
    avatar: "إص",
  },
  // 6) موظف السويفت بالبنك التجاري
  {
    id: "u7",
    name: "سامي العتمي",
    email: "swift@ybank.ye",
    role: "bank_swift",
    entityId: "e1",
    org: "البنك اليمني – قسم السويفت",
    avatar: "سع",
  },
  // 7) مدير اللجنة التنفيذية
  {
    id: "u9",
    name: "د. هدى الإرياني",
    email: "huda@cby.gov.ye",
    role: "committee_manager",
    entityId: null,
    org: "البنك المركزي – مدير اللجنة التنفيذية",
    avatar: "هإ",
  },
  // 8-12) أعضاء اللجنة التنفيذية 1..5
  {
    id: "u10",
    name: "م. سامي الذماري",
    email: "sami@cby.gov.ye",
    role: "executive_member",
    entityId: null,
    org: "البنك المركزي – عضو اللجنة التنفيذية 1",
    avatar: "سذ",
  },
  {
    id: "u11",
    name: "د. ندى الكبسي",
    email: "nada@cby.gov.ye",
    role: "executive_member",
    entityId: null,
    org: "البنك المركزي – عضو اللجنة التنفيذية 2",
    avatar: "نك",
  },
  {
    id: "u12",
    name: "أ. فهد الشرعبي",
    email: "fahd@cby.gov.ye",
    role: "executive_member",
    entityId: null,
    org: "البنك المركزي – عضو اللجنة التنفيذية 3",
    avatar: "فش",
  },
  {
    id: "u13",
    name: "د. أمينة العزب",
    email: "amina@cby.gov.ye",
    role: "executive_member",
    entityId: null,
    org: "البنك المركزي – عضو اللجنة التنفيذية 4",
    avatar: "أع",
  },
  {
    id: "u14",
    name: "م. خالد الأنسي",
    email: "khaled@cby.gov.ye",
    role: "executive_member",
    entityId: null,
    org: "البنك المركزي – عضو اللجنة التنفيذية 5",
    avatar: "خأ",
  },
];

// ============================================================
// AUTH STORE
// ============================================================

let currentUser: User | null = null;
let lang: "ar" | "en" = "ar";
let theme: "light" | "dark" = "light";
let snapshot: { user: User | null; lang: "ar" | "en"; theme: "light" | "dark" } = {
  user: currentUser,
  lang,
  theme,
};
const serverSnapshot = { user: null as User | null, lang: "ar" as const, theme: "light" as const };
const listeners = new Set<() => void>();
const emit = () => {
  snapshot = { user: currentUser, lang, theme };
  listeners.forEach((l) => l());
};

export const auth = {
  get user() {
    return currentUser;
  },
  get lang() {
    return lang;
  },
  get theme() {
    return theme;
  },
  login(u: User) {
    currentUser = u;
    emit();
  },
  logout() {
    currentUser = null;
    emit();
  },
  setLang(l: "ar" | "en") {
    lang = l;
    emit();
  },
  toggleTheme() {
    theme = theme === "light" ? "dark" : "light";
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useAuth() {
  return useSyncExternalStore(
    (l) => auth.subscribe(l),
    () => snapshot,
    () => serverSnapshot,
  );
}

// ============================================================
// LIFECYCLE (revised regulatory workflow)
// ============================================================

export type RequestStage =
  | "draft"
  | "bank_submitted" // step 1 done — awaiting internal review
  | "bank_internal_review" // a different bank user is reviewing
  | "bank_approved" // internal review approved — sent to CBY support
  | "support_review" // CBY support_member reviewing
  | "support_returned" // sent back to bank for fixes
  | "support_rejected" // terminal — SWIFT step hidden
  | "bank_returned" // returned by bank internal review to intake for fixes
  | "bank_rejected" // terminal — rejected by bank internal review
  | "support_approved" // returned to bank for SWIFT attachment
  | "swift_attached" // SWIFT uploaded, data locked, awaiting voting
  | "executive_voting" // executive committee voting (no support involvement)
  | "executive_rejected" // terminal
  | "executive_approved" // ready for customs declaration
  | "customs_released" // customs declaration issued
  | "completed";

export const STAGE_LABELS: Record<RequestStage, string> = {
  draft: "مسودة",
  bank_submitted: "مُقدَّم من البنك",
  bank_internal_review: "مراجعة داخلية بالبنك",
  bank_approved: "اعتماد البنك الداخلي",
  support_review: "قيد مراجعة اللجنة المساندة",
  support_returned: "معاد من المساندة",
  support_rejected: "مرفوض من المساندة",
  bank_returned: "معاد من المراجعة",
  bank_rejected: "مرفوض من المراجعة",
  support_approved: "اعتماد المساندة — بانتظار التصويت",
  swift_attached: "تم إرفاق السويفت — بانتظار تأكيد المصارفة",
  executive_voting: "تصويت اللجنة التنفيذية",
  executive_rejected: "مرفوض من التنفيذية",
  executive_approved: "اعتماد التنفيذية — بانتظار رفع السويفت",
  customs_released: "صدر تأكيد المصارفة الخارجية",
  completed: "مكتمل",
};

export const STAGE_COLORS: Record<RequestStage, string> = {
  draft: "bg-muted text-muted-foreground",
  bank_submitted: "bg-info/15 text-info",
  bank_internal_review: "bg-warning/15 text-warning",
  bank_approved: "bg-info/15 text-info",
  support_review: "bg-warning/15 text-warning",
  support_returned: "bg-destructive/10 text-destructive",
  support_rejected: "bg-destructive/15 text-destructive",
  bank_returned: "bg-destructive/10 text-destructive",
  bank_rejected: "bg-destructive/15 text-destructive",
  support_approved: "bg-accent/15 text-accent",
  swift_attached: "bg-info/15 text-info",
  executive_voting: "bg-chart-5/15 text-chart-5",
  executive_rejected: "bg-destructive/15 text-destructive",
  executive_approved: "bg-success/15 text-success",
  customs_released: "bg-accent/15 text-accent",
  completed: "bg-success/15 text-success",
};

export const STAGE_ORDER: RequestStage[] = [
  "draft",
  "bank_submitted",
  "bank_internal_review",
  "bank_approved",
  "support_review",
  "executive_voting",
  "executive_approved",
  "swift_attached",
  "customs_released",
  "completed",
];

/**
 * Realistic progress percentage per stage. Reflects actual operational
 * advancement rather than a flat linear index — terminal/return stages map
 * to a meaningful value (e.g., returned drops back to bank-edit point,
 * rejected stays at the stage it failed at).
 */
const STAGE_PROGRESS: Record<RequestStage, number> = {
  draft: 5,
  bank_submitted: 15,
  bank_internal_review: 25,
  bank_approved: 35,
  support_review: 50,
  support_returned: 20, // returned to bank for edits
  support_rejected: 50, // failed at support
  bank_returned: 18, // returned by bank reviewer to intake
  bank_rejected: 25, // failed at bank internal review
  support_approved: 60, // transient — auto-progresses to executive_voting
  executive_voting: 70,
  executive_rejected: 70, // failed at exec
  executive_approved: 80, // awaiting bank swift
  swift_attached: 90, // awaiting manager customs release
  customs_released: 100,
  completed: 100,
};

export function progressFor(stage: RequestStage): number {
  return STAGE_PROGRESS[stage] ?? 0;
}

// ============================================================
// WORKFLOW RULES (state machine + RBAC + separation of duties)
// ============================================================

export type Transition = {
  to: RequestStage;
  label: string;
  roles: Role[];
  requiresEntityMatch?: boolean; // actor must share entity with originator
  forbidIntakeUser?: boolean; // actor must not be intake user (separation of duties)
  requiresExecutive?: boolean; // executive_member only
  destructive?: boolean;
  /** If true, the actor MUST provide a comment before performing this transition. */
  requiresComment?: boolean;
};

export const TRANSITIONS: Record<RequestStage, Transition[]> = {
  draft: [
    {
      to: "bank_submitted",
      label: "تقديم للمراجعة الداخلية",
      roles: ORIGIN_ROLES,
      requiresEntityMatch: true,
    },
  ],
  bank_submitted: [
    {
      to: "bank_internal_review",
      label: "بدء المراجعة الداخلية",
      roles: ["bank_reviewer", "bank_admin"],
      requiresEntityMatch: true,
      forbidIntakeUser: true,
    },
  ],
  bank_internal_review: [
    {
      to: "bank_approved",
      label: "اعتماد المراجعة الداخلية وإحالة للمساندة",
      roles: ["bank_reviewer", "bank_admin"],
      requiresEntityMatch: true,
      forbidIntakeUser: true,
    },
    {
      to: "bank_returned",
      label: "إعادة لإعادة الإدخال",
      roles: ["bank_reviewer", "bank_admin"],
      requiresEntityMatch: true,
      forbidIntakeUser: true,
      requiresComment: true,
    },
    {
      to: "bank_rejected",
      label: "رفض الطلب",
      roles: ["bank_reviewer", "bank_admin"],
      requiresEntityMatch: true,
      forbidIntakeUser: true,
      destructive: true,
      requiresComment: true,
    },
  ],
  bank_approved: [
    { to: "support_review", label: "بدء المراجعة الداخلية", roles: ["support_member"] },
  ],
  support_review: [
    {
      to: "executive_voting",
      label: "اعتماد المساندة وفتح باب التصويت",
      roles: ["support_member"],
    },
    {
      to: "support_returned",
      label: "إعادة للبنك للتعديل",
      roles: ["support_member"],
      requiresComment: true,
    },
    {
      to: "support_rejected",
      label: "رفض الطلب",
      roles: ["support_member"],
      destructive: true,
      requiresComment: true,
    },
  ],
  support_returned: [
    {
      to: "bank_submitted",
      label: "إعادة التقديم بعد التعديل",
      roles: ORIGIN_ROLES,
      requiresEntityMatch: true,
    },
  ],
  bank_returned: [
    {
      to: "bank_submitted",
      label: "إعادة التقديم بعد التعديل",
      roles: ORIGIN_ROLES,
      requiresEntityMatch: true,
    },
  ],
  support_rejected: [], // terminal
  bank_rejected: [], // terminal
  support_approved: [
    // Transient stage — execution-voting is opened automatically on approval.
  ],
  // SWIFT attach (executive_approved → swift_attached) is a dedicated action
  // performed via the SWIFT upload form, not a generic transition.
  swift_attached: [],
  // executive_voting transitions are NOT performed via the generic action panel.
  // Members must cast votes through the voting panel, and the committee
  // manager finalizes the result. This guarantees a real multi-vote process
  // rather than a single-click decision.
  executive_voting: [],
  executive_rejected: [],
  executive_approved: [
    // customs issuance is a dedicated action (POST /customs) and auto-completes
  ],
  customs_released: [],
  completed: [],
};

/** Returns the transitions a given user may legally perform on a given request. */
export function availableTransitions(req: ImportRequest, user: User): Transition[] {
  const list = TRANSITIONS[req.stage] || [];
  return list.filter((t) => {
    if (!t.roles.includes(user.role)) return false;
    if (t.requiresEntityMatch && user.entityId !== req.entityId) return false;
    if (t.forbidIntakeUser && req.intakeUserId === user.id) return false;
    return true;
  });
}

/** Can this user upload SWIFT for this request? */
export function canAttachSwift(req: ImportRequest, user: User): boolean {
  if (req.stage !== "executive_approved") return false;
  if (user.entityId !== req.entityId) return false;
  return user.role === "bank_swift" || user.role === "bank_admin";
}

/** Can this user issue the customs declaration? */
export function canIssueCustoms(req: ImportRequest, user: User): boolean {
  if (req.stage !== "swift_attached") return false;
  return user.role === "committee_manager";
}

// ============================================================
// MOCK DATA
// ============================================================

export type ImportRequest = {
  id: string;
  ref: string;
  importer: string;
  entityId: string; // originating bank/exchange entity
  bank: string;
  amount: number;
  currency: "USD" | "EUR" | "SAR";
  type: string;
  supplier: string;
  invoice: string;
  port: string;
  stage: RequestStage;
  createdAt: string;
  progress: number;
  risk: "low" | "medium" | "high";
  duplicate?: boolean;
  /** Original creator of the (possibly draft) request. */
  intakeUserId: string;
  /** Explicit ownership / attribution fields. */
  createdBy: string;
  lastUpdatedBy: string;
  submittedBy?: string;
  internalReviewUserId?: string;
  supportReviewerId?: string;
  executiveDecisionBy?: string;
  /** Support committee member who claimed the request — locks others out. */
  supportClaimedBy?: string;
  supportClaimedAt?: string;
  swiftFile?: {
    name: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
    mime?: string;
    storageKey?: string;
  };
  /** Filled & stamped "طلب تأكيد مصارفة" form uploaded alongside the SWIFT. */
  remittanceRequestFile?: {
    name: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
    mime?: string;
    storageKey?: string;
  };
  /** Stamped scan of the external-remittance confirmation, uploaded by the committee manager. */
  customsStampedFile?: {
    name: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
    mime?: string;
    storageKey?: string;
  };
  documents?: { name: string; fileName: string; mime: string; dataUrl: string; size: number }[];
  customsNo?: string;
  customsAt?: string;
  customsBy?: string;
};

const types = [
  "مواد غذائية",
  "أدوية ومستلزمات طبية",
  "مشتقات نفطية",
  "قطع غيار",
  "مواد بناء",
  "إلكترونيات",
];
const ports = ["ميناء عدن", "ميناء الحديدة", "ميناء المكلا", "منفذ الوديعة"];
const importers = [
  "شركة هائل سعيد أنعم",
  "مجموعة الشيباني",
  "شركة ثابت إخوان",
  "شركة الكميم للأدوية",
  "مجموعة الأهدل",
];
const suppliers = ["Cargill Inc.", "Pfizer Ltd.", "Saudi Aramco Trading", "Siemens AG", "Bayer AG"];

/**
 * Curated, organized seed data — at least 2 examples per workflow stage,
 * spread across multiple banks, importers, currencies, and risk levels.
 * This replaces the previous random generator so every screen has
 * meaningful coverage out of the box.
 *
 * In addition to stage coverage, the rows below intentionally include
 * role-specific testing scenarios:
 * - support queue claimed by me vs another reviewer
 * - SWIFT attached by both the SWIFT officer and the bank admin
 * - executive sessions with partial votes and a full tie
 * - returned/rejected branches with proper actor attribution
 */
type SupportSeedUserId = "u2" | "u3";
type SwiftSeedUserId = "u4" | "u7";
type ExecutiveSeedUserId = "u9" | "u10" | "u11" | "u12" | "u13" | "u14";
type SeedVote = {
  voterId: ExecutiveSeedUserId;
  vote: "approve" | "reject" | "abstain";
  justification?: string;
  offsetHours?: number;
};

type SeedRow = {
  stage: RequestStage;
  importer: string;
  entity: 0 | 1 | 2; // index into ENTITIES
  amount: number;
  currency: "USD" | "EUR" | "SAR";
  type: string;
  supplier: string;
  port: string;
  risk: "low" | "medium" | "high";
  duplicate?: boolean;
  intake: "u4" | "u5";
  voteOpen?: boolean; // true → stage = executive_voting (session open)
  supportClaimedBy?: SupportSeedUserId;
  supportReviewerId?: SupportSeedUserId;
  swiftUploadedBy?: SwiftSeedUserId;
  votes?: SeedVote[];
};

const SEED_ROWS: SeedRow[] = [
  // ─── draft × 2 ─────────────────────────────────────────────────────
  {
    stage: "draft",
    importer: importers[0],
    entity: 0,
    amount: 120000,
    currency: "USD",
    type: types[0],
    supplier: suppliers[0],
    port: ports[0],
    risk: "low",
    intake: "u5",
  },
  {
    stage: "draft",
    importer: importers[1],
    entity: 1,
    amount: 340000,
    currency: "USD",
    type: types[3],
    supplier: suppliers[3],
    port: ports[1],
    risk: "medium",
    intake: "u4",
  },

  // ─── bank_submitted × 2 ────────────────────────────────────────────
  {
    stage: "bank_submitted",
    importer: importers[2],
    entity: 0,
    amount: 510000,
    currency: "USD",
    type: types[1],
    supplier: suppliers[1],
    port: ports[0],
    risk: "medium",
    intake: "u5",
  },
  {
    stage: "bank_submitted",
    importer: importers[3],
    entity: 2,
    amount: 89000,
    currency: "EUR",
    type: types[1],
    supplier: suppliers[4],
    port: ports[2],
    risk: "low",
    intake: "u4",
  },

  // ─── bank_internal_review × 2 ──────────────────────────────────────
  {
    stage: "bank_internal_review",
    importer: importers[4],
    entity: 1,
    amount: 720000,
    currency: "USD",
    type: types[2],
    supplier: suppliers[2],
    port: ports[1],
    risk: "high",
    intake: "u5",
  },
  {
    stage: "bank_internal_review",
    importer: importers[0],
    entity: 0,
    amount: 145000,
    currency: "SAR",
    type: types[5],
    supplier: suppliers[3],
    port: ports[3],
    risk: "low",
    intake: "u4",
  },

  // ─── bank_approved × 2 (waiting for support) ───────────────────────
  {
    stage: "bank_approved",
    importer: importers[1],
    entity: 2,
    amount: 980000,
    currency: "USD",
    type: types[0],
    supplier: suppliers[0],
    port: ports[0],
    risk: "medium",
    intake: "u5",
  },
  {
    stage: "bank_approved",
    importer: importers[2],
    entity: 0,
    amount: 230000,
    currency: "EUR",
    type: types[4],
    supplier: suppliers[3],
    port: ports[1],
    risk: "low",
    intake: "u4",
  },

  // ─── support_review × 2 (claimed by support member) ────────────────
  {
    stage: "support_review",
    importer: importers[3],
    entity: 1,
    amount: 415000,
    currency: "USD",
    type: types[1],
    supplier: suppliers[1],
    port: ports[2],
    risk: "medium",
    intake: "u5",
    supportClaimedBy: "u2",
    supportReviewerId: "u2",
  },
  {
    stage: "support_review",
    importer: importers[4],
    entity: 2,
    amount: 1250000,
    currency: "USD",
    type: types[2],
    supplier: suppliers[2],
    port: ports[0],
    risk: "high",
    duplicate: true,
    intake: "u4",
    supportClaimedBy: "u3",
    supportReviewerId: "u3",
  },

  // ─── support_returned × 2 ──────────────────────────────────────────
  {
    stage: "support_returned",
    importer: importers[0],
    entity: 0,
    amount: 67000,
    currency: "EUR",
    type: types[5],
    supplier: suppliers[4],
    port: ports[3],
    risk: "low",
    intake: "u5",
  },
  {
    stage: "support_returned",
    importer: importers[1],
    entity: 1,
    amount: 295000,
    currency: "USD",
    type: types[3],
    supplier: suppliers[3],
    port: ports[1],
    risk: "medium",
    intake: "u4",
  },

  // ─── bank_returned × 2 (returned by bank reviewer to intake) ───────
  {
    stage: "bank_returned",
    importer: importers[2],
    entity: 0,
    amount: 132000,
    currency: "USD",
    type: types[0],
    supplier: suppliers[0],
    port: ports[0],
    risk: "low",
    intake: "u5",
  },
  {
    stage: "bank_returned",
    importer: importers[3],
    entity: 1,
    amount: 410000,
    currency: "EUR",
    type: types[3],
    supplier: suppliers[3],
    port: ports[2],
    risk: "medium",
    intake: "u4",
  },

  // ─── support_rejected × 2 ──────────────────────────────────────────
  {
    stage: "support_rejected",
    importer: importers[2],
    entity: 2,
    amount: 780000,
    currency: "USD",
    type: types[2],
    supplier: suppliers[2],
    port: ports[0],
    risk: "high",
    intake: "u5",
  },
  {
    stage: "support_rejected",
    importer: importers[3],
    entity: 0,
    amount: 158000,
    currency: "SAR",
    type: types[1],
    supplier: suppliers[1],
    port: ports[2],
    risk: "medium",
    intake: "u4",
  },

  // ─── swift_attached × 2 (SWIFT uploaded, waiting for manager to issue customs) ─
  {
    stage: "swift_attached",
    importer: importers[1],
    entity: 2,
    amount: 420000,
    currency: "EUR",
    type: types[5],
    supplier: suppliers[4],
    port: ports[3],
    risk: "low",
    intake: "u5",
    swiftUploadedBy: "u7",
  },
  {
    stage: "swift_attached",
    importer: importers[2],
    entity: 1,
    amount: 875000,
    currency: "USD",
    type: types[3],
    supplier: suppliers[3],
    port: ports[1],
    risk: "medium",
    intake: "u4",
    swiftUploadedBy: "u4",
  },

  // ─── executive_voting × 2 (voting session OPEN) ────────────────────
  {
    stage: "executive_voting",
    importer: importers[3],
    entity: 0,
    amount: 1530000,
    currency: "USD",
    type: types[2],
    supplier: suppliers[2],
    port: ports[0],
    risk: "high",
    duplicate: true,
    intake: "u5",
    voteOpen: true,
    votes: [
      { voterId: "u10", vote: "approve", justification: "استيفاء الوثائق", offsetHours: 1 },
      { voterId: "u11", vote: "approve", justification: "المخاطر مقبولة", offsetHours: 2 },
      { voterId: "u12", vote: "reject", justification: "نحتاج تحقق إضافي", offsetHours: 3 },
      { voterId: "u13", vote: "abstain", justification: "بانتظار رأي فني", offsetHours: 4 },
    ],
  },
  {
    stage: "executive_voting",
    importer: importers[4],
    entity: 2,
    amount: 360000,
    currency: "USD",
    type: types[1],
    supplier: suppliers[1],
    port: ports[2],
    risk: "medium",
    intake: "u4",
    voteOpen: true,
    votes: [
      { voterId: "u9", vote: "reject", justification: "الضمانات غير كافية", offsetHours: 1 },
      { voterId: "u10", vote: "approve", justification: "مطابق للمعايير", offsetHours: 2 },
      { voterId: "u11", vote: "approve", justification: "توصية بالاعتماد", offsetHours: 3 },
      { voterId: "u12", vote: "reject", justification: "ملاحظات على المورد", offsetHours: 4 },
      { voterId: "u13", vote: "approve", justification: "الدورة مكتملة", offsetHours: 5 },
      { voterId: "u14", vote: "reject", justification: "السقف الائتماني مرتفع", offsetHours: 6 },
    ],
  },

  // ─── executive_rejected × 2 ────────────────────────────────────────
  {
    stage: "executive_rejected",
    importer: importers[0],
    entity: 1,
    amount: 980000,
    currency: "USD",
    type: types[2],
    supplier: suppliers[2],
    port: ports[1],
    risk: "high",
    intake: "u5",
  },
  {
    stage: "executive_rejected",
    importer: importers[1],
    entity: 0,
    amount: 245000,
    currency: "EUR",
    type: types[3],
    supplier: suppliers[3],
    port: ports[3],
    risk: "medium",
    intake: "u4",
  },

  // ─── executive_approved × 2 (awaiting customs declaration) ─────────
  {
    stage: "executive_approved",
    importer: importers[2],
    entity: 2,
    amount: 715000,
    currency: "USD",
    type: types[0],
    supplier: suppliers[0],
    port: ports[0],
    risk: "low",
    intake: "u5",
  },
  {
    stage: "executive_approved",
    importer: importers[3],
    entity: 1,
    amount: 488000,
    currency: "USD",
    type: types[1],
    supplier: suppliers[1],
    port: ports[1],
    risk: "medium",
    intake: "u4",
  },

  // ─── customs_released × 2 ──────────────────────────────────────────
  {
    stage: "customs_released",
    importer: importers[4],
    entity: 0,
    amount: 920000,
    currency: "USD",
    type: types[2],
    supplier: suppliers[2],
    port: ports[2],
    risk: "low",
    intake: "u5",
  },
  {
    stage: "customs_released",
    importer: importers[0],
    entity: 2,
    amount: 175000,
    currency: "SAR",
    type: types[5],
    supplier: suppliers[4],
    port: ports[3],
    risk: "low",
    intake: "u4",
  },

  // ─── completed × 2 ─────────────────────────────────────────────────
  {
    stage: "completed",
    importer: importers[1],
    entity: 1,
    amount: 540000,
    currency: "USD",
    type: types[0],
    supplier: suppliers[0],
    port: ports[0],
    risk: "low",
    intake: "u5",
  },
  {
    stage: "completed",
    importer: importers[2],
    entity: 0,
    amount: 1280000,
    currency: "USD",
    type: types[3],
    supplier: suppliers[3],
    port: ports[1],
    risk: "medium",
    intake: "u4",
  },
];

const SUBMITTED_STAGES = new Set<RequestStage>([
  "bank_submitted",
  "bank_internal_review",
  "bank_approved",
  "support_review",
  "support_returned",
  "support_rejected",
  "bank_returned",
  "bank_rejected",
  "support_approved",
  "swift_attached",
  "executive_voting",
  "executive_rejected",
  "executive_approved",
  "customs_released",
  "completed",
]);
const INTERNAL_REVIEW_STAGES = new Set<RequestStage>([
  "bank_internal_review",
  "bank_approved",
  "support_review",
  "support_returned",
  "support_rejected",
  "bank_returned",
  "bank_rejected",
  "support_approved",
  "swift_attached",
  "executive_voting",
  "executive_rejected",
  "executive_approved",
  "customs_released",
  "completed",
]);
const SUPPORT_HANDLED_STAGES = new Set<RequestStage>([
  "support_review",
  "support_returned",
  "support_rejected",
  "executive_voting",
  "executive_rejected",
  "executive_approved",
  "swift_attached",
  "customs_released",
  "completed",
]);
const SWIFT_ATTACHED_STAGES = new Set<RequestStage>([
  "swift_attached",
  "customs_released",
  "completed",
]);
const EXECUTIVE_DECISION_STAGES = new Set<RequestStage>([
  "executive_rejected",
  "executive_approved",
  "customs_released",
  "completed",
]);
const CUSTOMS_DONE_STAGES = new Set<RequestStage>(["customs_released", "completed"]);

const REQUEST_SEED_META = SEED_ROWS.map((row, i) => ({
  row,
  index: i,
  requestId: `r${i + 1}`,
  ref: `IMP-2026-${String(2000 + i)}`,
  baseDate: new Date(2026, 4, (i % 28) + 1),
}));

export const REQUESTS: ImportRequest[] = REQUEST_SEED_META.map(
  ({ row, index, requestId, ref, baseDate }) => {
    const entity = ENTITIES[row.entity];
    const submitted = SUBMITTED_STAGES.has(row.stage);
    const internallyReviewed = INTERNAL_REVIEW_STAGES.has(row.stage);
    const supportHandled = SUPPORT_HANDLED_STAGES.has(row.stage);
    const swiftAttached = SWIFT_ATTACHED_STAGES.has(row.stage);
    const executiveDecided = EXECUTIVE_DECISION_STAGES.has(row.stage);
    const customsDone = CUSTOMS_DONE_STAGES.has(row.stage);
    const supportReviewerId =
      row.supportReviewerId ?? (supportHandled ? (row.supportClaimedBy ?? "u2") : undefined);
    const supportClaimedBy =
      row.stage === "support_review" ? (row.supportClaimedBy ?? "u2") : undefined;
    const swiftUploadedBy = swiftAttached ? (row.swiftUploadedBy ?? "u7") : undefined;
    const executiveDecisionBy = executiveDecided ? "u9" : undefined;
    const customsBy = customsDone ? "u9" : undefined;
    const lastUpdatedBy =
      customsBy ??
      executiveDecisionBy ??
      swiftUploadedBy ??
      supportReviewerId ??
      (internallyReviewed ? "u6" : submitted ? row.intake : row.intake);

    return {
      id: requestId,
      ref,
      importer: row.importer,
      entityId: entity.id,
      bank: entity.name,
      amount: row.amount,
      currency: row.currency,
      type: row.type,
      supplier: row.supplier,
      invoice: `INV-2026-${String(10000 + index * 11)}`,
      port: row.port,
      stage: row.stage,
      createdAt: baseDate.toISOString(),
      progress: progressFor(row.stage),
      risk: row.risk,
      duplicate: row.duplicate,
      intakeUserId: row.intake,
      createdBy: row.intake,
      lastUpdatedBy,
      submittedBy: submitted ? row.intake : undefined,
      internalReviewUserId: internallyReviewed ? "u6" : undefined,
      supportReviewerId,
      supportClaimedBy,
      supportClaimedAt:
        row.stage === "support_review" && supportClaimedBy
          ? new Date(baseDate.getTime() + 2 * 3600_000).toISOString()
          : undefined,
      executiveDecisionBy,
      swiftFile: swiftAttached
        ? {
            name: `SWIFT-MT103-${2000 + index}.pdf`,
            size: 184320,
            uploadedAt: new Date(baseDate.getTime() + 4 * 3600_000).toISOString(),
            uploadedBy: swiftUploadedBy ?? "u7",
            mime: "application/pdf",
          }
        : undefined,
      customsNo: customsDone ? `CD-2026-${String(7000 + index)}` : undefined,
      customsAt: customsDone
        ? new Date(baseDate.getTime() + 8 * 3600_000).toISOString()
        : undefined,
      customsBy,
    };
  },
);

export const SEED_VOTES = REQUEST_SEED_META.flatMap(({ row, requestId, baseDate }) =>
  (row.votes ?? []).map((vote, voteIndex) => ({
    requestId,
    voterId: vote.voterId,
    vote: vote.vote,
    justification: vote.justification,
    ts: new Date(baseDate.getTime() + (vote.offsetHours ?? voteIndex + 1) * 3600_000).toISOString(),
  })),
);

export const SEED_VOTE_HISTORY = SEED_VOTES.map((vote, index) => ({
  id: `vh_seed_${index + 1}`,
  ...vote,
}));

export type Merchant = {
  id: string;
  name: string;
  tax: string;
  cr: string;
  address: string;
  contact: string;
  category: string;
  status: "active" | "suspended";
  transactions: number;
  entityId?: string; // bank the merchant is registered with
};
export const MERCHANTS: Merchant[] = importers.map((n, i) => ({
  id: `m${i + 1}`,
  name: n,
  tax: `4${String(100000 + i * 7777)}`,
  cr: `CR-${String(50000 + i * 13)}`,
  address: ["صنعاء – شارع الزبيري", "عدن – كريتر", "الحديدة – شارع صنعاء", "المكلا", "تعز"][i % 5],
  contact: `+9677${String(11000000 + i * 9999)}`,
  category: types[i % types.length],
  status: i === 4 ? "suspended" : "active",
  transactions: 3 + i * 4,
  entityId: ENTITIES[i % ENTITIES.length].id,
}));

export type AuditLog = {
  id: string;
  user: string;
  action: string;
  ts: string;
  ip: string;
  device: string;
  ref: string;
};
export const AUDIT: AuditLog[] = Array.from({ length: 25 }, (_, i) => ({
  id: `a${i}`,
  user: DEMO_USERS[i % DEMO_USERS.length].name,
  action: [
    "تسجيل دخول",
    "إنشاء طلب",
    "اعتماد مراجعة داخلية",
    "اعتماد المساندة",
    "رفع سويفت",
    "تصويت",
    "إصدار بيان جمركي",
    "تصدير تقرير",
  ][i % 8],
  ts: new Date(Date.now() - i * 3600000).toISOString(),
  ip: `196.${10 + (i % 200)}.${i % 255}.${(i * 13) % 255}`,
  device: ["Chrome / Win", "Edge / Win", "Safari / macOS", "Firefox / Linux"][i % 4],
  ref: `IMP-2025-${1000 + (i % 42)}`,
}));

export const MONTHLY = [
  { m: "يناير", طلبات: 120, مُعتمد: 95, مرفوض: 12 },
  { m: "فبراير", طلبات: 142, مُعتمد: 110, مرفوض: 18 },
  { m: "مارس", طلبات: 165, مُعتمد: 130, مرفوض: 20 },
  { m: "أبريل", طلبات: 138, مُعتمد: 108, مرفوض: 14 },
  { m: "مايو", طلبات: 178, مُعتمد: 145, مرفوض: 19 },
  { m: "يونيو", طلبات: 195, مُعتمد: 160, مرفوض: 22 },
  { m: "يوليو", طلبات: 210, مُعتمد: 178, مرفوض: 21 },
  { m: "أغسطس", طلبات: 188, مُعتمد: 152, مرفوض: 25 },
  { m: "سبتمبر", طلبات: 220, مُعتمد: 185, مرفوض: 23 },
  { m: "أكتوبر", طلبات: 245, مُعتمد: 205, مرفوض: 24 },
];

export const CATEGORY_DIST = types.map((name, i) => ({ name, value: [32, 22, 18, 12, 9, 7][i] }));

export const NOTIFICATIONS = [
  {
    id: "n1",
    title: "طلب جديد بحاجة لمراجعتك الداخلية",
    body: "IMP-2025-1023 من قسم الإدخال",
    time: "منذ 5 دقائق",
    unread: true,
  },
  {
    id: "n2",
    title: "تم اعتماد المساندة — أرفق السويفت",
    body: "IMP-2025-1019 بانتظار وثيقة السويفت",
    time: "منذ 32 دقيقة",
    unread: true,
  },
  {
    id: "n3",
    title: "تنبيه: فاتورة مكررة",
    body: "INV-2024028 مرتبطة بطلبين",
    time: "منذ ساعة",
    unread: true,
  },
  {
    id: "n4",
    title: "صدر إذن إصدار بيان جمركي",
    body: "IMP-2025-1011 – ميناء عدن",
    time: "اليوم 09:14",
    unread: false,
  },
  {
    id: "n5",
    title: "إعادة طلب من المساندة",
    body: "نقص في شهادة المنشأ",
    time: "أمس",
    unread: false,
  },
];

// ============================================================
// VISIBILITY: who can see which requests (operational scoping)
// ============================================================

const SUPPORT_VISIBLE_STAGES: RequestStage[] = [
  "bank_approved",
  "support_review",
  "support_returned",
  "support_rejected",
];
const EXEC_VISIBLE_STAGES: RequestStage[] = [
  "executive_voting",
  "executive_approved",
  "executive_rejected",
  "swift_attached",
  "customs_released",
  "completed",
];
const SWIFT_VISIBLE_STAGES: RequestStage[] = [
  "executive_approved",
  "swift_attached",
  "customs_released",
  "completed",
];

/**
 * Stages each role can actively work on. Used to scope the "queue" page
 * so each user sees only requests whose current stage is relevant to them.
 */
const ROLE_QUEUE_STAGES: Record<Role, RequestStage[] | "all"> = {
  platform_admin: "all",
  bank_admin: [
    "draft",
    "bank_submitted",
    "bank_internal_review",
    "bank_returned",
    "bank_approved",
    "support_review",
    "support_returned",
    "executive_voting",
    "executive_approved",
    "swift_attached",
    "executive_rejected",
    "support_rejected",
    "bank_rejected",
    "customs_released",
    "completed",
  ],
  bank_intake: ["draft", "bank_returned", "support_returned"],
  bank_reviewer: ["bank_submitted", "bank_internal_review"],
  bank_swift: ["executive_approved", "swift_attached"],
  support_member: ["bank_approved", "support_review"],
  executive_member: ["executive_voting"],
  committee_manager: ["executive_voting", "executive_approved", "swift_attached"],
};

/** Requests that are actionable / relevant to the user's role queue. */
export function queueRequestsFor(user: User | null, list: ImportRequest[]): ImportRequest[] {
  if (!user) return [];
  const scoped = visibleRequestsFor(user, list);
  const stages = ROLE_QUEUE_STAGES[user.role];
  if (stages === "all") return scoped;
  return scoped.filter((r) => stages.includes(r.stage));
}

/**
 * Returns the requests a given user is operationally allowed to see.
 * This is the single source of truth for queue/list visibility.
 */
export function visibleRequestsFor(user: User | null, list: ImportRequest[]): ImportRequest[] {
  if (!user) return [];
  switch (user.role) {
    case "platform_admin":
      return list;

    // موظف إدخال البنك: يرى كل طلبات بنكه (ليس فقط ما أنشأه بنفسه).
    case "bank_intake":
      return list.filter((r) => r.entityId === user.entityId);

    // Bank reviewers & bank admins: full visibility within their entity only.
    case "bank_reviewer":
    case "bank_admin":
      return list.filter((r) => r.entityId === user.entityId);

    // SWIFT officers: their entity, restricted to SWIFT-relevant stages.
    case "bank_swift":
      return list.filter(
        (r) => r.entityId === user.entityId && SWIFT_VISIBLE_STAGES.includes(r.stage),
      );

    // Support committee: only support-workflow stages.
    case "support_member":
      return list.filter((r) => SUPPORT_VISIBLE_STAGES.includes(r.stage));

    // Executive committee: only executive-workflow stages.
    case "executive_member":
    case "committee_manager":
      return list.filter((r) => EXEC_VISIBLE_STAGES.includes(r.stage));

    default:
      return [];
  }
}

/** Can the given user view this single request's detail page? */
export function canViewRequest(user: User | null, req: ImportRequest): boolean {
  if (!user) return false;
  return visibleRequestsFor(user, [req]).length > 0;
}

// ============================================================
// ROLE-SPECIFIC DISPLAY STATUSES (business-friendly buckets)
// Internal workflow stages are mapped into a smaller, role-relevant set
// of statuses. A data-entry user must NOT see raw CBY operational stages
// (e.g. "executive_voting"); they see "قيد معالجة البنك المركزي" instead.
// ============================================================

export type DisplayBucket = {
  key: string;
  label: string;
  color: string;
  stages: RequestStage[];
};

const C = {
  muted: "bg-muted text-muted-foreground",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  destructive: "bg-destructive/15 text-destructive",
  chart5: "bg-chart-5/15 text-chart-5",
};

const DATA_ENTRY_BUCKETS: DisplayBucket[] = [
  { key: "draft", label: "مسودات", color: C.muted, stages: ["draft"] },
  { key: "submitted", label: "مُقدَّم للمراجعة", color: C.info, stages: ["bank_submitted"] },
  {
    key: "internal_review",
    label: "قيد المراجعة الداخلية",
    color: C.warning,
    stages: ["bank_internal_review"],
  },
  {
    key: "cby_processing",
    label: "قيد معالجة البنك المركزي",
    color: C.accent,
    stages: [
      "bank_approved",
      "support_review",
      "executive_voting",
      "executive_approved",
      "swift_attached",
    ],
  },
  {
    key: "returned",
    label: "بحاجة لتعديل",
    color: C.warning,
    stages: ["support_returned", "bank_returned"],
  },
  {
    key: "rejected",
    label: "مرفوض",
    color: C.destructive,
    stages: ["support_rejected", "executive_rejected", "bank_rejected"],
  },
  { key: "completed", label: "مكتمل", color: C.success, stages: ["customs_released", "completed"] },
];

const BANK_REVIEWER_BUCKETS: DisplayBucket[] = [
  { key: "drafts", label: "مسودات", color: C.muted, stages: ["draft"] },
  {
    key: "internal_review",
    label: "مراجعة داخلية معلّقة",
    color: C.warning,
    stages: ["bank_submitted", "bank_internal_review"],
  },
  {
    key: "cby_review",
    label: "قيد مراجعة البنك المركزي",
    color: C.warning,
    stages: ["bank_approved", "support_review", "support_approved"],
  },
  {
    key: "returned",
    label: "مُعاد للتعديل",
    color: C.warning,
    stages: ["support_returned", "bank_returned"],
  },
  {
    key: "exec_voting",
    label: "تصويت اللجنة التنفيذية",
    color: C.chart5,
    stages: ["executive_voting"],
  },
  { key: "waiting_swift", label: "بانتظار رفع السويفت", color: C.accent, stages: ["executive_approved"] },
  { key: "swift_done", label: "تم رفع السويفت — بانتظار تأكيد المصارفة", color: C.info, stages: ["swift_attached"] },
  {
    key: "rejected",
    label: "مرفوض",
    color: C.destructive,
    stages: ["support_rejected", "executive_rejected", "bank_rejected"],
  },
  { key: "completed", label: "مكتمل", color: C.success, stages: ["customs_released", "completed"] },
];

const SWIFT_BUCKETS: DisplayBucket[] = [
  {
    key: "waiting_swift",
    label: "بانتظار رفع السويفت",
    color: C.warning,
    stages: ["executive_approved"],
  },
  {
    key: "swift_uploaded",
    label: "تم رفع السويفت",
    color: C.success,
    stages: [
      "swift_attached",
      "customs_released",
      "completed",
    ],
  },
];

const SUPPORT_BUCKETS: DisplayBucket[] = [
  {
    key: "support_pending",
    label: "بانتظار المراجعة",
    color: C.warning,
    stages: ["bank_approved"],
  },
  {
    key: "support_in_progress",
    label: "قيد المراجعة",
    color: C.warning,
    stages: ["support_review"],
  },
  { key: "approved", label: "مُعتمد من المساندة", color: C.success, stages: ["support_approved"] },
  { key: "returned", label: "مُعاد للبنك", color: C.warning, stages: ["support_returned"] },
  { key: "rejected", label: "مرفوض", color: C.destructive, stages: ["support_rejected"] },
];

const EXECUTIVE_BUCKETS: DisplayBucket[] = [
  { key: "voting_open", label: "باب التصويت مفتوح", color: C.chart5, stages: ["executive_voting"] },
  {
    key: "awaiting_swift",
    label: "بانتظار رفع السويفت من البنك",
    color: C.accent,
    stages: ["executive_approved"],
  },
  {
    key: "awaiting_customs",
    label: "بانتظار إصدار تأكيد المصارفة الخارجية",
    color: C.accent,
    stages: ["swift_attached"],
  },
  {
    key: "customs_done",
    label: "مكتمل",
    color: C.success,
    stages: ["customs_released", "completed"],
  },
  { key: "rejected", label: "مرفوض", color: C.destructive, stages: ["executive_rejected"] },
];

const BUCKETS_BY_ROLE: Record<Role, DisplayBucket[]> = {
  bank_intake: DATA_ENTRY_BUCKETS,
  bank_reviewer: BANK_REVIEWER_BUCKETS,
  bank_admin: BANK_REVIEWER_BUCKETS,
  bank_swift: SWIFT_BUCKETS,
  support_member: SUPPORT_BUCKETS,
  executive_member: EXECUTIVE_BUCKETS,
  committee_manager: EXECUTIVE_BUCKETS,
  platform_admin: STAGE_ORDER.map((s) => ({
    key: s,
    label: STAGE_LABELS[s],
    color: STAGE_COLORS[s],
    stages: [s],
  })),
};

/** Ordered display buckets for the role's queues / tabs. */
export function bucketsFor(role: Role): DisplayBucket[] {
  return BUCKETS_BY_ROLE[role] ?? [];
}

/** Role-aware display status for a single request stage. */
export function displayStatusFor(
  stage: RequestStage,
  role: Role,
): { key: string; label: string; color: string } {
  const b = bucketsFor(role).find((b) => b.stages.includes(stage));
  if (b) return { key: b.key, label: b.label, color: b.color };
  return { key: stage, label: STAGE_LABELS[stage], color: STAGE_COLORS[stage] };
}

const OFF_TRACK_STAGES: RequestStage[] = [
  "support_returned",
  "support_rejected",
  "executive_rejected",
  "bank_returned",
  "bank_rejected",
];

/** The forward-progress buckets for a role (excludes returned/rejected buckets). */
export function progressionBucketsFor(role: Role): DisplayBucket[] {
  return bucketsFor(role).filter((b) => !b.stages.every((s) => OFF_TRACK_STAGES.includes(s)));
}

/**
 * Role-aware progress percentage. The last bucket in the role's progression
 * chain represents "done from this role's perspective" → 100%. Off-track
 * (returned/rejected) stages fall back to the global STAGE_PROGRESS value.
 */
export function progressForRole(stage: RequestStage, role: Role | null | undefined): number {
  if (!role) return progressFor(stage);
  const chain = progressionBucketsFor(role);
  const idx = chain.findIndex((b) => b.stages.includes(stage));
  if (idx >= 0) return Math.round(((idx + 1) / chain.length) * 100);
  return progressFor(stage);
}
