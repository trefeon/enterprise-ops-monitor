import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission, Permissions } from '../lib/auth/permissions';
import { Button } from './ui/button';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Sidebar = ({ setMobileOpen, inSheet = false }) => {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const handleProfile = (e) => {
    e.preventDefault();
    setMobileOpen(false);
    navigate('/profile');
  };

  const getInitials = (username, role) => {
    const source = String(username || role || '').trim();
    if (!source) return '??';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
    const compact = source.replace(/[^a-zA-Z0-9]/g, '');
    return compact.substring(0, 2).toUpperCase() || '??';
  };

  const initials = getInitials(user?.username, user?.role);
  const roleLabel = user?.roleNames?.join(', ') || String(user?.role || 'viewer');
  const usernameLabel = String(user?.username || 'Admin');

  // Navigation items with required permissions
  const allNavItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      permission: Permissions.DASHBOARD_VIEW,
    },
    { path: '/sync', label: 'Store Sync', icon: RefreshCw, permission: Permissions.SYNC_VIEW },
    { path: '/eod', label: 'EOD Monitor', icon: ClipboardCheck, permission: Permissions.EOD_VIEW },
    {
      path: '/stores',
      label: 'Store Directory',
      icon: Store,
      permission: Permissions.STORES_VIEW,
    },
    {
      path: '/identity',
      label: 'Employee Directory',
      icon: Contact,
      permission: Permissions.EMPLOYEES_VIEW,
    },
    { path: '/backups', label: 'Backups', icon: Database, permission: Permissions.BACKUPS_VIEW },
    {
      path: '/system',
      label: 'System',
      icon: Activity,
      permission: Permissions.SYSTEM_VIEW,
    },
    {
      path: '/admin/afterhours',
      label: 'After Hours',
      icon: Moon,
      permission: Permissions.AFTERHOURS_VIEW,
    },
    {
      path: '/agent-updater',
      label: 'Agent Updater',
      icon: ShieldCheck,
      permission: Permissions.AGENT_UPDATE,
    },
    {
      path: '/office-agents',
      label: 'Office Agents',
      icon: Laptop,
      permission: Permissions.AGENT_UPDATE,
    },
    {
      path: '/admin/users',
      label: 'Accounts',
      icon: Users,
      permission: Permissions.ACCOUNTS_VIEW,
    },
    {
      path: '/admin/roles',
      label: 'Roles',
      icon: Lock,
      permission: Permissions.ROLES_VIEW,
    },
  ];

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter((item) => hasPermission(user, item.permission));
  const supportNavItems = [{ path: '/about', label: 'Portfolio Context', icon: Info }];

  return (
    <aside
      className={cn(
        'relative z-50 flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
        collapsed ? 'md:w-20' : 'md:w-64',
        inSheet ? 'w-64' : 'w-64'
      )}
    >
      {/* Logo Area */}
      <div
        className={cn(
          'h-16 flex items-center border-b border-border',
          collapsed ? 'md:justify-center md:px-2' : 'justify-between px-5'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 text-foreground font-black tracking-tight whitespace-nowrap',
            collapsed ? 'md:hidden' : 'overflow-hidden'
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <LineChart className="size-5" />
          </div>
          <span className="text-sm uppercase tracking-wider">Ops Hub</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Desktop Collapse Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="hidden md:flex text-muted-foreground hover:text-primary transition-colors"
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
          </Button>

          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="md:hidden"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 space-y-1.5 px-4 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center gap-4 px-4 py-2 rounded-xl transition-all duration-200 group relative',
                  isActive
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  collapsed ? 'md:justify-center' : ''
                )
              }
              title={collapsed ? item.label : ''}
            >
              <Icon
                className={cn(
                  'size-5 shrink-0 transition-transform group-hover:scale-110',
                  collapsed ? '' : ''
                )}
              />
              <span
                className={cn(
                  'text-sm font-semibold tracking-tight transition-opacity duration-300',
                  collapsed ? 'md:hidden' : 'block'
                )}
              >
                {item.label}
              </span>
              {/* Active Indicator Dot */}
              <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full opacity-0 scale-y-0 transition-all duration-300 group-[.active]:opacity-100 group-[.active]:scale-y-100" />
            </NavLink>
          );
        })}

        <div className="mt-8 border-t border-border/50 pt-6">
          <p
            className={cn(
              'px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4',
              collapsed ? 'md:hidden' : 'block'
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
                    'flex min-h-[44px] items-center gap-4 px-4 py-2 rounded-xl transition-all duration-200 group relative',
                    isActive
                      ? 'bg-status-info/10 text-status-info font-bold'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    collapsed ? 'md:justify-center' : ''
                  )
                }
                title={collapsed ? item.label : ''}
              >
                <Icon className="size-5 shrink-0 transition-transform group-hover:scale-110" />
                <span
                  className={cn(
                    'text-sm font-semibold tracking-tight',
                    collapsed ? 'md:hidden' : 'block'
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
      <div className="p-4 border-t border-border/50 mt-auto">
        <Button
          variant="ghost"
          onClick={handleProfile}
          className={cn(
            'h-auto w-full justify-start p-2 rounded-2xl hover:bg-muted/50 transition-all border border-transparent hover:border-border',
            collapsed ? 'md:justify-center' : ''
          )}
          title={collapsed ? 'Profile' : ''}
        >
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-black text-xs shadow-md shadow-primary/20">
            {initials}
          </div>
          <div
            className={cn(
              'min-w-0 text-left ml-3 transition-opacity duration-300',
              collapsed ? 'md:hidden' : 'block'
            )}
          >
            <div className="text-sm font-bold text-foreground truncate leading-tight">
              {usernameLabel}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest truncate">
              {roleLabel}
            </div>
          </div>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
