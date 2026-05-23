import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Contact,
  Database,
  Info,
  Laptop,
  LayoutDashboard,
  LineChart,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
  X,
} from "lucide-react";
import { BaseSidebar, type BaseNavItem, type BaseSidebarNavGroup } from "@/components/base";
import { Button } from "@/components/ui/button";
import { hasPermission, Permissions } from "../../lib/auth/permissions";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

interface SidebarProps {
  setMobileOpen: (open: boolean) => void;
  inSheet?: boolean;
}

type AppNavItem = BaseNavItem & {
  permission?: string;
  children?: AppNavItem[];
};

function getInitials(username?: string, role?: string): string {
  const source = String(username || role || "").trim();
  if (!source) return "??";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }
  const compact = source.replace(/[^a-zA-Z0-9]/g, "");
  return compact.substring(0, 2).toUpperCase() || "??";
}

function filterNav(items: AppNavItem[], user: object | null | undefined): BaseNavItem[] {
  return items
    .filter((item) => !item.permission || hasPermission(user ?? {}, item.permission))
    .map((item) => ({
      ...item,
      children: item.children ? filterNav(item.children, user) : undefined,
    }))
    .filter((item) => item.href || (item.children?.length ?? 0) > 0);
}

export default function Sidebar({ setMobileOpen, inSheet = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined" || inSheet) return false;
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const setCollapsedState = (nextCollapsed: boolean) => {
    setCollapsed(nextCollapsed);
    if (!inSheet) localStorage.setItem("sidebarCollapsed", String(nextCollapsed));
  };

  const primaryNav: AppNavItem[] = [
    { href: "/", title: "Dashboard", icon: LayoutDashboard, permission: Permissions.DASHBOARD_VIEW },
    { href: "/sync", title: "Store Sync", icon: RefreshCw, permission: Permissions.SYNC_VIEW },
    { href: "/eod", title: "EOD Monitor", icon: ClipboardCheck, permission: Permissions.EOD_VIEW },
    { href: "/stores", title: "Store Directory", icon: Store, permission: Permissions.STORES_VIEW },
    { href: "/identity", title: "Employee Directory", icon: Contact, permission: Permissions.EMPLOYEES_VIEW },
    { href: "/backups", title: "Backups", icon: Database, permission: Permissions.BACKUPS_VIEW },
    { href: "/system", title: "System", icon: Activity, permission: Permissions.SYSTEM_VIEW },
  ];

  const toolsNav: AppNavItem[] = [
    { href: "/agent-updater", title: "Agent Updater", icon: ShieldCheck, permission: Permissions.AGENT_UPDATE },
    { href: "/office-agents", title: "Office Agents", icon: Laptop, permission: Permissions.AGENT_UPDATE },
    {
      title: "Administration",
      icon: Lock,
      children: [
        { href: "/admin/users", title: "Accounts", icon: Users, permission: Permissions.ACCOUNTS_VIEW },
        { href: "/admin/roles", title: "Roles", icon: Lock, permission: Permissions.ROLES_VIEW },
        { href: "/admin/afterhours", title: "After Hours", icon: Moon, permission: Permissions.AFTERHOURS_VIEW },
      ],
    },
  ];

  const groups: BaseSidebarNavGroup[] = [
    { label: "Operations", items: filterNav(primaryNav, user as object | null | undefined) },
    { label: "Tools", items: filterNav(toolsNav, user as object | null | undefined) },
    { label: "Portfolio", items: [{ href: "/about", title: "Portfolio Context", icon: Info }] },
  ].filter((group) => group.items.length > 0);

  const initials = getInitials(user?.username, user?.role);
  const roleLabel = user?.roleNames?.join(", ") || String(user?.role || "viewer");
  const usernameLabel = String(user?.username || "Admin");

  return (
    <BaseSidebar
      groups={groups}
      collapsed={inSheet ? false : collapsed}
      onCollapsedChange={setCollapsedState}
      onNavigate={() => setMobileOpen(false)}
      className={cn(inSheet && "w-full")}
      brand={
        <div className="flex h-10 items-center justify-between gap-2 px-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LineChart className="size-4" />
            </div>
            <span className="min-w-0 truncate text-[13px] font-bold uppercase tracking-[0.12em] group-data-[state=collapsed]/sidebar-wrapper:hidden">
              Ops Hub
            </span>
          </div>
          {inSheet ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
              <X />
              <span className="sr-only">Close navigation</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsedState(!collapsed)}
              className="hidden md:inline-flex"
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
              <span className="sr-only">{collapsed ? "Expand navigation" : "Collapse navigation"}</span>
            </Button>
          )}
        </div>
      }
      footer={
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setMobileOpen(false);
            navigate("/profile");
          }}
          className={cn("h-auto w-full justify-start p-2", collapsed && !inSheet && "md:justify-center")}
          title={collapsed && !inSheet ? "Profile" : undefined}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </span>
          <span className="ml-2 min-w-0 text-left group-data-[state=collapsed]/sidebar-wrapper:hidden">
            <span className="block truncate text-sm font-semibold text-foreground">{usernameLabel}</span>
            <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {roleLabel}
            </span>
          </span>
        </Button>
      }
    />
  );
}
