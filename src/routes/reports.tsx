import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Download, Calendar, FileSpreadsheet, FileText as FilePdf, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MONTHLY, CATEGORY_DIST } from "@/lib/mock";
import { requestsCell } from "@/lib/governance";
import { RoleGuard } from "@/components/workflow/RoleGuard";

export const Route = createFileRoute("/reports")({
  component: () => (
    <RoleGuard allow={["platform_admin", "support_member", "executive_member", "bank_admin"]}>
      <Reports />
    </RoleGuard>
  ),
});

const COLORS = ["oklch(0.28 0.09 255)", "oklch(0.65 0.14 195)", "oklch(0.7 0.15 75)", "oklch(0.6 0.18 25)", "oklch(0.55 0.15 290)", "oklch(0.5 0.1 160)"];

function Reports() {
  const REQUESTS = requestsCell.use();
  const total = REQUESTS.length;
  const approved = REQUESTS.filter(r => ["executive_approved", "customs_released", "completed"].includes(r.stage)).length;
  const rejected = REQUESTS.filter(r => ["support_rejected", "executive_rejected"].includes(r.stage)).length;
  const totalValue = REQUESTS.reduce((s, r) => s + r.amount, 0);
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const duplicates = REQUESTS.filter(r => r.duplicate).length;
  const heatRows = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const heatCols = ["08", "10", "12", "14", "16", "18"];

  return (
    <div>
      <PageHeader
        title="التقارير والتحليلات المتقدمة"
        subtitle="مؤشرات الأداء، التحليل الإحصائي، والتقارير القابلة للتصدير"
        breadcrumbs={[{ label: "الرئيسية", to: "/" }, { label: "التقارير" }]}
        actions={
          <>
            <Button variant="outline"><Calendar className="h-4 w-4 ml-1" /> الفترة: 2025</Button>
            <Button variant="outline"><FilePdf className="h-4 w-4 ml-1" /> PDF</Button>
            <Button><FileSpreadsheet className="h-4 w-4 ml-1" /> Excel</Button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-6">
        {[
          { l: "إجمالي الطلبات", v: total.toLocaleString("en-US"), s: `${approved} مُعتمد` },
          { l: "قيمة التمويل", v: `$${(totalValue / 1_000_000).toFixed(1)}M`, s: "+24%" },
          { l: "متوسط زمن المعالجة", v: "3.4 يوم", s: "-12%" },
          { l: "نسبة الاعتماد", v: `${approvalRate}%`, s: `${rejected} مرفوض` },
          { l: "الفواتير المكررة", v: duplicates.toString(), s: "تنبيه" },
        ].map((k) => (
          <Card key={k.l} className="p-4 shadow-card border-0">
            <div className="text-xs text-muted-foreground">{k.l}</div>
            <div className="flex items-end justify-between mt-1">
              <div className="text-xl font-bold">{k.v}</div>
              <Badge variant="secondary" className="text-[10px]">{k.s}</Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 shadow-card border-0 lg:col-span-2">
          <h3 className="font-semibold mb-4">تطور أحجام الطلبات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={MONTHLY}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 240)" />
              <XAxis dataKey="m" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="طلبات" stroke="oklch(0.28 0.09 255)" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="مُعتمد" stroke="oklch(0.62 0.15 155)" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="مرفوض" stroke="oklch(0.6 0.22 25)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-card border-0">
          <h3 className="font-semibold mb-4">حسب الفئة</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={CATEGORY_DIST} dataKey="value" nameKey="name" outerRadius={100}>
                {CATEGORY_DIST.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-card border-0">
          <h3 className="font-semibold mb-4">قيمة التمويل بالعملة</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[
              { c: "USD", v: 845 },
              { c: "EUR", v: 220 },
              { c: "SAR", v: 175 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="c" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="v" fill="oklch(0.65 0.14 195)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 shadow-card border-0 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">خريطة حرارية: كثافة التقديم خلال الأسبوع</h3>
            <Badge variant="secondary">آخر 12 أسبوع</Badge>
          </div>
          <div className="overflow-x-auto">
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${heatCols.length}, minmax(50px, 1fr))` }}>
              <div />
              {heatCols.map((c) => <div key={c} className="text-[10px] text-center text-muted-foreground">{c}:00</div>)}
              {heatRows.map((r, ri) => (
                <Fragment key={r}>
                  <div className="text-[11px] text-muted-foreground py-2 pl-2">{r}</div>
                  {heatCols.map((c, ci) => {
                    const v = (Math.sin(ri * 1.7 + ci * 1.3) + 1) / 2;
                    const op = 0.15 + v * 0.85;
                    return (
                      <div
                        key={c}
                        className="aspect-square rounded grid place-items-center text-[10px] font-semibold text-white"
                        style={{ backgroundColor: `oklch(0.4 0.13 220 / ${op})` }}
                      >
                        {Math.round(v * 80)}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
            أقل
            {[0.15, 0.35, 0.55, 0.75, 0.95].map((o) => (
              <div key={o} className="h-3 w-6 rounded" style={{ background: `oklch(0.4 0.13 220 / ${o})` }} />
            ))}
            أكثر
          </div>
        </Card>
      </div>

      <Card className="p-5 shadow-card border-0 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">تقارير مجدولة</h3>
          <Button variant="outline" size="sm"><Filter className="h-3.5 w-3.5 ml-1" /> فلتر</Button>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="text-xs text-muted-foreground text-right border-b">
            <tr>
              <th className="py-2.5">اسم التقرير</th>
              <th className="py-2.5">الفترة</th>
              <th className="py-2.5">المستلمون</th>
              <th className="py-2.5">آخر تشغيل</th>
              <th className="py-2.5">الحالة</th>
              <th className="py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {[
              ["تقرير أسبوعي للجنة التنفيذية", "أسبوعي · الأحد 08:00", "executive@cby.gov.ye", "27 أكتوبر", "نشط"],
              ["تقرير الفواتير المكررة", "يومي · 22:00", "audit@cby.gov.ye", "اليوم 22:00", "نشط"],
              ["تحليل البنوك التجارية", "شهري · 1 من الشهر", "stats@cby.gov.ye", "1 أكتوبر", "نشط"],
              ["تقرير الإفراج الجمركي", "أسبوعي · الخميس", "customs@customs.gov.ye", "23 أكتوبر", "متوقف"],
            ].map(([n, p, r, t, s]) => (
              <tr key={n} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-3 font-medium">{n}</td>
                <td className="py-3 text-xs text-muted-foreground">{p}</td>
                <td className="py-3 text-xs">{r}</td>
                <td className="py-3 text-xs text-muted-foreground">{t}</td>
                <td className="py-3"><Badge variant={s === "نشط" ? "secondary" : "outline"}>{s}</Badge></td>
                <td className="py-3"><Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
