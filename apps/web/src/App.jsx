import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from './components/ui/sonner';
import PrivateRoute from './components/PrivateRoute';
import { Permissions } from './lib/auth/permissions';
import PageTransition from './components/PageTransition';

const Login = lazy(() => import('./pages/Login'));
const LiveSync = lazy(() => import('./pages/LiveSync'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const EODMonitor = lazy(() => import('./pages/EODMonitor'));
const StoreManagement = lazy(() => import('./pages/StoreManagement'));
const StoreSync = lazy(() => import('./pages/StoreSync'));
const IdentityCheck = lazy(() => import('./pages/IdentityCheck'));
const Backups = lazy(() => import('./pages/Backups'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));
const Logout = lazy(() => import('./pages/Logout'));
const Profile = lazy(() => import('./pages/Profile'));
const UsersAdmin = lazy(() => import('./pages/UsersAdmin'));
const RolesAdmin = lazy(() => import('./pages/RolesAdmin'));
const AfterHours = lazy(() => import('./pages/AfterHours'));
const AgentUpdater = lazy(() => import('./pages/AgentUpdater'));
const OfficeAgents = lazy(() => import('./pages/office-agents'));
const About = lazy(() => import('./pages/About'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Toaster />
        <BrowserRouter>
            <Suspense
              fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
            >
              <Routes>
                <Route
                  path="/login"
                  element={
                    <PageTransition>
                      <Login />
                    </PageTransition>
                  }
                />
                <Route
                  path="/live"
                  element={
                    <PageTransition>
                      <LiveSync />
                    </PageTransition>
                  }
                />
                <Route
                  path="/live.html"
                  element={
                    <PageTransition>
                      <LiveSync />
                    </PageTransition>
                  }
                />

                <Route element={<PrivateRoute />}>
                  <Route element={<AppShell />}>
                    <Route
                      path="/"
                      element={
                        <PrivateRoute requiredPerm={Permissions.DASHBOARD_VIEW}>
                          <Dashboard />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/eod"
                      element={
                        <PrivateRoute requiredPerm={Permissions.EOD_VIEW}>
                          <EODMonitor />
                        </PrivateRoute>
                      }
                    />
                    <Route path="/eod-area" element={<Navigate to="/eod" />} />
                    <Route
                      path="/stores"
                      element={
                        <PrivateRoute requiredPerm={Permissions.STORES_VIEW}>
                          <StoreManagement />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/sync"
                      element={
                        <PrivateRoute requiredPerm={Permissions.SYNC_VIEW}>
                          <StoreSync />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/identity"
                      element={
                        <PrivateRoute requiredPerm={Permissions.EMPLOYEES_VIEW}>
                          <IdentityCheck />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/backups"
                      element={
                        <PrivateRoute requiredPerm={Permissions.BACKUPS_VIEW}>
                          <Backups />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/system"
                      element={
                        <PrivateRoute requiredPerm={Permissions.SYSTEM_VIEW}>
                          <SystemHealth />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <PrivateRoute requiredPerm={Permissions.ACCOUNTS_VIEW}>
                          <UsersAdmin />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/admin/roles"
                      element={
                        <PrivateRoute requiredPerm={Permissions.ROLES_VIEW}>
                          <RolesAdmin />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/admin/afterhours"
                      element={
                        <PrivateRoute requiredPerm={Permissions.AFTERHOURS_VIEW}>
                          <AfterHours />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/agent-updater"
                      element={
                        <PrivateRoute requiredPerm={Permissions.AGENT_UPDATE}>
                          <AgentUpdater />
                        </PrivateRoute>
                      }
                    />
                    <Route
                      path="/office-agents"
                      element={
                        <PrivateRoute requiredPerm={Permissions.AGENT_UPDATE}>
                          <OfficeAgents />
                        </PrivateRoute>
                      }
                    />
                    <Route path="/about" element={<About />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/logout" element={<Logout />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
