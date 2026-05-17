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
    <div className="dark bg-background text-foreground overflow-hidden h-screen flex font-display">
      <div className="hidden md:flex">
        <Sidebar setMobileOpen={setMobileOpen} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-64 p-0 sm:max-w-64">
          <Sidebar setMobileOpen={setMobileOpen} inSheet />
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0 relative">
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
