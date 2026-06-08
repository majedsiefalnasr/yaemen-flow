import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { rolePermsCell, PERMISSION_LABELS, type Permission } from "@/lib/governance";
import { ROLE_LABELS, useAuth, type Role } from "@/lib/mock";

import { RoleGuard } from "@/components/workflow/RoleGuard";

export const Route = createFileRoute("/admin/roles")({
  component: () => (
    <RoleGuard allow={["platform_admin"]}>
      <RolesAdmin />
    </RoleGuard>
  ),
});

// الأعمدة المعروضة في المصفوفة (٨ أدوار)
const ALL_ROLES: Role[] = [
  "platform_admin",
  "bank_admin",
  "bank_intake",
  "bank_reviewer",
  "bank_swift",
  "support_member",
  "executive_member",
  "committee_manager",
];

const ALL_PERMS: Permission[] = [
  "request.create", "request.review",
  "swift.upload", "voting.cast", "voting.finalize", "customs.issue",
  "reports.view", "audit.view", "merchants.manage", "users.manage",
  "entities.manage", "docrules.manage",
];

function RolesAdmin() {
  const { user } = useAuth();
  const map = rolePermsCell.use();
  if (!user || user.role !== "platform_admin") {
    return <div className="p-8 text-sm text-muted-foreground">هذه الصفحة متاحة لمسؤول اللجنة الوطنية لتنظيم وتمويل الواردات فقط.</div>;
  }
  function isChecked(role: Role, perm: Permission): boolean {
    return (map[role] ?? []).includes(perm);
  }
  return (
    <div>
      <PageHeader
        title="مصفوفة الأدوار والصلاحيات"
        subtitle="عرض صلاحيات كل دور (للقراءة فقط في الوقت الحالي)"
      />
      <Card className="p-0 shadow-card border-0 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-right p-3 sticky right-0 bg-muted/40 min-w-[260px]">الصلاحية</th>
              {ALL_ROLES.map((r) => (
                <th key={r} className="p-3 text-center min-w-[120px]">
                  <div className="text-[11px] font-medium leading-tight">{ROLE_LABELS[r]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_PERMS.map((p) => {
              return (
                <tr key={p} className="border-t hover:bg-muted/20">
                  <td className="p-3 sticky right-0 bg-card font-medium">
                    {PERMISSION_LABELS[p]}
                    <Badge variant="outline" className="mr-2 text-[9px] font-mono">{p}</Badge>
                  </td>
                  {ALL_ROLES.map((r) => (
                    <td key={r} className="p-3 text-center align-top">
                      <Checkbox
                        checked={isChecked(r, p)}
                        disabled
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
