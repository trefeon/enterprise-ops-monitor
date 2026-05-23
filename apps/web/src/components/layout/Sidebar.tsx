import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasPermission, Permissions } from "../../lib/auth/permissions";
import { Button } from "../ui/button";
import {
  LayoutDashboard,
  RefreshCw,
  ClipboardCheck,
  Store,
  Contact,
  Database,
  Activity,
  ShieldCheck,
  Laptop,
  Users,
  Lock,
  Moon,
  Info,
  X,
  LineChart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface SidebarProps {
  setMobileOpen: (open: boolean) => void;
  inSheet?: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

export default function Sidebar({ setMobileOpen, inSheet = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebarCollapsed") === "true";
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  const handleProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileOpen(false);
    navigate("/profile");
  };

  const getInitials = (username?: string, role?: string): string => {
    const source = String(username || role || "").trim();
    if (!source) return "??";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
    const compact = source.replace(/[^a-zA-Z0-9]/g, "");
    return compact.substring(0, 2).toUpperCase() || "??";
  };

  const initials = getInitials(user?.username, user?.role);
  const roleLabel = user?.roleNames?.join(", ") || String(user?.role || "viewer");
  const usernameLabel = String(user?.username || "Admin");

  const allNavItems: NavItem[] = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard, permission: Permissions.DASHBOARD_VIEW },
    { path: "/sync", label: "Store Sync", icon: RefreshCw, permission: Permissions.SYNC_VIEW },
    { path: "/eod", label: "EOD Monitor", icon: ClipboardCheck, permission: Permissions.EOD_VIEW },
    { path: "/stores", label: "Store Directory", icon: Store, permission: Permissions.STORES_VIEW },
    { path: "/identity", label: "Employee Directory", icon: Contact, permission: Permissions.EMPLOYEES_VIEW },
    { path: "/backups", label: "Backups", icon: Database, permission: Permissions.BACKUPS_VIEW },
    { path: "/system", label: "System", icon: Activity, permission: Permissions.SYSTEM_VIEW },
    { path: "/admin/afterhours", label: "After Hours", icon: Moon, permission: Permissions.AFTERHOURS_VIEW },
    { path: "/agent-updater", label: "Agent Updater", icon: ShieldCheck, permission: Permissions.AGENT_UPDATE },
    { path: "/office-agents", label: "Office Agents", icon: Laptop, permission: Permissions.AGENT_UPDATE },
    { path: "/admin/users", label: "Accounts", icon: Users, permission: Permissions.ACCOUNTS_VIEW },
    { path: "/admin/roles", label: "Roles", icon: Lock, permission: Permissions.ROLES_VIEW },
  ];

  const navItems = allNavItems.filter((item) => !item.permission || hasPermission(user, item.permission));
  const supportNavItems: NavItem[] = [{ path: "/about", label: "Portfolio Context", icon: Info }];

  return (
    <aside
      className={cn(
        "relative z-50 flex h-full flex-col border-r border-border bg-card/60 backdrop-blur-md transition-all duration-300 ease-in-out",
        collapsed ? "md:w-20" : "md:w-60",
        inSheet ? "w-full" : "w-60"
      )}
    >
      {/* Logo Area */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-border",
          collapsed ? "md:justify-center md:px-2" : "justify-between px-5"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 font-display font-bold tracking-normal text-foreground whitespace-nowrap",
            collapsed ? "md:hidden" : "overflow-hidden"
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="size-4" />
          </div>
          <span className="text-[13px] uppercase tracking-[0.12em]">Ops Hub</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="hidden text-muted-foreground transition-colors hover:text-primary md:flex"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="md:hidden focus-visible:ring-0 focus-visible:border-transparent focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-transparent"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "group relative flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed ? "md:justify-center" : ""
                )
              }
              title={collapsed ? item.label : ""}
            >
              <Icon className={cn("size-4 shrink-0 transition-colors", collapsed ? "" : "")} />
              <span
                className={cn("transition-opacity duration-300", collapsed ? "md:hidden" : "block")}
              >
                {item.label}
              </span>
              <div className="absolute left-0 h-5 w-0.5 scale-y-0 rounded-r-full bg-primary opacity-0 transition-all duration-150 group-[.active]:scale-y-100 group-[.active]:opacity-100" />
            </NavLink>
          );
        })}

        <div className="mt-6 border-t border-border/50 pt-4">
          <p
            className={cn(
              "mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60",
              collapsed ? "md:hidden" : "block"
            )}
          >
            Portfolio
          </p>
          {supportNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "group relative flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-status-info/10 text-status-info font-semibold"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    collapsed ? "md:justify-center" : ""
                  )
                }
                title={collapsed ? item.label : ""}
              >
                <Icon className="size-4 shrink-0 transition-colors" />
                <span
                  className={cn(
                    "transition-opacity duration-300",
                    collapsed ? "md:hidden" : "block"
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User Profile Summary (Bottom) */}
      <div className="mt-auto border-t border-border/50 p-3">
        <Button
          variant="ghost"
          onClick={handleProfile}
          className={cn(
            "h-auto w-full justify-start rounded-lg border border-transparent p-2 transition-all hover:border-border hover:bg-secondary",
            collapsed ? "md:justify-center" : ""
          )}
          title={collapsed ? "Profile" : ""}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div
            className={cn(
              "ml-3 min-w-0 text-left transition-opacity duration-300",
              collapsed ? "md:hidden" : "block"
            )}
          >
            <div className="truncate text-sm font-semibold leading-tight text-foreground">
              {usernameLabel}
            </div>
            <div className="truncate font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {roleLabel}
            </div>
          </div>
        </Button>
      </div>
    </aside>
  );
}
