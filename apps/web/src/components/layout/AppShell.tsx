import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import PageLoader from '../common/PageLoader';
import PageTransition from '../common/PageTransition';
import { BaseAppFrame } from '@/components/base';

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <BaseAppFrame
      desktopSidebar={<Sidebar />}
      mobileSidebar={<Sidebar inSheet onClose={() => setMobileOpen(false)} />}
      header={
        <Header
          mobileOpen={mobileOpen}
          onMobileMenuClick={() => setMobileOpen((currentOpen) => !currentOpen)}
        />
      }
      mobileOpen={mobileOpen}
      onMobileOpenChange={setMobileOpen}
      mobileTitle="Application navigation"
    >
      <Suspense fallback={<PageLoader />}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </Suspense>
    </BaseAppFrame>
  );
}
