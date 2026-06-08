import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MerchantForm } from "@/components/merchants/MerchantForm";
import { RoleGuard } from "@/components/workflow/RoleGuard";
import { merchantsCell } from "@/lib/governance";

export const Route = createFileRoute("/merchants/$id/edit")({
  component: () => (
    <RoleGuard allow={["bank_admin", "bank_intake", "bank_reviewer"]}>
      <EditMerchantPage />
    </RoleGuard>
  ),
});

function EditMerchantPage() {
  const { id } = useParams({ from: "/merchants/$id/edit" });
  const merchants = merchantsCell.use();
  const merchant = merchants.find((m) => m.id === id);

  if (!merchant) {
    return (
      <Card className="p-8 text-center shadow-card border-0">
        <h2 className="font-bold text-lg">تاجر غير موجود</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/merchants">العودة لقائمة التجار</Link>
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title={`تعديل بيانات: ${merchant.name}`}
        subtitle="تحديث بيانات التاجر، الملاك، والشركات المرتبطة"
        breadcrumbs={[
          { label: "الرئيسية", to: "/" },
          { label: "التجار", to: "/merchants" },
          { label: merchant.name },
        ]}
      />
      <MerchantForm mode="edit" initial={merchant} />
    </div>
  );
}