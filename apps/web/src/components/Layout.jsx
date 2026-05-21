import React, { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import PageLoader from './PageLoader';
import { Sheet, SheetContent } from './ui/sheet';
import PageTransition from './PageTransition';

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dark flex h-screen overflow-hidden bg-background font-body text-foreground">
      <div className="hidden md:flex">
        <Sidebar setMobileOpen={setMobileOpen} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-60 p-0 data-[side=left]:w-60 data-[side=left]:sm:max-w-60">
          <Sidebar setMobileOpen={setMobileOpen} inSheet />
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header onMobileMenuClick={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <Suspense fallback={<PageLoader />}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Layout;
