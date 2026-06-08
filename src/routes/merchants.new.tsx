import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppShell";
import { MerchantForm } from "@/components/merchants/MerchantForm";
import { RoleGuard } from "@/components/workflow/RoleGuard";

export const Route = createFileRoute("/merchants/new")({
  component: () => (
    <RoleGuard allow={["bank_admin", "bank_intake", "bank_reviewer"]}>
      <NewMerchantPage />
    </RoleGuard>
  ),
});

function NewMerchantPage() {
  return (
    <div>
      <PageHeader
        title="تسجيل تاجر جديد"
        subtitle="أدخل بيانات التاجر، الملاك (25% فأكثر)، والشركات المرتبطة"
        breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "التجار", to: "/merchants" }, { label: "تاجر جديد" }]}
      />
      <MerchantForm mode="create" />
    </div>
  );
}