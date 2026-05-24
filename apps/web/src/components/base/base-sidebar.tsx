import { ChevronLeft, ChevronRight, LineChart, X } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BaseSidebarNav, type BaseSidebarNavGroup } from './base-sidebar-nav';

export interface BaseSidebarUserSummary {
  initials: string;
  name: string;
  meta?: string;
}

export interface BaseSidebarProps {
  groups: BaseSidebarNavGroup[];
  brandLabel?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onClose?: () => void;
  userSummary?: BaseSidebarUserSummary;
  onUserClick?: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function BaseSidebar({
  groups,
  brandLabel = 'Ops Hub',
  collapsed,
  onCollapsedChange,
  onClose,
  userSummary,
  onUserClick,
  onNavigate,
  className,
}: BaseSidebarProps) {
  const open = collapsed === undefined ? undefined : !collapsed;
  const isCollapsed = collapsed === true;
  const hasDesktopCollapse = Boolean(onCollapsedChange);
  const showClose = Boolean(onClose);
  const collapseLabel = isCollapsed ? 'Expand navigation' : 'Collapse navigation';

  return (
    <SidebarProvider
      open={open}
      onOpenChange={onCollapsedChange ? (nextOpen) => onCollapsedChange(!nextOpen) : undefined}
      className="h-full min-h-0 w-auto bg-transparent"
    >
      <TooltipProvider delay={350}>
        <Sidebar collapsible="icon" className={cn('relative z-50', className)}>
          <SidebarHeader className="shrink-0">
            <div className="flex h-10 items-center justify-between gap-2 px-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LineChart className="size-4" />
                </div>
                <span className="min-w-0 truncate text-[13px] font-bold uppercase tracking-[0.12em] group-data-[state=collapsed]/sidebar-wrapper:hidden">
                  {brandLabel}
                </span>
              </div>
              {showClose ? (
                <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
                  <X />
                  <span className="sr-only">Close navigation</span>
                </Button>
              ) : (
                hasDesktopCollapse && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onCollapsedChange?.(!isCollapsed)}
                    className="hidden md:inline-flex"
                    aria-label={collapseLabel}
                    title={collapseLabel}
                  >
                    {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
                    <span className="sr-only">{collapseLabel}</span>
                  </Button>
                )
              )}
            </div>
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarContent className="overflow-hidden p-0">
            <ScrollArea className="h-full min-h-0">
              <div className="p-2">
                <BaseSidebarNav groups={groups} collapsed={isCollapsed} onNavigate={onNavigate} />
              </div>
            </ScrollArea>
          </SidebarContent>
          {userSummary && (
            <>
              <SidebarSeparator />
              <SidebarFooter className="shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onUserClick}
                  className={cn(
                    'h-auto w-full justify-start p-2',
                    isCollapsed && 'md:justify-center'
                  )}
                  aria-label="Open profile"
                  title={isCollapsed ? 'Profile' : undefined}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                    {userSummary.initials}
                  </span>
                  <span className="ml-2 min-w-0 text-left group-data-[state=collapsed]/sidebar-wrapper:hidden">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {userSummary.name}
                    </span>
                    {userSummary.meta && (
                      <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {userSummary.meta}
                      </span>
                    )}
                  </span>
                </Button>
              </SidebarFooter>
            </>
          )}
          <SidebarRail />
        </Sidebar>
      </TooltipProvider>
    </SidebarProvider>
  );
}
