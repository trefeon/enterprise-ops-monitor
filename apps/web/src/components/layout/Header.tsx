import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Menu } from "lucide-react";
import { Button } from "../ui/button";

interface HeaderProps {
  onMobileMenuClick: () => void;
}

export default function Header({ onMobileMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

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
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-card/95 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuClick}
          className="text-muted-foreground transition-colors hover:text-primary md:hidden"
        >
          <Menu className="size-5" />
        </Button>
        <div className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block">
          Enterprise Operations Platform
        </div>
      </div>

      <div className="flex items-center gap-4 md:hidden">
        <Button
          onClick={() => navigate("/profile")}
          className="h-9 w-9 min-h-0 rounded-lg bg-primary p-0 text-xs font-bold text-primary-foreground ring-2 ring-ring/20"
          aria-label="Open profile"
          title="Profile"
        >
          {getInitials(user?.username, user?.role)}
        </Button>
      </div>
    </header>
  );
}
