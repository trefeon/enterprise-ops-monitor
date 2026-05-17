import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { Button } from './ui/button';

const Header = ({ onMobileMenuClick }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getInitials = (username, role) => {
    const source = String(username || role || '').trim();
    if (!source) return '??';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
    const compact = source.replace(/[^a-zA-Z0-9]/g, '');
    return compact.substring(0, 2).toUpperCase() || '??';
  };

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuClick}
          className="md:hidden"
        >
          <span className="material-symbols-outlined text-xl leading-none">menu</span>
        </Button>
        <div className="text-sm text-muted-foreground hidden sm:block">
          Enterprise Operations Monitor
        </div>
      </div>

      {/* Mobile-only account shortcut (desktop uses sidebar account block) */}
      <div className="flex items-center gap-4 md:hidden">
        <Button
          onClick={() => navigate('/profile')}
          size="icon"
          className="rounded-full font-bold text-xs ring-2 ring-ring/30"
          aria-label="Open profile"
          title="Profile"
        >
          {getInitials(user?.username, user?.role)}
        </Button>
      </div>
    </header>
  );
};

export default Header;
