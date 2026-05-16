import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, FilePlus2, Users, ShieldCheck, BarChart3,
  Vote, PackageCheck, Settings, Bell, Search, Sun, Moon, LogOut, Languages,
  Building2, ScrollText, AlertTriangle, ChevronLeft, UserCog, Network,
  FileCheck2, KeyRound, Upload,
} from "lucide-react";
import { useState } from "react";
import { useAuth, auth, ROLE_LABELS, type Role } from "@/lib/mock";
import { notificationsCell, markAllRead } from "@/lib/governance";
import { RoleSwitcher } from "@/components/workflow/RoleSwitcher";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; roles?: Role[] };

const NAV: NavItem[] = [
  { to: "/", label: "اللوحة الرئيسية", icon: LayoutDashboard },
  { to: "/requests", label: "طلبات التمويل", icon: FileText },
  { to: "/requests/new", label: "تقديم طلب جديد", icon: FilePlus2, roles: ["bank_intake", "bank_admin"] },
  { to: "/merchants", label: "إدارة التجار", icon: Building2, roles: ["bank_admin", "platform_admin"] },
  
  { to: "/customs", label: "البيان الجمركي", icon: PackageCheck, roles: ["committee_manager"] },
  { to: "/reports", label: "التقارير والتحليلات", icon: BarChart3, roles: ["platform_admin", "support_member", "executive_member", "committee_manager", "bank_admin"] },
  { to: "/audit", label: "التدقيق والامتثال", icon: ScrollText, roles: ["platform_admin"] },
  { to: "/notifications", label: "الإشعارات", icon: Bell },
  { to: "/admin/entities", label: "إدارة البنوك", icon: Network, roles: ["platform_admin"] },
  { to: "/admin/cby-staff", label: "مستخدمي النظام", icon: UserCog, roles: ["platform_admin"] },
  { to: "/admin/workflow-docs", label: "قواعد المستندات", icon: FileCheck2, roles: ["platform_admin"] },
  { to: "/admin/roles", label: "الأدوار والصلاحيات", icon: KeyRound, roles: ["platform_admin"] },
  { to: "/bank/users", label: "موظفو الجهة", icon: Users, roles: ["bank_admin"] },
  { to: "/settings", label: "إعدادات النظام", icon: Settings, roles: ["platform_admin"] },
];

export function AppShell() {
  const { user, theme } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) {
    return <Outlet />;
  }

  const items = NAV.filter((i) => !i.roles || i.roles.includes(user.role));
  const notifs = notificationsCell.use();
  const unread = notifs.filter((n) => n.unread).length;

  return (
    <div dir="rtl" className="flex min-h-screen w-full bg-background text-foreground">
      <aside
        className={cn(
          "sticky top-0 h-screen shrink-0 bg-sidebar text-sidebar-foreground transition-all duration-300 border-l border-sidebar-border",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            ب م
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-bold">منصة الواردات</div>
              <div className="text-[11px] text-sidebar-foreground/60">البنك المركزي اليمني</div>
            </div>
          )}
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-9rem)]">
          {items.map((it) => {
            const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <it.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{it.label}</span>}
                {!collapsed && active && <ChevronLeft className="h-4 w-4 ms-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 inset-x-0 p-3 border-t border-sidebar-border bg-sidebar">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground py-2"
          >
            {collapsed ? "توسيع ›" : "‹ طي الشريط الجانبي"}
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b bg-card/80 backdrop-blur-md flex items-center gap-3 px-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن طلب، تاجر، أو رقم فاتورة..."
              className="pr-10 bg-muted/50 border-transparent focus-visible:bg-card"
            />
          </div>

          <div className="ms-auto flex items-center gap-3">
            <RoleSwitcher />

          <Button variant="ghost" size="icon" onClick={() => auth.setLang(auth.lang === "ar" ? "en" : "ar")}>
            <Languages className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => auth.toggleTheme()}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="font-semibold">الإشعارات</div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{unread} جديد</Badge>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">قراءة الكل</button>
                  )}
                </div>
              </div>
              <div className="max-h-96 overflow-auto divide-y">
                {notifs.slice(0, 12).map((n) => (
                  <div key={n.id} className="p-4 hover:bg-muted/50 cursor-pointer flex gap-3">
                    <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", n.unread ? "bg-accent" : "bg-muted")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{n.body}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t text-center">
                <Link to="/notifications" className="text-xs text-primary hover:underline">عرض كل الإشعارات</Link>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 pr-2 pl-1 py-1 rounded-full hover:bg-muted/60">
                <div className="text-right leading-tight hidden sm:block">
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {user.avatar}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="font-semibold">{user.name}</div>
                <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                <div className="text-xs font-normal text-muted-foreground mt-0.5">{user.org}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => nav({ to: "/profile" })}>الملف الشخصي</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => nav({ to: "/settings" })}>الإعدادات</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => { auth.logout(); nav({ to: "/login" }); }}
                className="text-destructive"
              >
                <LogOut className="h-4 w-4 ml-2" /> تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>

        <footer className="px-6 py-4 text-xs text-muted-foreground border-t flex items-center justify-between">
          <div>© 2025 البنك المركزي اليمني — جميع الحقوق محفوظة</div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            بيئة عرض توضيحي (Prototype)
          </div>
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({
  title, subtitle, actions, breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; to?: string }[];
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && (
        <nav className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              {b.to ? <Link to={b.to} className="hover:text-foreground">{b.label}</Link> : <span>{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
