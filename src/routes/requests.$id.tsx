import {
  createFileRoute,
  Link,
  Outlet,
  useParams,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  FileText,
  Download,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  Building2,
  User,
  Calendar,
  TrendingUp,
  Upload,
  FileSignature,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useAuth,
  availableTransitions,
  canAttachSwift,
  canIssueCustoms,
  DEMO_USERS,
  canViewRequest,
  displayStatusFor,
  progressForRole,
  type RequestStage,
} from "@/lib/mock";
import {
  requestsCell,
  transitionRequest,
  isLocked,
  isEditable,
  logAudit,
  isClaimedByOther,
  auditCell,
} from "@/lib/governance";
import { getLocalFile } from "@/lib/local-files";
import { WorkflowProgress } from "@/components/workflow/WorkflowProgress";
import { VotingPanel } from "@/components/workflow/VotingPanel";
import { AuditTimeline } from "@/components/workflow/AuditTimeline";
import { LockedBanner } from "@/components/workflow/LockedBanner";
import { DocumentChecklist } from "@/components/workflow/DocumentChecklist";
import { SwiftUploadForm } from "@/components/workflow/SwiftUploadForm";
import { CustomsConfirmForm } from "@/components/workflow/CustomsConfirmForm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/requests/$id")({ component: RequestDetail });

function RequestDetail() {
  const { id } = useParams({ from: "/requests/$id" });
  const { user } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [comment, setComment] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{
    name: string;
    fileName?: string;
    mime?: string;
    dataUrl?: string;
    size?: number;
  } | null>(null);
  const [swiftDocDataUrl, setSwiftDocDataUrl] = useState<string | null>(null);
  const [customsDocDataUrl, setCustomsDocDataUrl] = useState<string | null>(null);
  const [swiftDialogOpen, setSwiftDialogOpen] = useState(false);
  const [customsDialogOpen, setCustomsDialogOpen] = useState(false);
  const REQUESTS = requestsCell.use();
  const AUDIT = auditCell.use();

  const req = REQUESTS.find((r) => r.id === id);

  useEffect(() => {
    let cancelled = false;

    async function loadStoredSwiftFile() {
      if (!req?.swiftFile?.storageKey) {
        setSwiftDocDataUrl(null);
        return;
      }

      try {
        const stored = await getLocalFile(req.swiftFile.storageKey);
        if (!cancelled) setSwiftDocDataUrl(stored?.dataUrl ?? null);
      } catch (error) {
        console.error("Failed to load the stored SWIFT file for review.", error);
        if (!cancelled) setSwiftDocDataUrl(null);
      }
    }

    void loadStoredSwiftFile();

    return () => {
      cancelled = true;
    };
  }, [req?.id, req?.swiftFile?.storageKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadStoredCustomsFile() {
      if (!req?.customsStampedFile?.storageKey) {
        setCustomsDocDataUrl(req?.customsStampedFile?.publicUrl ?? null);
        return;
      }

      try {
        const stored = await getLocalFile(req.customsStampedFile.storageKey);
        if (!cancelled)
          setCustomsDocDataUrl(stored?.dataUrl ?? req.customsStampedFile?.publicUrl ?? null);
      } catch (error) {
        console.error("Failed to load the stored customs confirmation file.", error);
        if (!cancelled) setCustomsDocDataUrl(req.customsStampedFile?.publicUrl ?? null);
      }
    }

    void loadStoredCustomsFile();

    return () => {
      cancelled = true;
    };
  }, [req?.id, req?.customsStampedFile?.storageKey, req?.customsStampedFile?.publicUrl]);

  if (path !== `/requests/${id}`) {
    return <Outlet />;
  }

  if (!user) return null;
  if (!req) {
    return (
      <div className="p-8 text-center">
        <PageHeader
          title="الطلب غير موجود"
          subtitle="قد يكون الطلب محذوفاً أو خارج نطاق صلاحياتك."
        />
        <Link to="/requests" className="text-accent hover:underline">
          العودة لقائمة الطلبات
        </Link>
      </div>
    );
  }
  if (!canViewRequest(user, req)) {
    return (
      <div className="p-8">
        <PageHeader title="غير مصرح" subtitle="هذا الطلب خارج نطاق صلاحياتك التشغيلية." />
        <Card className="p-6 border-destructive/30 bg-destructive/5 shadow-card">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              لا تملك صلاحية الاطلاع على هذا الطلب. يتم عرض الطلبات المرتبطة بدورك ومسؤوليتك
              التشغيلية فقط.
            </div>
          </div>
          <Link to="/requests" className="text-accent hover:underline mt-3 inline-block text-sm">
            ← العودة لقائمة الطلبات
          </Link>
        </Card>
      </div>
    );
  }

  const claimedByOther = user.role === "support_member" && isClaimedByOther(req, user.id);
  const transitions = claimedByOther ? [] : availableTransitions(req, user);
  const canSwift = canAttachSwift(req, user);
  const canCustoms = canIssueCustoms(req, user);
  const sodViolation =
    req.stage === "bank_submitted" &&
    user.id === req.intakeUserId &&
    user.entityId === req.entityId;
  const locked = isLocked(req);
  const editable = isEditable(req);

  // Latest reason/comment recorded when the request moved into a given stage.
  const reasonFor = (toStage: RequestStage): string | undefined => {
    const entry = AUDIT.find((a) => a.ref === req.ref && a.toStage === toStage && a.notes);
    return entry?.notes;
  };
  const returnedReason =
    req.stage === "support_returned" ? reasonFor("support_returned") : undefined;
  const supportRejectedReason =
    req.stage === "support_rejected" ? reasonFor("support_rejected") : undefined;
  const execRejectedReason =
    req.stage === "executive_rejected" ? reasonFor("executive_rejected") : undefined;
  const bankRejectedReason = req.stage === "bank_rejected" ? reasonFor("bank_rejected") : undefined;
  const bankReturnedReason = req.stage === "bank_returned" ? reasonFor("bank_returned") : undefined;

  function performTransition(to: string, label: string) {
    const t = transitions.find((x) => x.to === to);
    if (t?.requiresComment && !comment.trim()) {
      toast.error("التعليق إلزامي لهذا الإجراء");
      return;
    }
    transitionRequest(
      req!,
      to as RequestStage,
      { id: user!.id, name: user!.name, role: user!.role },
      comment || label,
    );
    requestsCell.set((prev) =>
      prev.map((r) => {
        if (r.id !== req!.id) return r;
        const patch: Partial<typeof r> = { lastUpdatedBy: user!.id };
        if (to === "bank_submitted") patch.submittedBy = user!.id;
        if (to === "bank_internal_review" || to === "bank_approved")
          patch.internalReviewUserId = user!.id;
        if (to === "support_review") {
          patch.supportClaimedBy = user!.id;
          patch.supportClaimedAt = new Date().toISOString();
        }
        if (to === "support_approved" || to === "support_returned" || to === "support_rejected") {
          patch.supportReviewerId = user!.id;
        }
        if (to === "executive_approved" || to === "executive_rejected") {
          patch.executiveDecisionBy = user!.id;
        }
        return { ...r, ...patch };
      }),
    );
    toast.success(`تم: ${label}`);
    setComment("");
    // If the new stage moves the request out of the current user's scope,
    // redirect to the requests list instead of leaving them on an "unauthorized" screen.
    const updated = { ...req!, stage: to as RequestStage };
    if (!canViewRequest(user!, updated)) {
      nav({ to: "/requests" });
    }
  }

  function downloadDoc(doc: { name: string; fileName?: string; dataUrl?: string }) {
    if (!doc.dataUrl) {
      toast.error("الملف غير متاح محلياً للتنزيل من هذا المتصفح.");
      return;
    }

    const link = document.createElement("a");
    link.href = doc.dataUrl;
    link.download = doc.fileName ?? `${doc.name}.pdf`;
    link.click();
  }

  return (
    <div>
      <PageHeader
        title={req.ref}
        subtitle={`${req.importer} · ${req.type}`}
        breadcrumbs={[
          { label: "الرئيسية", to: "/" },
          { label: "الطلبات", to: "/requests" },
          { label: req.ref },
        ]}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/templates/نموذج-طلب-وثيقة-تأكيد.pdf" download>
                <Download className="h-4 w-4 ml-1" /> تنزيل الطلب
              </a>
            </Button>
            {(() => {
              const ds = displayStatusFor(req.stage, user!.role);
              return <Badge className={cn("text-sm py-1.5 px-3", ds.color)}>{ds.label}</Badge>;
            })()}
          </>
        }
      />

      <div className="mb-4 space-y-3">
        {locked && <LockedBanner variant="locked" />}
        {!locked && !editable && (
          <LockedBanner variant="readonly" message="لا تتوفر تعديلات في هذه المرحلة." />
        )}
      </div>

      {req.duplicate && (
        <Card className="p-4 mb-4 border-destructive/30 bg-destructive/5 shadow-card">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-destructive">تنبيه: فاتورة مكررة محتملة</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                رقم الفاتورة <span className="font-mono font-semibold">{req.invoice}</span> ظهر في
                طلبات سابقة.
              </div>
            </div>
          </div>
        </Card>
      )}

      {sodViolation && (
        <Card className="p-4 mb-4 border-warning/30 bg-warning/5 shadow-card">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-warning">فصل المهام</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                لا يمكن لنفس المستخدم تنفيذ خطوتي الإدخال والمراجعة الداخلية لذات الطلب. الرجاء
                استخدام حساب مراجع داخلي مختلف.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* بانر الإعادة — من المراجع الداخلي (draft) أو اللجنة المساندة (support_returned) */}
      {req.stage === "support_returned" && (
        <Card className="p-4 mb-4 border-amber-300 bg-amber-50/70 shadow-card border-r-4 border-r-amber-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-700">
                الطلب مُعاد للتعديل من اللجنة المساندة
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                يمكنك مراجعة الملاحظات وتعديل البيانات والمستندات ثم إعادة إرساله، أو الإبقاء على
                الطلب في وضعه الحالي. راجع سجل التدقيق لمعرفة سبب الإعادة.
              </div>
              {returnedReason && (
                <div className="mt-2 text-sm bg-card border border-amber-200 rounded-md px-3 py-2">
                  <span className="font-semibold text-amber-700">سبب الإعادة: </span>
                  <span>{returnedReason}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* بانر الإعادة من المراجع الداخلي بالبنك */}
      {req.stage === "bank_returned" && (
        <Card className="p-4 mb-4 border-amber-300 bg-amber-50/70 shadow-card border-r-4 border-r-amber-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-amber-700">
                الطلب مُعاد لإعادة الإدخال من المراجع الداخلي
              </div>
              {bankReturnedReason && (
                <div className="mt-2 text-sm bg-card border border-amber-200 rounded-md px-3 py-2">
                  <span className="font-semibold text-amber-700">سبب الإعادة: </span>
                  <span>{bankReturnedReason}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {req.customsStampedFile && (
            <Card className="p-5 shadow-card border-0 bg-gradient-to-br from-success/10 to-accent/5 border border-success/30">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <h3 className="font-semibold text-sm">تأكيد المصارفة الخارجية</h3>
              </div>
              <div className="rounded-lg bg-card/60 p-3 mb-3 border border-success/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 text-success grid place-items-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">تأكيد المصارفة الخارجية</div>
                    <div className="text-[11px] text-muted-foreground">
                      {((req.customsStampedFile.size ?? 0) / 1024).toFixed(1)} KB
                      {req.customsNo && (
                        <span> · رقم البيان: <span className="font-mono font-semibold">{req.customsNo}</span></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {customsDocDataUrl && (
                  <Button asChild variant="default" size="sm" className="flex-1">
                    <a href={customsDocDataUrl} download="تأكيد المصارفة الخارجية.pdf">
                      <Download className="h-4 w-4 ml-1.5" /> تحميل التأكيد
                    </a>
                  </Button>
                )}
                {customsDocDataUrl && (
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <a href={customsDocDataUrl} target="_blank" rel="noreferrer">
                      <Eye className="h-4 w-4 ml-1.5" /> معاينة
                    </a>
                  </Button>
                )}
                {!customsDocDataUrl && (
                  <p className="text-xs text-muted-foreground text-center flex-1 py-2">
                    النسخة المحلية غير متاحة في هذا المتصفح.
                  </p>
                )}
              </div>
            </Card>
          )}

          {(() => {
            const approvedStages = ["customs_released", "completed"];
            const rejectedStages = ["executive_rejected", "support_rejected", "bank_rejected"];
            const isApproved = approvedStages.includes(req.stage);
            const isRejected = rejectedStages.includes(req.stage);

            if (isApproved || isRejected) {
              const Icon = isApproved ? CheckCircle2 : XCircle;
              return (
                <Card
                  className={cn(
                    "p-5 shadow-card border",
                    isApproved
                      ? "bg-gradient-to-br from-success/10 to-success/5 border-success/30"
                      : "bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30",
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">تقدم الطلب في الدورة التنظيمية</h3>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                        isApproved
                          ? "bg-success/20 text-success"
                          : "bg-destructive/20 text-destructive",
                      )}
                    >
                      100% — مكتمل
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-11 w-11 rounded-xl grid place-items-center shrink-0",
                        isApproved
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "font-semibold",
                          isApproved ? "text-success" : "text-destructive",
                        )}
                      >
                        {isApproved
                          ? "الطلب مستوفٍ للشروط"
                          : "الطلب غير مستوفٍ للشروط"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {isApproved
                          ? "اكتملت دورة الطلب باعتماد جميع الأطراف وصدر تأكيد المصارفة الخارجية."
                          : "تم إغلاق الطلب لعدم استيفاء أحد الشروط المطلوبة. لا يمكن متابعة هذا الطلب ضمن مساره."}
                      </div>
                    </div>
                  </div>
                  {isApproved && customsDocDataUrl && (
                    <div className="mt-4 pt-4 border-t border-success/20 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileSignature className="h-3.5 w-3.5" />
                        <span>تأكيد المصارفة الخارجية</span>
                        {req.customsNo && (
                          <span className="font-mono font-semibold text-foreground">
                            · {req.customsNo}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="h-8">
                          <a href={customsDocDataUrl} target="_blank" rel="noreferrer">
                            <Eye className="h-3.5 w-3.5 ml-1.5" /> مشاهدة التأكيد
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8">
                          <a
                            href={customsDocDataUrl}
                            download={
                              req.customsStampedFile?.name ??
                              "external-remittance-confirmation.pdf"
                            }
                          >
                            <Download className="h-3.5 w-3.5 ml-1.5" /> تحميل التأكيد
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            }

            return (
              <Card className="p-5 shadow-card border-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">تقدم الطلب في الدورة التنظيمية</h3>
                  <span className="text-2xl font-bold tabular-nums">
                    {progressForRole(req.stage, user!.role)}%
                  </span>
                </div>
                <Progress value={progressForRole(req.stage, user!.role)} className="h-2 mb-2" />
                <div className="text-xs text-muted-foreground">
                  المرحلة الحالية: {displayStatusFor(req.stage, user!.role).label}
                </div>
              </Card>
            );
          })()}

          {/* Lock notice when another support reviewer has the request */}
          {(req.stage === "bank_approved" || req.stage === "support_review") &&
            user.role === "support_member" &&
            req.supportClaimedBy &&
            req.supportClaimedBy !== user.id && (
              <Card className="p-4 shadow-card border-0 bg-warning/5 border-warning/30">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-warning" />
                  <div className="flex-1 text-sm">
                    الطلب قيد المراجعة من قبل{" "}
                    <span className="font-semibold">
                      {DEMO_USERS.find((u) => u.id === req.supportClaimedBy)?.name ?? "عضو آخر"}
                    </span>{" "}
                    — لا يمكن لعضو آخر اتخاذ إجراء عليه.
                  </div>
                </div>
              </Card>
            )}

          {(req.stage === "executive_voting" || req.stage === "swift_attached") &&
            (user.role === "executive_member" || user.role === "committee_manager") && (
              <VotingPanel req={req} />
            )}

          <Tabs defaultValue="info">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="info">المعلومات</TabsTrigger>
              <TabsTrigger value="docs">الوثائق</TabsTrigger>
              <TabsTrigger value="actors">الأطراف</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <Card className="p-6 shadow-card border-0">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  {([
                    ["اسم التاجر المستورد", req.importer],
                    ["نوع النشاط التجاري", req.activity ?? "—"],
                    ["الرقم الضريبي", req.taxNo ?? "—"],
                    ["السجل التجاري", req.crNo ?? "—"],
                    ["البنك / الجهة", req.bank],
                    ["نوع السلعة", req.type],
                    ["بلد المنشأ", req.originCountry ?? "—"],
                    ["المورد", req.supplier],
                    ["مرجع الفاتورة", req.invoice],
                    ["تاريخ الفاتورة", req.invoiceDate ?? "—"],
                    [
                      "مبلغ الفاتورة",
                      req.invoiceAmount != null
                        ? `${req.invoiceAmount.toLocaleString("en-US")} ${req.currency}`
                        : "—",
                    ],
                    [
                      "مبلغ العملة الأجنبية المطلوبة",
                      `${req.amount.toLocaleString("en-US")} ${req.currency}`,
                    ],
                    ["شروط الدفع", req.paymentTerms ?? "—"],
                    ["تاريخ الشحن", req.shipmentDate ?? "—"],
                    ["ميناء الشحن", req.shipPort ?? "—"],
                    ["ميناء الوصول", req.port],
                    ["طريقة التغطية خارجياً", req.coverageMethod ?? "—"],
                    [
                      "المساهمون (≥25%)",
                      req.shareholders && req.shareholders.length > 0
                        ? req.shareholders.map((s) => `${s.name} (${s.percent}%)`).join("، ")
                        : "—",
                    ],
                    ["مصادر توريدات الريال اليمني", req.yerSources ?? "—"],
                    ["مصادر العملة الأجنبية", req.fxSources ?? "—"],
                    ["تاريخ التقديم", new Date(req.createdAt).toLocaleDateString("ar-EG")],
                    [
                      "مستوى المخاطر",
                      req.risk === "high" ? "عالية" : req.risk === "medium" ? "متوسطة" : "منخفضة",
                    ],
                  ] as [string, string][]).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between items-center gap-3 border-b pb-2.5"
                    >
                      <span className="text-muted-foreground text-start">{k}</span>
                      <span className="font-medium text-end">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="mt-4 space-y-4">
              {(() => {
                const docs: Array<{
                  name: string;
                  fileName: string;
                  mime: string;
                  size: number;
                  dataUrl?: string;
                }> =
                  req.documents && req.documents.length > 0
                    ? (req.documents.some((d) => d.name === "طلب وثيقة تأكيد (مختوم)")
                        ? req.documents
                        : [
                            {
                              name: "طلب وثيقة تأكيد (مختوم)",
                              fileName: "confirmation_request_stamped.pdf",
                              mime: "application/pdf",
                              size: 1_500_000,
                            },
                            ...req.documents,
                          ])
                    : [
                        {
                          name: "طلب وثيقة تأكيد (مختوم)",
                          fileName: "confirmation_request_stamped.pdf",
                          mime: "application/pdf",
                          size: 1_500_000,
                        },
                        {
                          name: "الفاتورة الأولية (Proforma Invoice)",
                          fileName: "proforma_invoice.pdf",
                          mime: "application/pdf",
                          size: 2_400_000,
                        },
                        {
                          name: "السجل التجاري",
                          fileName: "commercial_register.pdf",
                          mime: "application/pdf",
                          size: 1_800_000,
                        },
                        {
                          name: "البطاقة الضريبية",
                          fileName: "tax_card.pdf",
                          mime: "application/pdf",
                          size: 1_200_000,
                        },
                      ];

                if (req.swiftFile) {
                  const swiftDoc = {
                    name: "وثيقة سويفت",
                    fileName: req.swiftFile.name,
                    mime: req.swiftFile.mime ?? "application/pdf",
                    size: req.swiftFile.size,
                    dataUrl: swiftDocDataUrl ?? undefined,
                  };
                  const swiftIndex = docs.findIndex(
                    (doc) => doc.name === "وثيقة سويفت" || doc.fileName === req.swiftFile!.name,
                  );
                  if (swiftIndex >= 0) docs[swiftIndex] = { ...docs[swiftIndex], ...swiftDoc };
                  else docs.push(swiftDoc);
                }

                return (
                  <>
                    <Card className="p-4 shadow-card border-0">
                      <DocumentChecklist stage={req.stage} uploaded={docs.map((d) => d.name)} />
                    </Card>
                    <Card className="p-4 shadow-card border-0 space-y-2">
                      {docs.map((d, i) => (
                        <div
                          key={d.name + i}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive grid place-items-center">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{d.name}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>
                                  {d.fileName ?? `doc_${i + 1}.pdf`} ·{" "}
                                  {((d.size ?? 2_400_000) / 1_048_576).toFixed(1)}MB
                                </span>
                                <Badge variant="secondary" className="gap-1 h-4 text-[10px]">
                                  <ShieldCheck className="h-2.5 w-2.5" /> مفحوص
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setPreviewDoc(d)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => downloadDoc(d)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </Card>
                  </>
                );
              })()}
              <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{previewDoc?.name}</DialogTitle>
                    <DialogDescription>معاينة الوثيقة (نموذج تجريبي)</DialogDescription>
                  </DialogHeader>
                  {previewDoc?.dataUrl ? (
                    previewDoc.mime?.startsWith("image/") ? (
                      <img
                        src={previewDoc.dataUrl}
                        alt={previewDoc.name}
                        className="max-h-[70vh] w-full object-contain rounded-lg border"
                      />
                    ) : (
                      <iframe
                        src={previewDoc.dataUrl}
                        title={previewDoc.name}
                        className="w-full h-[70vh] rounded-lg border bg-white"
                      />
                    )
                  ) : (
                    <div className="border rounded-lg bg-muted/30 aspect-[4/5] grid place-items-center text-center p-6">
                      <div className="space-y-3">
                        <div className="h-16 w-16 mx-auto rounded-lg bg-destructive/10 text-destructive grid place-items-center">
                          <FileText className="h-8 w-8" />
                        </div>
                        <div className="font-medium">{previewDoc?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ملف PDF · معاينة تجريبية
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="actors" className="mt-4">
              <Card className="p-5 shadow-card border-0 space-y-3 text-sm">
                <ActorRow label="أنشأ الطلب" userId={req.createdBy ?? req.intakeUserId} />
                <ActorRow
                  label="آخر من حدّث الطلب"
                  userId={req.lastUpdatedBy ?? req.intakeUserId}
                />
                <ActorRow label="قدّم الطلب للمراجعة" userId={req.submittedBy} />
                <ActorRow label="المراجع الداخلي بالبنك" userId={req.internalReviewUserId} />
                <ActorRow
                  label="مراجع اللجنة المساندة"
                  userId={req.supportReviewerId ?? req.supportClaimedBy}
                />
                {req.swiftFile && (
                  <ActorRow
                    label="موظف السويفت"
                    userId={req.swiftFile.uploadedBy}
                    extra={`رفع ${req.swiftFile.name}`}
                  />
                )}
                <ActorRow
                  label="قرار اللجنة التنفيذية"
                  userId={req.executiveDecisionBy}
                  extra={
                    req.stage === "executive_approved"
                      ? "اعتماد"
                      : req.stage === "executive_rejected"
                        ? "رفض"
                        : req.stage === "executive_voting"
                          ? "قيد التصويت"
                          : undefined
                  }
                />
                {req.customsBy && (
                  <ActorRow
                    label="مُصدِر تأكيد المصارفة الخارجية"
                    userId={req.customsBy}
                    extra={`رقم البيان ${req.customsNo}`}
                  />
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <WorkflowProgress req={req} />

          {(transitions.length > 0 || canSwift || canCustoms) && (
            <Card className="p-5 shadow-card border-0">
              <h3 className="font-semibold mb-4">إجراءات متاحة لك</h3>
              <div className="space-y-2">
                {transitions.map((t) => (
                  <Button
                    key={t.to}
                    variant={t.destructive ? "outline" : "default"}
                    className={cn(
                      "w-full justify-start",
                      t.destructive && "text-destructive hover:text-destructive",
                    )}
                    onClick={() => performTransition(t.to, t.label)}
                  >
                    {t.destructive ? (
                      <XCircle className="h-4 w-4 ml-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 ml-2" />
                    )}
                    {t.label}
                  </Button>
                ))}

                {canSwift && (
                  <Button className="w-full justify-start" onClick={() => setSwiftDialogOpen(true)}>
                    <>
                      <Upload className="h-4 w-4 ml-2" /> إرفاق وثيقة السويفت
                    </>
                  </Button>
                )}

                {canCustoms && (
                  <Button
                    className="w-full justify-start"
                    onClick={() => setCustomsDialogOpen(true)}
                  >
                    <FileSignature className="h-4 w-4 ml-2" /> إصدار تأكيد المصارفة الخارجية
                  </Button>
                )}
              </div>

              {transitions.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  {transitions.some((t) => t.requiresComment) && (
                    <p className="text-xs text-destructive">
                      * التعليق إلزامي في حالة الإعادة للتعديل أو رفض الطلب
                    </p>
                  )}
                  <Textarea
                    rows={2}
                    placeholder={
                      transitions.some((t) => t.requiresComment)
                        ? "اكتب سبب الإعادة أو الرفض..."
                        : "تعليق (اختياري)..."
                    }
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              )}
            </Card>
          )}

          <Card className="p-5 shadow-card border-0">
            <h3 className="font-semibold mb-3 text-sm">معلومات سريعة</h3>
            <div className="space-y-3 text-sm">
              {[
                {
                  icon: User,
                  label: "أنشأ الطلب",
                  value:
                    DEMO_USERS.find((u) => u.id === (req.createdBy ?? req.intakeUserId))?.name ??
                    "—",
                },
                { icon: Building2, label: "البنك / الجهة", value: req.bank },
                { icon: MapPin, label: "الميناء", value: req.port },
                {
                  icon: Calendar,
                  label: "التقديم",
                  value: new Date(req.createdAt).toLocaleDateString("ar-EG"),
                },
                {
                  icon: TrendingUp,
                  label: "المخاطر",
                  value:
                    req.risk === "high" ? "عالية" : req.risk === "medium" ? "متوسطة" : "منخفضة",
                },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center text-muted-foreground">
                    <r.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-muted-foreground">{r.label}</div>
                    <div className="text-sm font-medium truncate">{r.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 shadow-card border-0">
            <Link to="/requests" className="text-sm text-accent hover:underline">
              ← العودة لقائمة الطلبات
            </Link>
          </Card>
        </div>
      </div>
      <Dialog open={swiftDialogOpen} onOpenChange={setSwiftDialogOpen}>
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader className="text-right">
            <DialogTitle>رفع وثيقة السويفت</DialogTitle>
            <DialogDescription>
              ارفع ملف PDF الحقيقي ثم أرسل الطلب للتصويت التنفيذي.
            </DialogDescription>
          </DialogHeader>
          <SwiftUploadForm
            requestId={req.id}
            mode="dialog"
            onSent={() => setSwiftDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={customsDialogOpen} onOpenChange={setCustomsDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader className="text-right">
            <DialogTitle>إصدار تأكيد المصارفة الخارجية</DialogTitle>
            <DialogDescription>
              نزّل وثيقة تأكيد المصارفة، وقّعها واختمها، ثم ارفع النسخة النهائية بصيغة PDF.
            </DialogDescription>
          </DialogHeader>
          <CustomsConfirmForm
            requestId={req.id}
            onIssued={() => setCustomsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActorRow({ label, userId, extra }: { label: string; userId?: string; extra?: string }) {
  const u = userId ? DEMO_USERS.find((x) => x.id === userId) : undefined;
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-[10px] font-bold">
          {u?.avatar ?? "—"}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-sm font-medium">{u?.name ?? "بانتظار التنفيذ"}</div>
          {extra && <div className="text-[11px] text-muted-foreground">{extra}</div>}
        </div>
      </div>
      {u && (
        <Badge variant="secondary" className="text-[10px]">
          {u.org}
        </Badge>
      )}
    </div>
  );
}
