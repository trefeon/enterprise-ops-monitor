import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Menu } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";

const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/sync": "Store Sync",
  "/eod": "EOD Monitor",
  "/stores": "Store Directory",
  "/identity": "Employee Directory",
  "/backups": "Backups",
  "/system": "System",
  "/admin/afterhours": "After Hours",
  "/agent-updater": "Agent Updater",
  "/office-agents": "Office Agents",
  "/admin/users": "Accounts",
  "/admin/roles": "Roles",
  "/about": "Portfolio Context",
  "/profile": "Profile",
};

interface HeaderProps {
  onMobileMenuClick: () => void;
}

export default function Header({ onMobileMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentLabel = routeLabels[location.pathname] || "Operations";

  const getInitials = (username?: string, role?: string): string => {
    const source = String(username || role || "").trim();
    if (!source) return "??";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
    const compact = source.replace(/[^a-zA-Z0-9]/g, "");
    return compact.substring(0, 2).toUpperCase() || "??";
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-3 px-4 glass-header sm:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuClick}
          className="text-muted-foreground transition-colors hover:text-primary md:hidden"
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
        <div className="min-w-0">
          <div className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block">
            Enterprise Operations Platform
          </div>
          <div className="truncate text-sm font-semibold text-foreground sm:hidden">{currentLabel}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="size-9 rounded-full p-0"
          aria-label="Open profile"
          title="Profile"
        >
          <Avatar size="sm">
            <AvatarFallback>{getInitials(user?.username, user?.role)}</AvatarFallback>
          </Avatar>
        </Button>
      </div>
    </header>
  );
}
