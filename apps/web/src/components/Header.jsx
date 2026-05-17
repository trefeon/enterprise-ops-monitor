import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';
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
          className="md:hidden text-muted-foreground hover:text-primary transition-colors"
        >
          <Menu className="size-5" />
        </Button>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hidden sm:block">
          Enterprise Operations Platform
        </div>
      </div>

      {/* Mobile-only account shortcut (desktop uses sidebar account block) */}
      <div className="flex items-center gap-4 md:hidden">
        <Button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xs shadow-md shadow-primary/20 ring-2 ring-ring/30"
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
