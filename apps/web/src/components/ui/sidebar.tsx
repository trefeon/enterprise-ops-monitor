import * as React from 'react';
import { PanelLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: boolean) => {
      onOpenChange?.(value);
      if (openProp === undefined) setUncontrolledOpen(value);
    },
    [onOpenChange, openProp]
  );

  const toggleSidebar = React.useCallback(() => setOpen(!open), [open, setOpen]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleSidebar }}>
      <div
        data-slot="sidebar-wrapper"
        data-state={open ? 'expanded' : 'collapsed'}
        className={cn(
          'group/sidebar-wrapper flex h-full min-h-0 w-full bg-background text-foreground [--sidebar-width:15rem] [--sidebar-width-icon:4.75rem]',
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = 'left',
  collapsible = 'offcanvas',
  className,
  ...props
}: React.ComponentProps<'aside'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}) {
  const { open } = useSidebar();

  return (
    <aside
      data-slot="sidebar"
      data-side={side}
      data-collapsible={collapsible}
      data-state={open ? 'expanded' : 'collapsed'}
      className={cn(
        'flex h-full min-h-0 flex-col border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsible === 'icon'
          ? open
            ? 'w-[--sidebar-width]'
            : 'w-[--sidebar-width-icon]'
          : 'w-[--sidebar-width]',
        side === 'left' ? 'border-r' : 'border-l',
        className
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn('relative flex min-w-0 flex-1 flex-col bg-background', className)}
      {...props}
    />
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-slot="sidebar-rail"
      type="button"
      aria-label="Toggle sidebar"
      className={cn('absolute inset-y-0 z-20 hidden w-3 -translate-x-1/2 md:block', className)}
      onClick={toggleSidebar}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn('flex flex-col gap-2 p-3', className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2', className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn('flex flex-col gap-2 p-3', className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('grid gap-1', className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        'px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/60 group-data-[state=collapsed]/sidebar-wrapper:hidden',
        className
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="sidebar-group-content" className={cn('grid gap-1', className)} {...props} />
  );
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="sidebar-separator" className={className} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('grid gap-1', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('relative', className)} {...props} />;
}

function SidebarMenuButton({
  className,
  isActive,
  asChild,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  isActive?: boolean;
  asChild?: boolean;
}) {
  const classes = cn(
    'flex min-h-9 w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none disabled:opacity-50 group-data-[state=collapsed]/sidebar-wrapper:justify-center group-data-[state=collapsed]/sidebar-wrapper:px-2',
    isActive && 'bg-sidebar-primary/12 text-sidebar-primary font-semibold',
    className
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string; 'data-active'?: boolean }>;
    return React.cloneElement(child, {
      'data-active': isActive,
      className: cn(classes, child.props.className),
    });
  }

  return (
    <button data-slot="sidebar-menu-button" data-active={isActive} className={classes} {...props}>
      {children}
    </button>
  );
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="sidebar-menu-badge"
      className={cn(
        'ml-auto rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] text-sidebar-accent-foreground',
        className
      )}
      {...props}
    />
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      className={cn(
        'ml-5 grid gap-1 border-l border-sidebar-border pl-2 group-data-[state=collapsed]/sidebar-wrapper:hidden',
        className
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-sub-item" className={className} {...props} />;
}

function SidebarMenuSubButton({
  className,
  isActive,
  asChild,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  isActive?: boolean;
  asChild?: boolean;
}) {
  const classes = cn(
    'flex min-h-8 w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
    isActive && 'bg-sidebar-primary/10 text-sidebar-primary',
    className
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string; 'data-active'?: boolean }>;
    return React.cloneElement(child, {
      'data-active': isActive,
      className: cn(classes, child.props.className),
    });
  }

  return (
    <button
      data-slot="sidebar-menu-sub-button"
      data-active={isActive}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
