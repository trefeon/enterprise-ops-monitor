import * as React from "react";
import { ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type BaseNavItem = {
  title: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  disabled?: boolean;
  children?: BaseNavItem[];
};

export interface BaseSidebarNavGroup {
  label?: string;
  items: BaseNavItem[];
}

export interface BaseSidebarNavProps {
  groups: BaseSidebarNavGroup[];
  onNavigate?: () => void;
}

function isItemActive(pathname: string, item: BaseNavItem): boolean {
  if (item.href && (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))) {
    return true;
  }
  return item.children?.some((child) => isItemActive(pathname, child)) ?? false;
}

function NavItem({ item, onNavigate }: { item: BaseNavItem; onNavigate?: () => void }) {
  const location = useLocation();
  const active = isItemActive(location.pathname, item);
  const [open, setOpen] = React.useState(active);
  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);

  React.useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          type="button"
          isActive={active}
          disabled={item.disabled}
          onClick={() => setOpen((value: boolean) => !value)}
        >
          {Icon && <Icon className="size-4 shrink-0" />}
          <span className="min-w-0 truncate group-data-[state=collapsed]/sidebar-wrapper:hidden">{item.title}</span>
          {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
          <ChevronDown
            className={cn(
              "ml-auto size-3.5 transition-transform group-data-[state=collapsed]/sidebar-wrapper:hidden",
              open && "rotate-180"
            )}
          />
        </SidebarMenuButton>
        {open && (
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <SidebarMenuSubItem key={child.href ?? child.title}>
                <SidebarMenuSubButton asChild isActive={isItemActive(location.pathname, child)}>
                  <NavLink
                    to={child.href ?? "#"}
                    onClick={onNavigate}
                    aria-disabled={child.disabled}
                    tabIndex={child.disabled ? -1 : undefined}
                  >
                    <span className="min-w-0 truncate">{child.title}</span>
                    {child.badge && <SidebarMenuBadge>{child.badge}</SidebarMenuBadge>}
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <NavLink
          to={item.href ?? "#"}
          onClick={onNavigate}
          aria-disabled={item.disabled}
          tabIndex={item.disabled ? -1 : undefined}
          title={item.title}
        >
          {Icon && <Icon className="size-4 shrink-0" />}
          <span className="min-w-0 truncate group-data-[state=collapsed]/sidebar-wrapper:hidden">{item.title}</span>
          {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function BaseSidebarNav({ groups, onNavigate }: BaseSidebarNavProps) {
  return (
    <>
      {groups.map((group, index) => (
        <SidebarGroup key={group.label ?? index}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavItem key={item.href ?? item.title} item={item} onNavigate={onNavigate} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
