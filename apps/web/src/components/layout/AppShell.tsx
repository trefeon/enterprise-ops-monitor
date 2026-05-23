import { useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageLoader from "../common/PageLoader";
import { Sheet, SheetContent, SheetTitle } from "../ui/sheet";
import PageTransition from "../common/PageTransition";

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dark flex h-screen overflow-hidden bg-background font-body text-foreground">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="hidden md:flex">
        <Sidebar setMobileOpen={setMobileOpen} />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-72 p-0 data-[side=left]:w-72 data-[side=left]:sm:max-w-72"
        >
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <Sidebar setMobileOpen={setMobileOpen} inSheet />
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header onMobileMenuClick={() => setMobileOpen(!mobileOpen)} />
        <main id="app-main" className="flex-1 overflow-y-auto scroll-smooth" tabIndex={-1}>
          <Suspense fallback={<PageLoader />}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
