import type { ReactNode } from "react";
import { LineChart } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { BaseSidebarNav, type BaseSidebarNavGroup } from "./base-sidebar-nav";

export interface BaseSidebarProps {
  groups: BaseSidebarNavGroup[];
  footer?: ReactNode;
  brand?: ReactNode;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
  className?: string;
}

export function BaseSidebar({
  groups,
  footer,
  brand,
  collapsed,
  onCollapsedChange,
  onNavigate,
  className,
}: BaseSidebarProps) {
  const open = collapsed === undefined ? undefined : !collapsed;

  return (
    <SidebarProvider
      open={open}
      onOpenChange={onCollapsedChange ? (nextOpen) => onCollapsedChange(!nextOpen) : undefined}
      className="min-h-0 w-auto bg-transparent"
    >
      <Sidebar collapsible="icon" className={cn("relative z-50", className)}>
        <SidebarHeader>
          {brand ?? (
            <div className="flex h-10 items-center gap-3 px-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LineChart className="size-4" />
              </div>
              <span className="min-w-0 truncate text-[13px] font-bold uppercase tracking-[0.12em] group-data-[state=collapsed]/sidebar-wrapper:hidden">
                Ops Hub
              </span>
            </div>
          )}
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <BaseSidebarNav groups={groups} onNavigate={onNavigate} />
        </SidebarContent>
        {footer && (
          <>
            <SidebarSeparator />
            <SidebarFooter>{footer}</SidebarFooter>
          </>
        )}
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
}
