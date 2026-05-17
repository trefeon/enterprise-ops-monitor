import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission, Permissions } from '../lib/auth/permissions';

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
    { path: '/', label: 'Dashboard', icon: 'dashboard', permission: Permissions.DASHBOARD_VIEW },
    { path: '/sync', label: 'Store Sync', icon: 'sync', permission: Permissions.SYNC_VIEW },
    { path: '/eod', label: 'EOD Monitor', icon: 'schedule', permission: Permissions.EOD_VIEW },
    {
      path: '/stores',
      label: 'Store Directory',
      icon: 'store',
      permission: Permissions.STORES_VIEW,
    },
    {
      path: '/identity',
      label: 'Employee Directory',
      icon: 'badge',
      permission: Permissions.EMPLOYEES_VIEW,
    },
    { path: '/backups', label: 'Backups', icon: 'backup', permission: Permissions.BACKUPS_VIEW },
    {
      path: '/system',
      label: 'System',
      icon: 'settings_suggest',
      permission: Permissions.SYSTEM_VIEW,
    },
    {
      path: '/agent-updater',
      label: 'Agent Updater',
      icon: 'browser_updated',
      permission: Permissions.AGENT_UPDATE,
    },
    {
      path: '/office-agents',
      label: 'Office Agents',
      icon: 'computer',
      permission: Permissions.AGENT_UPDATE,
    },
    {
      path: '/admin/users',
      label: 'Accounts',
      icon: 'manage_accounts',
      permission: Permissions.ACCOUNTS_VIEW,
    },
    {
      path: '/admin/roles',
      label: 'Roles',
      icon: 'admin_panel_settings',
      permission: Permissions.ROLES_VIEW,
    },
    {
      path: '/admin/afterhours',
      label: 'After Hours',
      icon: 'nightlight',
      permission: Permissions.AFTERHOURS_VIEW,
    },
  ];

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter((item) => hasPermission(user, item.permission));
  const supportNavItems = [{ path: '/about', label: 'About This Project', icon: 'info' }];

  return (
    <aside
      className={
        inSheet
          ? 'relative z-50 flex h-full w-64 flex-col border-r border-border bg-card'
          : `
              relative z-50 flex h-full flex-col border-r border-border bg-card transition-all duration-300
              ${collapsed ? 'md:w-20' : 'md:w-64'}
              w-64
            `
      }
    >
      {/* Logo Area */}
      <div
        className={`
          h-16 flex items-center border-b border-border
          ${collapsed ? 'md:justify-center md:px-2' : 'justify-between px-4'}
        `}
      >
        <div
          className={`
            flex items-center gap-3 text-foreground font-bold whitespace-nowrap
            ${collapsed ? 'md:hidden' : 'overflow-hidden'}
          `}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <span className="material-symbols-outlined text-xl">monitoring</span>
          </span>
          <span className="truncate text-sm">Enterprise Ops Monitor</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex min-h-[44px] min-w-[44px] rounded-md items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-symbols-outlined text-xl leading-none">menu</span>
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden min-h-[44px] min-w-[44px] rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-2 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => `
                            flex min-h-[44px] items-center gap-4 px-4 py-2 rounded-lg transition-colors group
                            ${
                              isActive
                                ? 'bg-secondary text-secondary-foreground font-medium'
                                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                            }
                            ${collapsed ? 'md:justify-center' : ''}
                        `}
            title={collapsed ? item.label : ''}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className={`${collapsed ? 'md:hidden' : 'block'}`}>{item.label}</span>
          </NavLink>
        ))}

        <div className="mt-4 border-t border-border pt-4">
          {supportNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                              flex min-h-[44px] items-center gap-4 px-4 py-2 rounded-lg transition-colors group
                              ${
                                isActive
                                  ? 'bg-secondary text-secondary-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                              }
                              ${collapsed ? 'md:justify-center' : ''}
                          `}
              title={collapsed ? item.label : ''}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className={`${collapsed ? 'md:hidden' : 'block'}`}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User Profile Summary (Bottom) */}
      <div className="p-4 border-t border-border mt-auto">
        <button
          onClick={handleProfile}
          className={`flex min-h-[44px] items-center gap-3 transition-colors w-full p-2 rounded-lg hover:bg-secondary/50 ${collapsed ? 'md:justify-center' : ''}`}
          title={collapsed ? 'Profile' : ''}
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs ring-2 ring-ring/30">
            {initials}
          </div>
          <div className={`${collapsed ? 'md:hidden' : 'block'} min-w-0 text-left`}>
            <div className="text-sm font-semibold text-foreground truncate">{usernameLabel}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide truncate">
              {roleLabel}
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
