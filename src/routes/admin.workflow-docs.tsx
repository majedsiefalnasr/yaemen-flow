import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { docRulesCell, type DocRule } from "@/lib/governance";
import { STAGE_LABELS, STAGE_ORDER, useAuth } from "@/lib/mock";
import { toast } from "sonner";

import { RoleGuard } from "@/components/workflow/RoleGuard";

export const Route = createFileRoute("/admin/workflow-docs")({
  component: () => (
    <RoleGuard allow={["platform_admin"]}>
      <WorkflowDocs />
    </RoleGuard>
  ),
});

function WorkflowDocs() {
  const { user } = useAuth();
  const rules = docRulesCell.use();
  const [draft, setDraft] = useState<Partial<DocRule>>({ stage: "draft", required: true, fileTypes: ["pdf"], minCount: 1 });

  if (!user || user.role !== "platform_admin") {
    return <div className="p-8 text-sm text-muted-foreground">هذه الصفحة متاحة لمسؤول اللجنة الوطنية لتنظيم وتمويل الواردات فقط.</div>;
  }

  function add() {
    if (!draft.name || !draft.stage) return toast.error("الاسم والمرحلة مطلوبان");
    docRulesCell.set((prev) => [
      ...prev,
      {
        id: `d_${Date.now()}`,
        stage: draft.stage as DocRule["stage"],
        name: draft.name!,
        required: !!draft.required,
        fileTypes: draft.fileTypes ?? ["pdf"],
        minCount: draft.minCount ?? 1,
      },
    ]);
    setDraft({ stage: "draft", required: true, fileTypes: ["pdf"], minCount: 1 });
    toast.success("تمت إضافة القاعدة");
  }

  function remove(id: string) {
    docRulesCell.set((prev) => prev.filter((r) => r.id !== id));
  }

  function toggleRequired(id: string) {
    docRulesCell.set((prev) => prev.map((r) => (r.id === id ? { ...r, required: !r.required } : r)));
  }

  return (
    <div>
      <PageHeader
        title="قواعد المستندات لكل مرحلة"
        subtitle="حدّد المستندات المطلوبة والاختيارية وأنواع الملفات لكل مرحلة في دورة حياة الطلب"
      />

      <Card className="p-5 shadow-card border-0 mb-6">
        <div className="font-semibold mb-3">إضافة قاعدة جديدة</div>
        <div className="grid md:grid-cols-5 gap-3">
          <Input placeholder="اسم المستند" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="md:col-span-2" />
          <Select value={draft.stage} onValueChange={(v) => setDraft({ ...draft, stage: v as DocRule["stage"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGE_ORDER.map((s) => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" min={1} value={draft.minCount ?? 1} onChange={(e) => setDraft({ ...draft, minCount: +e.target.value })} placeholder="الحد الأدنى" />
          <div className="flex items-center gap-2 px-2 border rounded-md">
            <Switch checked={!!draft.required} onCheckedChange={(v) => setDraft({ ...draft, required: v })} />
            <span className="text-sm">مطلوب</span>
          </div>
        </div>
        <Button onClick={add} className="mt-3"><Plus className="h-4 w-4 ml-1" /> إضافة</Button>
      </Card>

      <Card className="shadow-card border-0 divide-y">
        {rules.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">لا توجد قواعد.</div>}
        {rules.map((r) => (
          <div key={r.id} className="p-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="font-medium text-sm">{r.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                المرحلة: <Badge variant="outline" className="text-[10px]">{STAGE_LABELS[r.stage]}</Badge>
                {" · "}الأنواع: {r.fileTypes.join(", ")} · الحد الأدنى: {r.minCount}
              </div>
            </div>
            <div className="flex items-center gap-2 px-2">
              <Switch checked={r.required} onCheckedChange={() => toggleRequired(r.id)} />
              <span className="text-xs">{r.required ? "مطلوب" : "اختياري"}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
