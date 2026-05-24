import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

export type BaseNavItem = {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  badge?: string | number;
  badgeVariant?: BadgeVariant;
  disabled?: boolean;
  children?: BaseNavItem[];
  tone?: 'default' | 'info';
};

export interface BaseSidebarNavGroup {
  label?: string;
  items: BaseNavItem[];
}

export interface BaseSidebarNavProps {
  groups: BaseSidebarNavGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

function isItemActive(pathname: string, item: BaseNavItem): boolean {
  if (
    item.href &&
    (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
  ) {
    return true;
  }
  return item.children?.some((child) => isItemActive(pathname, child)) ?? false;
}

function getToneClass(item: BaseNavItem, active: boolean) {
  if (item.tone === 'info') {
    return active
      ? 'bg-status-info/10 text-status-info'
      : 'text-sidebar-foreground/70 hover:bg-status-info/10 hover:text-status-info';
  }
  return undefined;
}

function SidebarNavIcon({
  icon: Icon,
  active,
  tone,
}: {
  icon?: BaseNavItem['icon'];
  active: boolean;
  tone?: BaseNavItem['tone'];
}) {
  if (!Icon) return null;

  return (
    <Icon
      aria-hidden
      className={cn(
        'size-4 shrink-0 text-sidebar-foreground/55 transition-colors',
        active && 'text-sidebar-primary',
        tone === 'info' && active && 'text-status-info'
      )}
    />
  );
}

function SidebarNavBadge({ item }: { item: BaseNavItem }) {
  if (item.badge === undefined || item.badge === null || item.badge === '') return null;

  return (
    <Badge
      variant={item.badgeVariant ?? 'neutral'}
      className="ml-auto h-4 max-w-14 px-1.5 text-[9px] group-data-[state=collapsed]/sidebar-wrapper:hidden"
    >
      <span className="truncate">{item.badge}</span>
    </Badge>
  );
}

function CollapsedNavTooltip({
  label,
  enabled,
  children,
}: {
  label: string;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="block" />}>{children}</TooltipTrigger>
      <TooltipContent side="right" align="center">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function getNavClickHandler(item: BaseNavItem, onNavigate?: () => void) {
  return (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (item.disabled) {
      event.preventDefault();
      return;
    }
    onNavigate?.();
  };
}

function SidebarNavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: BaseNavItem;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const content = (
    <SidebarMenuButton asChild isActive={active} className={getToneClass(item, active)}>
      <NavLink
        to={item.href ?? '#'}
        onClick={getNavClickHandler(item, onNavigate)}
        aria-current={active ? 'page' : undefined}
        aria-disabled={item.disabled || undefined}
        aria-label={collapsed ? item.title : undefined}
        tabIndex={item.disabled ? -1 : undefined}
        title={collapsed ? item.title : undefined}
      >
        <SidebarNavIcon icon={item.icon} active={active} tone={item.tone} />
        <span className="min-w-0 truncate group-data-[state=collapsed]/sidebar-wrapper:hidden">
          {item.title}
        </span>
        <SidebarNavBadge item={item} />
      </NavLink>
    </SidebarMenuButton>
  );

  return (
    <CollapsedNavTooltip label={item.title} enabled={collapsed}>
      {content}
    </CollapsedNavTooltip>
  );
}

function SidebarNavSubLink({
  item,
  active,
  onNavigate,
}: {
  item: BaseNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={active}>
        <NavLink
          to={item.href ?? '#'}
          onClick={getNavClickHandler(item, onNavigate)}
          aria-current={active ? 'page' : undefined}
          aria-disabled={item.disabled || undefined}
          tabIndex={item.disabled ? -1 : undefined}
          title={item.title}
        >
          <SidebarNavIcon icon={item.icon} active={active} tone={item.tone} />
          <span className="min-w-0 truncate">{item.title}</span>
          <SidebarNavBadge item={item} />
        </NavLink>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function SidebarNavCollapsible({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: BaseNavItem;
  active: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const [open, setOpen] = React.useState(active);
  const visibleOpen = Boolean(open && !collapsed);

  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const trigger = (
    <CollapsibleTrigger
      type="button"
      disabled={item.disabled}
      aria-label={collapsed ? item.title : undefined}
      title={collapsed ? item.title : undefined}
      className={cn(
        'flex min-h-9 w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50 group-data-[state=collapsed]/sidebar-wrapper:justify-center group-data-[state=collapsed]/sidebar-wrapper:px-2',
        active && 'bg-sidebar-primary/12 font-semibold text-sidebar-primary',
        getToneClass(item, active)
      )}
    >
      <SidebarNavIcon icon={item.icon} active={active} tone={item.tone} />
      <span className="min-w-0 truncate group-data-[state=collapsed]/sidebar-wrapper:hidden">
        {item.title}
      </span>
      <SidebarNavBadge item={item} />
      <ChevronDown
        aria-hidden
        className={cn(
          'ml-auto size-3.5 shrink-0 text-sidebar-foreground/45 transition-transform group-data-[state=collapsed]/sidebar-wrapper:hidden',
          visibleOpen && 'rotate-180'
        )}
      />
    </CollapsibleTrigger>
  );

  return (
    <SidebarMenuItem>
      <Collapsible open={visibleOpen} onOpenChange={setOpen} disabled={item.disabled}>
        <CollapsedNavTooltip label={item.title} enabled={collapsed}>
          {trigger}
        </CollapsedNavTooltip>
        <CollapsibleContent className="group-data-[state=collapsed]/sidebar-wrapper:hidden">
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <SidebarNavSubLink
                key={child.href ?? child.title}
                item={child}
                active={isItemActive(location.pathname, child)}
                onNavigate={onNavigate}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function SidebarNavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: BaseNavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const active = isItemActive(location.pathname, item);
  const hasChildren = Boolean(item.children?.length);

  if (hasChildren) {
    return (
      <SidebarNavCollapsible
        item={item}
        active={active}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarNavLink item={item} active={active} collapsed={collapsed} onNavigate={onNavigate} />
    </SidebarMenuItem>
  );
}

export function BaseSidebarNav({ groups, collapsed, onNavigate }: BaseSidebarNavProps) {
  return (
    <nav aria-label="Primary navigation" className="flex flex-col gap-2">
      {groups.map((group, index) => (
        <SidebarGroup key={group.label ?? index}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.href ?? item.title}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  );
}
