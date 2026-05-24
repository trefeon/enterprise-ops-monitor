import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BaseAppHeaderProps {
  title: string;
  mobileOpen: boolean;
  onMobileMenuClick: () => void;
  profileInitials: string;
  onProfileClick: () => void;
  className?: string;
}

export function BaseAppHeader({
  title,
  mobileOpen,
  onMobileMenuClick,
  profileInitials,
  onProfileClick,
  className,
}: BaseAppHeaderProps) {
  const mobileMenuLabel = mobileOpen ? 'Close navigation' : 'Open navigation';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMobileMenuClick}
          className="text-muted-foreground hover:text-primary md:hidden"
          aria-controls="app-mobile-navigation"
          aria-expanded={mobileOpen}
          aria-label={mobileMenuLabel}
        >
          <Menu />
          <span className="sr-only">{mobileMenuLabel}</span>
        </Button>
        <div className="hidden min-w-0 truncate font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block">
          {title}
        </div>
      </div>

      <div className="flex items-center gap-3 md:hidden">
        <Button
          type="button"
          onClick={onProfileClick}
          className="size-9 min-h-0 rounded-lg bg-primary p-0 text-xs font-bold text-primary-foreground ring-2 ring-ring/20"
          aria-label="Open profile"
          title="Profile"
        >
          {profileInitials}
        </Button>
      </div>
    </header>
  );
}
