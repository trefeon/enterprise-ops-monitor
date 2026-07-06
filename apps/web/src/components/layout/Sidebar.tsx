import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ClipboardCheck,
  Contact,
  Database,
  Info,
  Laptop,
  LayoutDashboard,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
  Wrench,
} from 'lucide-react';
import { BaseSidebar, type BaseNavItem, type BaseSidebarNavGroup } from '@/components/base';
import { hasPermission, Permissions } from '../../lib/auth/permissions';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onClose?: () => void;
  inSheet?: boolean;
}

type AppNavItem = BaseNavItem & {
  permission?: string;
  children?: AppNavItem[];
};

function getInitials(username?: string, role?: string): string {
  const source = String(username || role || '').trim();
  if (!source) return '??';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }
  const compact = source.replace(/[^a-zA-Z0-9]/g, '');
  return compact.substring(0, 2).toUpperCase() || '??';
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

export default function Sidebar({ onClose, inSheet = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined' || inSheet) return false;
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const setCollapsedState = (nextCollapsed: boolean) => {
    setCollapsed(nextCollapsed);
    if (!inSheet) localStorage.setItem('sidebarCollapsed', String(nextCollapsed));
  };

  const primaryNav: AppNavItem[] = [
    {
      href: '/app',
      title: 'Dashboard',
      icon: LayoutDashboard,
      permission: Permissions.DASHBOARD_VIEW,
    },
    { href: '/app/sync', title: 'Store Sync', icon: RefreshCw, permission: Permissions.SYNC_VIEW },
    { href: '/app/eod', title: 'EOD Monitor', icon: ClipboardCheck, permission: Permissions.EOD_VIEW },
    { href: '/app/stores', title: 'Store Directory', icon: Store, permission: Permissions.STORES_VIEW },
    {
      href: '/app/identity',
      title: 'Employee Directory',
      icon: Contact,
      permission: Permissions.EMPLOYEES_VIEW,
    },
    { href: '/app/backups', title: 'Backups', icon: Database, permission: Permissions.BACKUPS_VIEW },
    { href: '/app/system', title: 'System', icon: Activity, permission: Permissions.SYSTEM_VIEW },
    {
      title: 'Tools',
      icon: Wrench,
      children: [
        {
          href: '/app/agent-updater',
          title: 'Agent Updater',
          icon: ShieldCheck,
          permission: Permissions.AGENT_UPDATE,
        },
        {
          href: '/app/office-agents',
          title: 'Office Agents',
          icon: Laptop,
          permission: Permissions.AGENT_UPDATE,
        },
      ],
    },
  ];

  const administrationNav: AppNavItem[] = [
    { href: '/app/admin/users', title: 'Accounts', icon: Users, permission: Permissions.ACCOUNTS_VIEW },
    { href: '/app/admin/roles', title: 'Roles', icon: Lock, permission: Permissions.ROLES_VIEW },
    {
      href: '/app/admin/afterhours',
      title: 'After Hours',
      icon: Moon,
      permission: Permissions.AFTERHOURS_VIEW,
    },
  ];

  const portfolioNav: BaseNavItem[] = [
    { href: '/case-study', title: 'Case Study', icon: Info, tone: 'info' },
  ];

  const groups: BaseSidebarNavGroup[] = [
    { label: 'Operations', items: filterNav(primaryNav, user as object | null | undefined) },
    {
      label: 'Administration',
      items: filterNav(administrationNav, user as object | null | undefined),
    },
    { label: 'Portfolio', items: portfolioNav },
  ].filter((group) => group.items.length > 0);

  const initials = getInitials(user?.username, user?.role);
  const roleLabel = user?.roleNames?.join(', ') || String(user?.role || 'viewer');
  const usernameLabel = String(user?.username || 'Admin');

  return (
    <BaseSidebar
      groups={groups}
      brandLabel="Ops Starter"
      collapsed={inSheet ? false : collapsed}
      onCollapsedChange={inSheet ? undefined : setCollapsedState}
      onClose={inSheet ? onClose : undefined}
      onNavigate={onClose}
      className={inSheet ? 'w-full' : undefined}
      userSummary={{ initials, name: usernameLabel, meta: roleLabel }}
      onUserClick={() => {
        onClose?.();
        navigate('/app/profile');
      }}
    />
  );
}
