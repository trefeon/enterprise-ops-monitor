import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface BaseAppFrameProps {
  desktopSidebar: ReactNode;
  mobileSidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  mobileTitle?: string;
  mobileDescription?: string;
  className?: string;
}

export function BaseAppFrame({
  desktopSidebar,
  mobileSidebar,
  header,
  children,
  mobileOpen,
  onMobileOpenChange,
  mobileTitle = 'Application navigation',
  mobileDescription = 'Primary application navigation',
  className,
}: BaseAppFrameProps) {
  return (
    <div
      className={cn(
        'dark flex h-dvh overflow-hidden bg-background font-body text-foreground',
        className
      )}
    >
      <aside className="hidden min-h-0 shrink-0 md:flex" aria-label="Desktop navigation">
        {desktopSidebar}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          id="app-mobile-navigation"
          side="left"
          showCloseButton={false}
          className="w-60 gap-0 p-0 data-[side=left]:w-60 data-[side=left]:sm:max-w-60"
        >
          <SheetTitle className="sr-only">{mobileTitle}</SheetTitle>
          <SheetDescription className="sr-only">{mobileDescription}</SheetDescription>
          {mobileSidebar}
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {header}
        <main
          id="app-main-content"
          aria-label="Application content"
          className="min-h-0 flex-1 overflow-y-auto scroll-smooth"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
